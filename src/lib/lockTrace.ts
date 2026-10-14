// A trace of the page's lifecycle events, for finding out what an iPhone does
// when the app goes to the background: which events arrive, in what order and
// how long after one another, compared with when the cover goes up. It only
// records with early access on, keeps the last few entries in localStorage, and
// holds nothing about the journal. Meant to be removed once the question is settled.

export const TRACE_MAX = 40

export interface TraceEntry {
  /** Event name (or "cover" / "uncover" for what the app did). */
  e: string
  /** Epoch ms. */
  t: number
  /** `document.visibilityState` at that moment. */
  v: string
  /** `document.hasFocus()` at that moment. */
  f: boolean
}

/** The list with `entry` added, keeping only the newest `max`. */
export function appendTrace(list: TraceEntry[], entry: TraceEntry, max = TRACE_MAX): TraceEntry[] {
  return [...list, entry].slice(-max)
}

/** One line per entry: the time, the event, the page's state (vis or hid, and nofocus when the window has no focus), and the gap since the line above. */
export function formatTrace(list: TraceEntry[]): string {
  return list
    .map((x, i) => {
      const time = new Date(x.t).toISOString().slice(11, 23)
      const gap = i === 0 ? '' : `  +${x.t - list[i - 1]!.t} ms`
      const state = `${x.v === 'visible' ? 'vis' : 'hid'}${x.f ? '' : ' nofocus'}`
      return `${time}  ${x.e.padEnd(16)} ${state}${gap}`
    })
    .join('\n')
}

const KEY = 'ouch:lock-trace'

export function readTrace(): TraceEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw)
      ? raw.filter((x): x is TraceEntry => typeof x?.e === 'string' && typeof x?.t === 'number' && typeof x?.v === 'string' && typeof x?.f === 'boolean').slice(-TRACE_MAX)
      : []
  } catch {
    return []
  }
}

export function clearTrace(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing kept, nothing to clear.
  }
}

/** Adds an entry, when `enabled` (early access). Synchronous, so it lands before the page is suspended. */
export function recordTrace(e: string, enabled: boolean): void {
  if (!enabled) return
  try {
    const entry: TraceEntry = { e, t: Date.now(), v: document.visibilityState, f: document.hasFocus() }
    localStorage.setItem(KEY, JSON.stringify(appendTrace(readTrace(), entry)))
  } catch {
    // The trace is a help, never a reason to fail.
  }
}

const DOCUMENT_EVENTS = ['visibilitychange', 'freeze', 'resume']
const WINDOW_EVENTS = ['pagehide', 'pageshow', 'blur', 'focus', 'resize', 'orientationchange', 'beforeunload']

/** Listens to the lifecycle events from now on. `enabled` is asked at each event. */
export function installTrace(enabled: () => boolean): void {
  for (const name of DOCUMENT_EVENTS) document.addEventListener(name, () => recordTrace(name, enabled()))
  for (const name of WINDOW_EVENTS) window.addEventListener(name, () => recordTrace(name, enabled()))
}
