// Which indicators suit which illness: the one table the setup, the settings
// and the invitation to existing users read. Pure (no React, no Dexie), so it
// can be tested with plain Node. It only orders and pre-selects: nothing here
// ever changes what a person already follows, and no indicator is ever out of
// reach (what is not recommended or suggested stays under "others").
//
// Indicators that are not built yet are declared here and ignored by the plan
// until their key joins `ALL_FACTORS`: the table can be complete from the start.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import { ALL_FACTORS } from '../db/types.ts'
import type { DailyEntry, Illness } from '../db/types.ts'

/** Every indicator the catalogue knows, built or not yet. */
export type IndicatorKey =
  | 'fatigue'
  | 'sleep'
  | 'stress'
  | 'brainFog'
  | 'mood'
  | 'activity'
  | 'weather'
  | 'medications'
  | 'positiveActions'
  | 'painLocations'
  | 'notes'
  | 'morningStiffness'
  | 'nightWaking'
  | 'dailyInterference'
  | 'unrefreshedWaking'
  | 'swollenJoints'
  | 'periodFlow'
  | 'bowelBladder'
  | 'headacheEpisode'
  | 'legPain'
  | 'symptomTags'
  | 'spasms'
  | 'feverInfection'
  | 'newSymptomMarker'
  | 'sensorySensitivity'

/** Absent from an illness's profile = "others", the free choice. */
export type Tier = 'recommended' | 'suggested'

/** 'measure': a slider or a choice of the day, the kind the cap counts.
 * 'block': a feature around it (zones, medications, notes, weather…).
 * 'detail': an option inside another indicator (night wakings inside sleep). */
export type IndicatorKind = 'measure' | 'block' | 'detail'

export interface IndicatorDef {
  key: IndicatorKey
  kind: IndicatorKind
  /** Only for a detail: the indicator it belongs to. A detail is never offered on its own. */
  parent?: IndicatorKey
  /** 0 first. Decides who stays recommended when the cap is exceeded. */
  priority: 0 | 1 | 2
  /** False until a clinician has read it: shown only with early access. */
  reviewed: boolean
  tiers: Partial<Record<Illness, Tier>>
}

/** Pain plus six measures: what the setup pre-selects at most. Pain is always
 * there and is not an indicator, so six remain for the others. */
export const MAX_RECOMMENDED_MEASURES = 6

const R = 'recommended' as const
const S = 'suggested' as const

// The order is the display order, and breaks ties inside a priority.
export const INDICATORS: readonly IndicatorDef[] = [
  { key: 'fatigue', kind: 'measure', priority: 0, reviewed: true, tiers: { fibromyalgie: R, arthrite: R, spondylarthrite: R, endometriose: R, sep: R, autre: R, lombalgie: S, myofasciale: S } },
  { key: 'sleep', kind: 'measure', priority: 0, reviewed: true, tiers: { fibromyalgie: R, arthrite: R, spondylarthrite: R, endometriose: R, migraine: R, lombalgie: R, sep: R, myofasciale: R, autre: R } },
  { key: 'morningStiffness', kind: 'measure', priority: 0, reviewed: false, tiers: { fibromyalgie: R, arthrite: R, spondylarthrite: R, lombalgie: R } },
  { key: 'dailyInterference', kind: 'measure', priority: 0, reviewed: false, tiers: { arthrite: R, lombalgie: R, sep: R, myofasciale: R, spondylarthrite: S, endometriose: S, fibromyalgie: S } },
  { key: 'brainFog', kind: 'measure', priority: 0, reviewed: true, tiers: { fibromyalgie: R, sep: R, autre: S } },
  { key: 'mood', kind: 'measure', priority: 0, reviewed: true, tiers: { fibromyalgie: R, sep: R, autre: R, arthrite: S, spondylarthrite: S, endometriose: S, migraine: S, lombalgie: S, myofasciale: S } },
  { key: 'stress', kind: 'measure', priority: 0, reviewed: true, tiers: { migraine: R, myofasciale: R, fibromyalgie: S, endometriose: S, autre: S } },
  { key: 'activity', kind: 'measure', priority: 0, reviewed: true, tiers: { lombalgie: R, myofasciale: R, fibromyalgie: S, arthrite: S, spondylarthrite: S, autre: S } },
  { key: 'periodFlow', kind: 'measure', priority: 1, reviewed: false, tiers: { endometriose: R } },
  { key: 'bowelBladder', kind: 'measure', priority: 1, reviewed: false, tiers: { endometriose: R } },
  { key: 'headacheEpisode', kind: 'measure', priority: 1, reviewed: false, tiers: { migraine: R } },
  { key: 'legPain', kind: 'measure', priority: 2, reviewed: false, tiers: { lombalgie: R } },
  { key: 'spasms', kind: 'measure', priority: 2, reviewed: false, tiers: { sep: R } },
  { key: 'sensorySensitivity', kind: 'measure', priority: 2, reviewed: false, tiers: { fibromyalgie: S } },

  { key: 'nightWaking', kind: 'detail', parent: 'sleep', priority: 0, reviewed: false, tiers: { fibromyalgie: R, spondylarthrite: R, lombalgie: R, myofasciale: R } },
  { key: 'unrefreshedWaking', kind: 'detail', parent: 'sleep', priority: 1, reviewed: false, tiers: { fibromyalgie: R } },

  { key: 'painLocations', kind: 'block', priority: 0, reviewed: true, tiers: { fibromyalgie: R, arthrite: R, spondylarthrite: R, endometriose: R, lombalgie: R, myofasciale: R, autre: R } },
  { key: 'medications', kind: 'block', priority: 0, reviewed: true, tiers: { fibromyalgie: R, arthrite: R, spondylarthrite: R, endometriose: R, migraine: R, sep: R, autre: R, lombalgie: S } },
  { key: 'positiveActions', kind: 'block', priority: 0, reviewed: true, tiers: { fibromyalgie: R, spondylarthrite: R, myofasciale: S } },
  { key: 'notes', kind: 'block', priority: 0, reviewed: true, tiers: { fibromyalgie: R, arthrite: R, endometriose: R, migraine: R, myofasciale: R, autre: R } },
  { key: 'weather', kind: 'block', priority: 0, reviewed: true, tiers: { fibromyalgie: S, arthrite: S, migraine: S, sep: S, autre: S } },
  { key: 'swollenJoints', kind: 'block', priority: 1, reviewed: false, tiers: { arthrite: R, spondylarthrite: R } },
  { key: 'symptomTags', kind: 'block', priority: 2, reviewed: false, tiers: { sep: R } },
  { key: 'feverInfection', kind: 'block', priority: 2, reviewed: false, tiers: { arthrite: R, sep: R } },
  { key: 'newSymptomMarker', kind: 'block', priority: 2, reviewed: false, tiers: { sep: S } },
]

export interface IndicatorPlan {
  /** Pre-selected, at most `MAX_RECOMMENDED_MEASURES` measures plus the blocks and details that go with them. */
  recommended: IndicatorKey[]
  /** Visible, not ticked. */
  suggested: IndicatorKey[]
  /** The free choice, folded away. */
  others: IndicatorKey[]
  /** Cycle tracking is a setting of its own, not an indicator: the plan only says whether to start it on. */
  cycle: 'on' | 'off'
}

export interface PlanOptions {
  /** Indicators not yet read by a clinician are left out unless this is true. */
  earlyAccess?: boolean
  /** The keys that can be followed today. Defaults to `ALL_FACTORS`: a declared but unbuilt indicator is ignored. */
  implemented?: readonly string[]
  catalog?: readonly IndicatorDef[]
}

/** The indicators to propose for the illnesses the person follows. An illness
 * suspected is treated as one diagnosed: the same follow-up fits a diagnosis
 * still being looked for. With no illness, or only "autre", the base profile. */
export function planForIllnesses(illnesses: readonly Illness[], options: PlanOptions = {}): IndicatorPlan {
  const { earlyAccess = false, implemented = ALL_FACTORS, catalog = INDICATORS } = options
  const available = catalog.filter((d) => implemented.includes(d.key) && (d.reviewed || earlyAccess))
  const specific = illnesses.filter((i) => i !== 'autre')
  const profile: readonly Illness[] = specific.length ? specific : ['autre']

  const tierOf = (def: IndicatorDef): Tier | undefined => {
    const tiers = profile.map((i) => def.tiers[i])
    return tiers.includes(R) ? R : tiers.includes(S) ? S : undefined
  }

  const recommended = new Set<IndicatorKey>()
  const suggested = new Set<IndicatorKey>()
  for (const def of available) {
    const tier = tierOf(def)
    if (tier === R) recommended.add(def.key)
    else if (tier === S) suggested.add(def.key)
  }

  // Over the cap, the measures of highest priority stay; the rest turn into suggestions.
  const measures = available
    .map((def, index) => ({ def, index }))
    .filter(({ def }) => def.kind === 'measure' && recommended.has(def.key))
    .sort((a, b) => a.def.priority - b.def.priority || a.index - b.index)
  for (const { def } of measures.slice(MAX_RECOMMENDED_MEASURES)) {
    recommended.delete(def.key)
    suggested.add(def.key)
  }

  // A detail follows its parent: with no parent ticked it has nothing to hang on, so it goes to the free choice.
  for (const def of available) {
    if (def.kind !== 'detail' || !def.parent) continue
    if (recommended.has(def.key) && !recommended.has(def.parent)) recommended.delete(def.key)
    if (suggested.has(def.key) && !recommended.has(def.parent) && !suggested.has(def.parent)) suggested.delete(def.key)
  }

  const inOrder = (pick: (def: IndicatorDef) => boolean) => available.filter(pick).map((d) => d.key)
  return {
    recommended: inOrder((d) => recommended.has(d.key)),
    suggested: inOrder((d) => suggested.has(d.key)),
    others: inOrder((d) => !recommended.has(d.key) && !suggested.has(d.key)),
    cycle: illnesses.includes('endometriose') ? 'on' : 'off',
  }
}

/** Whether an indicator is offered to this person: built, and either read by a
 * clinician or switched on by early access. The key of an old backup that is
 * not in the catalogue is not offered. */
export function isOffered(key: string, earlyAccess: boolean): boolean {
  const def = INDICATORS.find((d) => d.key === key)
  return !!def && (def.reviewed || earlyAccess) && (ALL_FACTORS as string[]).includes(key)
}

/** The factors the setup and the settings list, in display order. */
export function offeredFactors(earlyAccess: boolean) {
  return ALL_FACTORS.filter((key) => isOffered(key, earlyAccess))
}

/** The fields of an entry each new indicator writes. */
const ENTRY_FIELDS: Partial<Record<IndicatorKey, readonly (keyof DailyEntry)[]>> = {
  morningStiffness: ['morningStiffness', 'morningStiffnessSeverity'],
  nightWaking: ['nightWakings'],
  dailyInterference: ['dailyInterference'],
}

/** The entry as the screens show it: what an indicator not offered (no early
 * access) wrote is left out. The journal itself keeps it, and so do the backup
 * and the CSV: this is only about what is displayed. */
export function withoutUnoffered(entry: DailyEntry, earlyAccess: boolean): DailyEntry {
  const hidden = Object.entries(ENTRY_FIELDS).filter(([key]) => !isOffered(key, earlyAccess))
  if (!hidden.length) return entry
  const copy: DailyEntry = { ...entry }
  for (const [, fields] of hidden) for (const field of fields ?? []) delete copy[field]
  return copy
}
