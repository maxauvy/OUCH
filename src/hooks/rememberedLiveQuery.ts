import { useCallback, useState, useSyncExternalStore } from 'react'
import { liveQuery, type Subscription } from 'dexie'

/** What is known of one query: its last result (kept for the whole page load), or the error it ended on. */
type State = { has: boolean; value: unknown; error: unknown }

type Shared = {
  state: State
  querier: () => unknown
  listeners: Set<() => void>
  subscription: Subscription | null
}

const NOTHING: State = { has: false, value: undefined, error: null }
const shared = new Map<string, Shared>()

function sharedOf(key: string, querier: () => unknown): Shared {
  let s = shared.get(key)
  if (!s) {
    s = { state: NOTHING, querier, listeners: new Set(), subscription: null }
    shared.set(key, s)
  }
  return s
}

function publish(s: Shared, state: State) {
  s.state = state
  for (const listener of [...s.listeners]) listener()
}

/** One Dexie live query per key, whoever asks: started by the first listener, stopped with the last one, its result kept. */
function subscribe(s: Shared, listener: () => void): () => void {
  s.listeners.add(listener)
  if (!s.subscription) {
    s.subscription = liveQuery(s.querier).subscribe({
      next: (value) => {
        if (s.state.error === null && s.state.has && s.state.value === value) return
        publish(s, { has: true, value, error: null })
      },
      error: (error) => {
        if (s.state.error !== error) publish(s, { ...s.state, error })
      },
    })
  }
  return () => {
    s.listeners.delete(listener)
    if (s.listeners.size === 0 && s.subscription) {
      s.subscription.unsubscribe()
      s.subscription = null
      // A query that failed is asked again from scratch next time, as a fresh useLiveQuery would.
      if (s.state.error !== null) s.state = { ...s.state, error: null }
    }
  }
}

/**
 * A Dexie live query shared by every component that asks with the same key:
 * the day's page mounts a dozen readers of the whole journal, and each save
 * then read and copied the table once per reader, and each copy, being a new
 * array, made every memo below it run again. Now one query runs per key and
 * they all get the same result at the same moment.
 *
 * It also starts from the last result read under the key during this page
 * load, instead of `undefined`: coming back to a page (the day's page after
 * Settings or another tab) then draws it at once with what was last read,
 * refreshed right after, rather than an empty page for a few frames, which a
 * phone shows as a white flash. The first read of a key still starts from
 * `undefined`; when the key changes (another day), the previous result stays
 * until the new one is read, as with `useLiveQuery`.
 *
 * A key must always stand for the same query: put in it whatever the query
 * depends on (`entry:${date}`). An error is thrown during render, for the
 * error boundary, as `useLiveQuery` does.
 */
export function useRememberedLiveQuery<T>(key: string, querier: () => Promise<T> | T): T | undefined {
  const s = sharedOf(key, querier)
  const subscribeToKey = useCallback((listener: () => void) => subscribe(s, listener), [s])
  const state = useSyncExternalStore(subscribeToKey, () => s.state)
  // The key whose result is on screen: while a new key has nothing yet, its result stays.
  const [shownKey, setShownKey] = useState(key)
  if (state.error !== null) throw state.error
  if (state.has) {
    if (shownKey !== key) setShownKey(key)
    return state.value as T
  }
  return (shownKey !== key ? shared.get(shownKey)?.state.value : undefined) as T | undefined
}
