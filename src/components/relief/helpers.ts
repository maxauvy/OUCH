import { useEffect } from 'react'
import { db } from '../../db'
import { upsertEntry } from '../../hooks/useEntries'
import { todayISO } from '../../lib/dates'

/** minutes:seconds, for the clock. */
export const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Adds the action to what helped today: one tap from the person, never on its own. */
export async function addHelped(action: string) {
  const date = todayISO()
  const existing = await db.entries.where('date').equals(date).first()
  const current = existing?.positiveActions ?? []
  if (current.some((a) => a.trim().toLocaleLowerCase() === action.toLocaleLowerCase())) return
  await upsertEntry(date, { positiveActions: [...current, action] })
}

/** Keeps the screen on while the exercise runs, where the phone allows it; gives it back when it stops. */
export function useScreenOn(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    let live = true
    const take = () => navigator.wakeLock.request('screen').then((l) => (live ? (lock = l) : void l.release()), () => {})
    void take()
    // The phone takes the lock back when the page is hidden; ask again when it is seen again.
    const again = () => document.visibilityState === 'visible' && void take()
    document.addEventListener('visibilitychange', again)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', again)
      void lock?.release().catch(() => {})
    }
  }, [on])
}
