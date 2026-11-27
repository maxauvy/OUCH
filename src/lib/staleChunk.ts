// Some screens are loaded the first time they open (Consultation, Soulager, the
// report, the share sheet…). A page left open across a release still runs the
// old code, but the new service worker and the server only hold the new
// files: asking for an old one fails, and the screen would fall on the crash
// page. Instead the page reloads once, on the new release, which has them.
// A second failure soon after is a real problem: no loop, the error shows.

type Store = Pick<Storage, 'getItem' | 'setItem'>

const KEY = 'ouch:staleChunkReload'
/** A failure within this time of the last reload is not a release change. */
const RETRY_WINDOW_MS = 30_000

/** Whether to reload for a file that did not load; notes the reload when it says yes. */
export function shouldReloadForChunk(now: number, store: Store | undefined): boolean {
  try {
    if (!store) return false
    const last = Number(store.getItem(KEY))
    if (Number.isFinite(last) && last > 0 && now - last < RETRY_WINDOW_MS) return false
    store.setItem(KEY, String(now))
    return true
  } catch {
    // No storage: no way to stop a loop, so no reload.
    return false
  }
}
