import { hardDaysCard, lightFormActive, type HardDaysCard } from '../lib/hardDays'
import type { DailyEntry } from '../db/types'
import { useStoredSettings } from './useSettings'

/** What the day's page does while a flare is under way: the soft card (once
 * per flare) and the lighter form (as long as the flare lasts). Both are
 * worked out from the stored settings read in one go, so nothing is decided
 * on defaults before they are known. */
export function useHardDays(
  date: string,
  entries: DailyEntry[],
  entriesLoaded: boolean
): { ready: boolean; card: HardDaysCard | null; light: boolean } {
  const settings = useStoredSettings()
  if (!settings || !entriesLoaded) return { ready: false, card: null, light: false }
  return {
    ready: true,
    card: hardDaysCard({ entries, today: date, seen: settings.hardDaysSeen, enabled: settings.hardDaysCardEnabled }),
    light: lightFormActive({ entries, today: date, enabled: settings.lightFormEnabled, fullFormDay: settings.fullFormDay }),
  }
}
