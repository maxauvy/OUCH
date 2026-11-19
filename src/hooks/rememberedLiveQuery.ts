import { useLiveQuery } from 'dexie-react-hooks'

const last = new Map<string, unknown>()

/**
 * `useLiveQuery` that starts from the last value read under the same key
 * during this page load, instead of `undefined`. Coming back to a page (the
 * day's page after Settings or another tab) then draws it at once with what
 * was last read, refreshed right after, rather than an empty page for a few
 * frames, which a phone shows as a white flash. The first read of a key still
 * starts from `undefined`.
 */
export function useRememberedLiveQuery<T>(key: string, querier: () => Promise<T> | T, deps: unknown[]): T | undefined {
  return useLiveQuery(
    async () => {
      const result = await querier()
      last.set(key, result)
      return result
    },
    deps,
    last.get(key) as T | undefined
  )
}
