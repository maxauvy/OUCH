import { hardDaysCard, lightFormActive, type HardDaysCard } from '../lib/hardDays'
import { flaresApply } from '../lib/flares'
import type { DailyEntry } from '../db/types'
import { loggedEntries } from '../lib/loggedEntries'
import { ongoingMarked } from '../lib/markedFlares'
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
  // A stretch the person marked as harder is as good as a detected flare for the lighter form: they said it, whatever the illness.
  // The soft card is not shown for it: they know.
  const marked = !!ongoingMarked(settings.markedFlares, date) && settings.lightFormEnabled && settings.fullFormDay !== date
  // Migraine alone has no flare to answer: the soft card and the detected flare's lighter form stay out.
  if (!flaresApply(settings.illnesses)) return { ready: true, card: null, light: marked }
  const logged = loggedEntries(entries)
  return {
    ready: true,
    card: hardDaysCard({ entries: logged, today: date, seen: settings.hardDaysSeen, enabled: settings.hardDaysCardEnabled }),
    light: marked || lightFormActive({ entries: logged, today: date, enabled: settings.lightFormEnabled, fullFormDay: settings.fullFormDay }),
  }
}
