import { useMemo } from 'react'
import { todayISO } from '../db'
import { canDetectFlares, detectFlares, type FlareEpisode } from '../lib/flares'
import { useAllEntries } from './useEntries'

/** The flares in the whole journal, as of today, shared by Trends and the
 * Journal. Null until the entries are read. `detectable` is false while
 * there are too few logged days to tell what is usual, so "no flare" is not
 * said when nothing could have been found. */
export function useFlares(): { episodes: FlareEpisode[]; detectable: boolean } | null {
  const entries = useAllEntries()
  return useMemo(
    () => (entries ? { episodes: detectFlares(entries, { asOf: todayISO() }), detectable: canDetectFlares(entries) } : null),
    [entries]
  )
}
