import { db, getSettings, updateSettings } from '../db'
import type { DailyEntry, Settings } from '../db/types'
import { decryptJSON, encryptJSON, type EncryptedPayload } from './crypto'

interface BackupBundle {
  version: 1
  exportedAt: string
  entries: DailyEntry[]
  settings: Settings
}

export async function exportEncryptedBackup(password: string): Promise<Blob> {
  const [entries, settings] = await Promise.all([db.entries.toArray(), getSettings()])
  const bundle: BackupBundle = { version: 1, exportedAt: new Date().toISOString(), entries, settings }
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
  messages: { invalidFile: string; invalidBackup: string }
): Promise<ImportResult> {
  const text = await file.text()
  let payload: EncryptedPayload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(messages.invalidFile)
  }
  const bundle = await decryptJSON<BackupBundle>(payload, password)
  if (!bundle || !Array.isArray(bundle.entries)) {
    throw new Error(messages.invalidBackup)
  }

  let imported = 0
  let skipped = 0

  await db.transaction('rw', db.entries, async () => {
    if (mode === 'replace') {
      await db.entries.clear()
    }
    for (const entry of bundle.entries) {
      if (!entry.date) {
        skipped++
        continue
      }
      const existing = await db.entries.where('date').equals(entry.date).first()
      const { id: _ignoredId, ...rest } = entry
      if (existing) {
        await db.entries.update(existing.id!, rest)
      } else {
        await db.entries.add(rest as DailyEntry)
      }
      imported++
    }
  })

  // Merged (not replaced): a backup exported before a setting existed, or
  // from another device, must not erase settings it simply doesn't know about.
  if (bundle.settings) {
    await updateSettings(bundle.settings)
  }

  return { imported, skipped }
}
