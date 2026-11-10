// "Bouger, ce que disent les études": which of the illnesses the person tracks
// have a source on exercise that was read, and said plainly. Descriptive, not a
// prescription. An illness without a clear source says nothing (endometriosis,
// multiple sclerosis: mixed or unconfirmed results; psoriatic arthritis: no source
// read that names it). The sentences live in the translations, each with its source.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { Illness } from '../db/types.ts'

export const ACTIVITY_ILLNESSES = ['fibromyalgie', 'arthrite', 'spondylarthrite', 'lombalgie', 'migraine', 'myofasciale'] as const
export type ActivityIllness = (typeof ACTIVITY_ILLNESSES)[number]
/** More than this would make a wall of text. */
export const MAX_ACTIVITY = 3

/** The tracked illnesses that have a source, in the order the person picked them. */
export function activityIllnesses(illnesses: readonly Illness[]): ActivityIllness[] {
  return illnesses.filter((i): i is ActivityIllness => (ACTIVITY_ILLNESSES as readonly string[]).includes(i)).slice(0, MAX_ACTIVITY)
}
