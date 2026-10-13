// Automatic backup on this device: what the screen and the app call. It joins
// the pieces that stand apart (the kept key, the provider, the copy logic) to
// the journal and to the settings that remember how the last copy went.

import { db, getSettings, updateSettings } from '../db'
import type { AutoBackupState } from '../db/types'
import { exportBackupWithKey } from './backup'
import { runBackup, type BackupOutcome } from './autoBackup'
import { createBackupKey } from './crypto'
import { clearBackupKey, loadBackupKey, saveBackupKey } from './backupKeyStore'
import { memoryProvider } from './cloud/memoryProvider'
import type { BackupProvider } from './cloud/provider'

/** Until a real provider is linked, only the trial one (in memory, lost at
 * reload) exists, and only in development: the card stays out of the release. */
export const AUTO_BACKUP_AVAILABLE = import.meta.env.DEV

type ProviderId = AutoBackupState['provider']

/** Providers that can be chosen today, in the order they are listed. */
export const AVAILABLE_PROVIDERS: ProviderId[] = import.meta.env.DEV ? ['memory'] : []

let trial: BackupProvider | null = null

/** The place copies go for `id`, or null while that provider is not built. */
export function providerFor(id: ProviderId): BackupProvider | null {
  if (id === 'memory') return (trial ??= memoryProvider())
  return null
}

let running = false

/** Makes, sends and checks a copy now, and remembers how it went. Only one at a time. */
export async function backupNow(): Promise<BackupOutcome | null> {
  if (running) return null
  running = true
  try {
    const state = (await getSettings()).autoBackup
    const provider = state && providerFor(state.provider)
    const backupKey = await loadBackupKey()
    const attemptAt = Date.now()
    if (!state || !provider || !backupKey) {
      // The key is gone (the browser dropped it): copies cannot be made until it is set up again.
      if (state) await updateSettings({ autoBackup: { ...state, lastAttemptAt: attemptAt, lastFailure: 'auth' } })
      return { ok: false, reason: 'auth' }
    }
    const outcome = await runBackup({ provider, backupKey, makeCopy: exportBackupWithKey })
    if (outcome.ok) {
      await updateSettings({
        autoBackup: { provider: state.provider, lastCopy: outcome.copy, lastAttemptAt: attemptAt },
        // A checked copy is a backup: the date on Today and the reminder follow it.
        lastBackupAt: outcome.copy.at,
        backupReminderSnoozedUntil: undefined,
      })
    } else {
      await updateSettings({ autoBackup: { ...state, lastAttemptAt: attemptAt, lastFailure: outcome.reason } })
    }
    return outcome
  } finally {
    running = false
  }
}

/** Links `provider`, keeps the key made from `password`, and sends a first copy. */
export async function setUpAutoBackup(provider: ProviderId, password: string): Promise<BackupOutcome | null> {
  await saveBackupKey(await createBackupKey(password))
  await updateSettings({ autoBackup: { provider } })
  return backupNow()
}

/** Stops sending copies. The ones already there stay where they are. */
export async function stopAutoBackup(): Promise<void> {
  await clearBackupKey()
  await updateSettings({ autoBackup: undefined })
}

/** When the journal last changed (ms), or undefined while it is empty. `updatedAt`
 * has no index (the journal is small: a scan, as the backup reminder does). */
export async function latestChangeAt(): Promise<number | undefined> {
  let latest: number | undefined
  const see = (e: { updatedAt: number }) => {
    if (latest === undefined || e.updatedAt > latest) latest = e.updatedAt
  }
  await db.entries.each(see)
  await db.medications.each(see)
  return latest
}
