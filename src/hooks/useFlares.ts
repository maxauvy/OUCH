import { useMemo } from 'react'
import { canDetectFlares, detectFlares, flaresApply, type FlareEpisode } from '../lib/flares'
import { useSettings } from './useSettings'
import { useLoggedEntries } from './useEntries'
import { todayISO } from '../lib/dates'

/** The flares in the whole journal, as of today, shared by Trends and the
 * Journal. Null until the entries are read. `detectable` is false while
 * there are too few logged days to tell what is usual, so "no flare" is not
 * said when nothing could have been found. */
export function useFlares(): { episodes: FlareEpisode[]; detectable: boolean } | null {
  const entries = useLoggedEntries()
  const { illnesses } = useSettings()
  const applies = flaresApply(illnesses)
  return useMemo(
    () => (entries ? { episodes: applies ? detectFlares(entries, { asOf: todayISO() }) : [], detectable: applies && canDetectFlares(entries) } : null),
    [entries, applies]
  )
}
