// What the indicators of the cycle, the joints, the waking and the headaches look like over a period,
// described: days noted, days with a yes, the most frequent answer. No score, no threshold, no
// comparison with a norm. A day left blank is not a day with "no": every share is over the days noted.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import { HEADACHE_DURATIONS, LEG_PAIN_LEVELS, PERIOD_FLOWS, REFRESHED_LEVELS, SYMPTOM_TAGS } from '../db/types.ts'
import type { DailyEntry, HeadacheDuration, JointKey, LegPain, PeriodFlow, Refreshed, SymptomTag } from '../db/types.ts'

const countBy = <T extends string>(all: readonly T[], values: readonly T[]) => Object.fromEntries(all.map((k) => [k, values.filter((v) => v === k).length])) as Record<T, number>

export interface RefreshedSummary {
  noted: number
  counts: Record<Refreshed, number>
}

export function summarizeRefreshed(entries: readonly DailyEntry[]): RefreshedSummary {
  const values = entries.flatMap((e) => (e.wakingRefreshed ? [e.wakingRefreshed] : []))
  return { noted: values.length, counts: countBy(REFRESHED_LEVELS, values) }
}

export interface JointsSummary {
  /** Days with an answer, yes or no. */
  noted: number
  yesDays: number
  /** The joints named most often, at most three, ties kept in list order. */
  top: { joint: JointKey; days: number }[]
}

export function summarizeJoints(entries: readonly DailyEntry[]): JointsSummary {
  const answered = entries.flatMap((e) => (e.jointsFelt ? [e.jointsFelt] : []))
  const tally = new Map<JointKey, number>()
  for (const a of answered) for (const j of a.joints ?? []) tally.set(j, (tally.get(j) ?? 0) + 1)
  const top = [...tally].map(([joint, days]) => ({ joint, days })).sort((a, b) => b.days - a.days).slice(0, 3)
  return { noted: answered.length, yesDays: answered.filter((a) => a.yes).length, top }
}

export interface CycleSummary {
  flowNoted: number
  flow: Record<PeriodFlow, number>
  offCycleNoted: number
  offCycleDays: number
  bowelNoted: number
  bowelDays: number
  urinaryNoted: number
  urinaryDays: number
}

export function summarizeCycleSymptoms(entries: readonly DailyEntry[]): CycleSummary {
  const flows = entries.flatMap((e) => (e.periodFlow ? [e.periodFlow] : []))
  const answers = (pick: (e: DailyEntry) => boolean | undefined) => {
    const values = entries.flatMap((e) => (pick(e) === undefined ? [] : [pick(e)!]))
    return { noted: values.length, yes: values.filter(Boolean).length }
  }
  const off = answers((e) => e.offCycleBleeding)
  const bowel = answers((e) => e.bowelPain)
  const urinary = answers((e) => e.urinary)
  return {
    flowNoted: flows.length,
    flow: countBy(PERIOD_FLOWS, flows),
    offCycleNoted: off.noted,
    offCycleDays: off.yes,
    bowelNoted: bowel.noted,
    bowelDays: bowel.yes,
    urinaryNoted: urinary.noted,
    urinaryDays: urinary.yes,
  }
}

export interface HeadacheSummary {
  /** Days with an answer, yes or no. */
  noted: number
  headacheDays: number
  /** Days with a headache and a medication for the attack. */
  acuteMedDays: number
  durations: Record<HeadacheDuration, number>
  auraDays: number
  nauseaDays: number
  sensitivityDays: number
  /** The triggers named most often, at most three. */
  triggers: { trigger: string; days: number }[]
}

export function summarizeHeadaches(entries: readonly DailyEntry[]): HeadacheSummary {
  const answered = entries.flatMap((e) => (e.headache ? [e.headache] : []))
  const attacks = answered.filter((h) => h.today)
  const tally = new Map<string, number>()
  for (const h of attacks) for (const raw of new Set(h.triggers ?? [])) tally.set(raw.trim().toLocaleLowerCase(), (tally.get(raw.trim().toLocaleLowerCase()) ?? 0) + 1)
  return {
    noted: answered.length,
    headacheDays: attacks.length,
    acuteMedDays: attacks.filter((h) => h.acuteMed).length,
    durations: countBy(HEADACHE_DURATIONS, attacks.flatMap((h) => (h.duration ? [h.duration] : []))),
    auraDays: attacks.filter((h) => h.aura).length,
    nauseaDays: attacks.filter((h) => h.nausea).length,
    sensitivityDays: attacks.filter((h) => h.sensitivity).length,
    triggers: [...tally].map(([trigger, days]) => ({ trigger, days })).sort((a, b) => b.days - a.days || a.trigger.localeCompare(b.trigger)).slice(0, 3),
  }
}

export interface NerveSummary {
  legNoted: number
  leg: Record<LegPain, number>
  /** Days with at least one sign ticked, over the days where the list was answered (an empty list is an answer). */
  tagsNoted: number
  tagDays: number
  /** The signs ticked on the most days, at most five. */
  tags: { tag: SymptomTag; days: number }[]
  feverNoted: number
  feverDays: number
  /** Days the person said "new symptom for over 24 hours": a declaration, shown as such, not a relapse count. */
  newSymptomNoted: number
  newSymptomDays: number
}

export function summarizeNerveSigns(entries: readonly DailyEntry[]): NerveSummary {
  const legs = entries.flatMap((e) => (e.legPain ? [e.legPain] : []))
  const lists = entries.flatMap((e) => (e.symptomTags ? [e.symptomTags] : []))
  const answers = (pick: (e: DailyEntry) => boolean | undefined) => {
    const values = entries.flatMap((e) => (pick(e) === undefined ? [] : [pick(e)!]))
    return { noted: values.length, yes: values.filter(Boolean).length }
  }
  const fever = answers((e) => e.feverInfection)
  const fresh = answers((e) => e.newSymptom)
  return {
    legNoted: legs.length,
    leg: countBy(LEG_PAIN_LEVELS, legs),
    tagsNoted: lists.length,
    tagDays: lists.filter((l) => l.length > 0).length,
    tags: SYMPTOM_TAGS.map((tag) => ({ tag, days: lists.filter((l) => l.includes(tag)).length })).filter((x) => x.days > 0).sort((a, b) => b.days - a.days).slice(0, 5),
    feverNoted: fever.noted,
    feverDays: fever.yes,
    newSymptomNoted: fresh.noted,
    newSymptomDays: fresh.yes,
  }
}
