// What the day's image for relatives says of a flare (early access): « Des jours plus durs depuis dimanche · 5ᵉ jour » while one is
// under way, then « Ça s'apaise depuis mardi » on the first day the image is made once it is over. Same reading as the « Un mot pour toi »
// card (lib/hardDays.ts): the days before the image's day only, so the line is there from the 4th day at the earliest (3 days make a flare)
// and logging the day itself neither adds it nor takes it away. Descriptive only: it says what the person noted, never why.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types.ts'
import { daysBetween, shiftISO } from './dates.ts'
import { detectFlares } from './flares.ts'

/** The sentence for relatives on the image, like the share sheet's word. */
export const FLARE_NOTE_MAX = 80

/** Days after the first calm day during which « Ça s'apaise » can still be the first image made. */
export const EASING_WINDOW = 3

export type SharedFlare =
  /** Under way: its first day, and the image's day counted from it (the first day is day 1). */
  | { kind: 'harder'; start: string; day: number }
  /** Over: the flare's days, and the first day back at the usual level. */
  | { kind: 'easing'; start: string; end: string; since: string }

export function sharedFlare(entries: readonly LoggedEntry[], date: string): SharedFlare | null {
  // No day, no image: and the date maths below would throw on it, which brought the whole app down at launch.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const before = entries.filter((e) => e.date < date).sort((a, b) => a.date.localeCompare(b.date))
  const episodes = detectFlares(before, { asOf: shiftISO(date, -1) })
  const ongoing = episodes.find((e) => e.ongoing)
  if (ongoing) return { kind: 'harder', start: ongoing.start, day: daysBetween(ongoing.start, date) + 1 }

  const last = episodes.at(-1)
  if (!last || last.recoveryDays === null || last.endUnknown) return null
  // The first day back at the usual level: from then on the flare is no longer under way (as for the card on the day's page).
  const since = shiftISO(last.end, last.recoveryDays)
  if (daysBetween(since, date) > EASING_WINDOW) return null
  // Once only: on the day after, or the first one noted since if that day was skipped.
  if (before.some((e) => e.date > since)) return null
  return { kind: 'easing', start: last.start, end: last.end, since }
}

/** What the image shows of it, as part of the key that decides when a new image goes (lib/weatherShareRuntime.ts). */
export function sharedFlareKey(flare: SharedFlare | null, note: string | undefined): string {
  if (!flare) return ''
  return flare.kind === 'harder' ? `harder:${flare.start}:${flare.day}:${note ?? ''}` : `easing:${flare.since}`
}
