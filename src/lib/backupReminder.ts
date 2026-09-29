// When to remind someone to export a backup. The journal only lives in this
// browser, so the reminder is about what would be lost: it starts once there
// is something worth keeping, and it comes back only if the journal changed
// since the last backup, so a person who stopped writing is not nagged.

export const FIRST_BACKUP_MIN_ENTRIES = 7
export const BACKUP_INTERVAL_DAYS = 30
export const SNOOZE_DAYS = 7

const DAY_MS = 86_400_000

export type BackupReminder = { kind: 'never'; entries: number } | { kind: 'stale'; days: number } | null

export function backupReminder(input: {
  now: number
  /** When a backup was last exported from this device */
  lastBackupAt?: number
  /** "Later" was chosen: say nothing until then */
  snoozedUntil?: number
  entryCount: number
  /** Entries added or edited after `lastBackupAt` (all of them if none was made) */
  changedSince: number
}): BackupReminder {
  const { now, lastBackupAt, snoozedUntil, entryCount, changedSince } = input
  if (snoozedUntil !== undefined && now < snoozedUntil) return null

  if (lastBackupAt === undefined) {
    return entryCount >= FIRST_BACKUP_MIN_ENTRIES ? { kind: 'never', entries: entryCount } : null
  }
  const days = Math.floor((now - lastBackupAt) / DAY_MS)
  return days >= BACKUP_INTERVAL_DAYS && changedSince > 0 ? { kind: 'stale', days } : null
}

export const snoozeUntil = (now: number) => now + SNOOZE_DAYS * DAY_MS
