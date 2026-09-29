import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateSettings } from '../db'
import { backupReminder, snoozeUntil, type BackupReminder } from '../lib/backupReminder'
import { useSettings } from './useSettings'

/** The reminder to show now, if any, and a way to put it off for a week. */
export function useBackupReminder(): { reminder: BackupReminder; snooze: () => void } {
  const { lastBackupAt, backupReminderSnoozedUntil } = useSettings()

  // Worked out in the query, not in the render: it reads the clock, and it
  // only needs to be up to date when the journal or the settings change.
  const reminder =
    useLiveQuery(async () => {
      const entryCount = await db.entries.count()
      const changedSince =
        lastBackupAt === undefined ? entryCount : await db.entries.filter((e) => e.updatedAt > lastBackupAt).count()
      return backupReminder({
        now: Date.now(),
        lastBackupAt,
        snoozedUntil: backupReminderSnoozedUntil,
        entryCount,
        changedSince,
      })
    }, [lastBackupAt, backupReminderSnoozedUntil]) ?? null

  return { reminder, snooze: () => void updateSettings({ backupReminderSnoozedUntil: snoozeUntil(Date.now()) }) }
}
