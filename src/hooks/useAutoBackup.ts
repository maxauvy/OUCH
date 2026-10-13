import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSettings } from './useSettings'
import { isBackupDue, MIN_GAP_MS } from '../lib/autoBackup'
import { backupNow, latestChangeAt } from '../lib/autoBackupRuntime'

/** Quiet time after a change before a copy goes: a day's entry is often a few
 * edits in a row, and one copy after them is enough. */
const SETTLE_MS = 30_000

/**
 * Sends a copy when one is due: after the journal changed, once the changes
 * have settled and not more than every 15 minutes, and when the app comes
 * back to the foreground. It only runs while the app is open (a web app has
 * nothing to run in the background). Does nothing until automatic backup is set up.
 */
export function useAutoBackup(): void {
  const { autoBackup } = useSettings()
  // Re-read whenever an entry or a medication changes.
  const changeAt = useLiveQuery(() => latestChangeAt(), [])
  const lastCopyAt = autoBackup?.lastCopy?.at
  const lastAttemptAt = autoBackup?.lastAttemptAt
  const linked = autoBackup !== undefined

  useEffect(() => {
    if (!linked) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(timer)
      const now = Date.now()
      if (!isBackupDue({ now, lastCopyAt, latestChangeAt: changeAt })) return
      // Something changed since the last good copy: send one once the changes
      // have settled, and not before the gap since the last try has passed.
      const gap = lastAttemptAt === undefined ? 0 : Math.max(0, MIN_GAP_MS - (now - lastAttemptAt))
      timer = setTimeout(() => void backupNow(), Math.max(SETTLE_MS, gap))
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') schedule()
    }
    schedule()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [linked, changeAt, lastCopyAt, lastAttemptAt])
}
