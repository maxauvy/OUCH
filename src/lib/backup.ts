import { db, getSettings, updateSettings, upgradeLegacySettings } from '../db'
import type { DailyEntry, LegacyDailyEntry, LegacySettings, Medication } from '../db/types'
import { decryptJSON, encryptJSON, isEncryptedPayload } from './crypto'
import { sanitizeBackup } from './backupSanitize'
import { createLegacyConverter, sameName } from './medications'

// v1: entries carry medication names as free text (LegacyDailyEntry).
// v2: adds the medication registry; entries carry intakes pointing at it.
interface BackupBundle {
  version: 1 | 2
  exportedAt: string
  entries: LegacyDailyEntry[]
  medications?: Medication[]
  /** Settings exported before app schema v4 hold a single `childIllness`. */
  settings?: LegacySettings
}

export async function exportEncryptedBackup(password: string): Promise<Blob> {
  const [entries, medications, settings] = await Promise.all([
    db.entries.toArray(),
    db.medications.toArray(),
    getSettings(),
  ])
  const bundle: BackupBundle = { version: 2, exportedAt: new Date().toISOString(), entries, medications, settings }
  const payload = await encryptJSON(bundle, password)
  return new Blob([JSON.stringify(payload)], { type: 'application/json' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export type ImportMode = 'merge' | 'replace'

/** A real backup is a few hundred KB; this only stops a huge file from being
 * read into memory. */
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024

export interface ImportResult {
  imported: number
  skipped: number
}

/**
 * merge: entries are upserted by date (imported data wins on conflict — this
 *   is meant for restoring onto a fresh device or reconciling two devices).
 * replace: existing entries are wiped first.
 */
export async function importEncryptedBackup(
  file: File,
  password: string,
  mode: ImportMode,
  messages: { invalidFile: string; invalidBackup: string; fileTooLarge: string }
): Promise<ImportResult> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error(messages.fileTooLarge)
  let payload: unknown
  try {
    payload = JSON.parse(await file.text())
  } catch {
    throw new Error(messages.invalidFile)
  }
  if (!isEncryptedPayload(payload)) throw new Error(messages.invalidFile)
  // Decrypted content is not trusted either: it is rebuilt field by field.
  const bundle = sanitizeBackup(await decryptJSON<unknown>(payload, password))
  if (!bundle) throw new Error(messages.invalidBackup)

  let imported = 0
  let skipped = bundle.skipped

  await db.transaction('rw', db.entries, db.medications, async () => {
    if (mode === 'replace') {
      await db.entries.clear()
      await db.medications.clear()
    }

    // Medications first, so intakes can be pointed at the right ones. The
    // same id wins as imported (like entries); a same-named medication made
    // separately on this device keeps its id, and imported intakes are
    // remapped to it.
    const idMap = new Map<string, string>()
    const local = await db.medications.toArray()
    for (const med of bundle.medications) {
      const sameId = local.find((m) => m.id === med.id)
      const namesake = sameId ? undefined : local.find((m) => sameName(m.name, med.name))
      if (namesake) {
        idMap.set(med.id, namesake.id)
        // A description beats none: adopt it, under the local id.
        if (namesake.regimen === 'unspecified' && med.regimen !== 'unspecified') {
          const adopted = { ...med, id: namesake.id }
          await db.medications.put(adopted)
          local[local.indexOf(namesake)] = adopted
        }
      } else {
        await db.medications.put(med)
        if (!sameId) local.push(med)
      }
    }
    const legacy = createLegacyConverter(local)

    for (const entry of [...bundle.entries].sort((a, b) => a.date.localeCompare(b.date))) {
      const existing = await db.entries.where('date').equals(entry.date).first()
      const { medications: legacyNames, ...rest } = entry
      if (legacyNames) rest.intakes = legacy.intakesFor(legacyNames, entry.date)
      else if (rest.intakes) rest.intakes = rest.intakes.map((i) => ({ ...i, medicationId: idMap.get(i.medicationId) ?? i.medicationId }))
      if (existing) {
        await db.entries.update(existing.id!, rest)
      } else {
        await db.entries.add(rest as DailyEntry)
      }
      imported++
    }
    await db.medications.bulkAdd(legacy.created)
  })

  // Merged (not replaced): a backup exported before a setting existed, or
  // from another device, must not erase settings it simply doesn't know about.
  if (bundle.settings) {
    const settings = { ...bundle.settings }
    upgradeLegacySettings(settings)
    await updateSettings(settings)
  }

  return { imported, skipped }
}
