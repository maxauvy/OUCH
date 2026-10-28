// The sentences that describe what the person noted over a period, for the
// report and for Trends alike: days noted, days with a yes, the most frequent
// answers. One place, so the two never say different things. No score, no
// threshold. Strings come from the caller's language (the report may differ
// from the app's), through its own `format`.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry } from '../db/types.ts'
import { summarizeCycleSymptoms, summarizeHeadaches, summarizeJoints, summarizeNerveSigns, summarizeRefreshed } from './indicatorSummaries.ts'
import { summarizeMorningStiffness } from './stiffnessSummary.ts'
import { summarizeNightWakings } from './nightWakings.ts'

/** The wording the lines need: `Translations['report']` has it, in either language. */
export interface IndicatorWording {
  stiffness: {
    noted: string
    commonest: string
    severity: string
    bands: Record<string, string>
  }
  nightWakings: { noted: string; mean: string }
  indicators: {
    refreshed: string
    joints: string
    jointsTop: string
    flow: string
    yesDays: string
    headache: string
    headacheDetails: string
    headacheDurations: string
    headacheTriggers: string
    headacheReference: string
    item: string
    refreshedLevels: Record<string, string>
    flowLevels: Record<string, string>
    durations: Record<string, string>
    jointNames: Record<string, string>
    offCycle: string
    bowelPain: string
    urinary: string
    legPainLevels: Record<string, string>
    leg: string
    tagLabels: Record<string, string>
    tagsLine: string
    tagsTop: string
    feverInfection: string
    newSymptom: string
  }
}

type Format = (template: string, vars: Record<string, string | number>) => string

const present = <K extends string>(counts: Record<K, number>) => (Object.keys(counts) as K[]).filter((k) => counts[k] > 0)

/** The morning stiffness, as one or two sentences. Empty when no day carries it. */
export function stiffnessLines(entries: readonly DailyEntry[], t: IndicatorWording, format: Format, nf: (v: number) => string): string[] {
  const s = summarizeMorningStiffness(entries)
  if (s.noted === 0) return []
  const w = t.stiffness
  const first = [format(w.noted, { n: s.noted }), s.commonest && format(w.commonest, { band: w.bands[s.commonest]! }), s.severity && format(w.severity, { v: nf(s.severity.mean), n: s.severity.n })]
  return [first.filter(Boolean).join(' ')]
}

/** The wakings because of pain. Empty when no day carries it. */
export function nightWakingLines(entries: readonly DailyEntry[], t: IndicatorWording, format: Format, nf: (v: number) => string): string[] {
  const s = summarizeNightWakings(entries)
  if (s.noted === 0) return []
  return [`${format(t.nightWakings.noted, { n: s.noted, w: s.withWaking })} ${format(t.nightWakings.mean, { v: nf(s.mean ?? 0) })}`]
}

/** Waking rested, joints, cycle symptoms, nerve signs and headaches: one line each, only for what a day carries. */
export function otherIndicatorLines(entries: readonly DailyEntry[], t: IndicatorWording, format: Format, options: { mohReference?: number } = {}): string[] {
  const w = t.indicators
  const lines: string[] = []
  const item = (label: string, n: number) => format(w.item, { label, n })

  const refreshed = summarizeRefreshed(entries)
  if (refreshed.noted > 0) lines.push(format(w.refreshed, { list: present(refreshed.counts).map((k) => item(w.refreshedLevels[k]!, refreshed.counts[k])).join(', '), n: refreshed.noted }))

  const joints = summarizeJoints(entries)
  if (joints.noted > 0) {
    lines.push(format(w.joints, { yes: joints.yesDays, n: joints.noted }))
    if (joints.top.length) lines.push(format(w.jointsTop, { list: joints.top.map((j) => item(w.jointNames[j.joint]!, j.days)).join(', ') }))
  }

  const cycle = summarizeCycleSymptoms(entries)
  if (cycle.flowNoted > 0) lines.push(format(w.flow, { list: present(cycle.flow).map((k) => item(w.flowLevels[k]!, cycle.flow[k])).join(', ') }))
  if (cycle.offCycleNoted > 0) lines.push(format(w.yesDays, { label: w.offCycle, n: cycle.offCycleDays, k: cycle.offCycleNoted }))
  if (cycle.bowelNoted > 0) lines.push(format(w.yesDays, { label: w.bowelPain, n: cycle.bowelDays, k: cycle.bowelNoted }))
  if (cycle.urinaryNoted > 0) lines.push(format(w.yesDays, { label: w.urinary, n: cycle.urinaryDays, k: cycle.urinaryNoted }))

  const nerve = summarizeNerveSigns(entries)
  if (nerve.legNoted > 0) lines.push(format(w.leg, { list: present(nerve.leg).map((k) => item(w.legPainLevels[k]!, nerve.leg[k])).join(', ') }))
  if (nerve.tagsNoted > 0) {
    lines.push(format(w.tagsLine, { n: nerve.tagDays, k: nerve.tagsNoted }))
    if (nerve.tags.length) lines.push(format(w.tagsTop, { list: nerve.tags.map((x) => item(w.tagLabels[x.tag]!, x.days)).join(', ') }))
  }
  if (nerve.feverNoted > 0) lines.push(format(w.yesDays, { label: w.feverInfection, n: nerve.feverDays, k: nerve.feverNoted }))
  if (nerve.newSymptomNoted > 0) lines.push(format(w.yesDays, { label: w.newSymptom, n: nerve.newSymptomDays, k: nerve.newSymptomNoted }))

  const headache = summarizeHeadaches(entries)
  if (headache.noted > 0) {
    lines.push(format(w.headache, { n: headache.headacheDays, k: headache.noted, m: headache.acuteMedDays }))
    if (headache.headacheDays > 0) {
      lines.push(format(w.headacheDetails, { a: headache.auraDays, b: headache.nauseaDays, c: headache.sensitivityDays }))
      const durations = present(headache.durations)
      if (durations.length) lines.push(format(w.headacheDurations, { list: durations.map((k) => item(w.durations[k]!, headache.durations[k])).join(', ') }))
      if (headache.triggers.length) lines.push(format(w.headacheTriggers, { list: headache.triggers.map((x) => item(x.trigger, x.days)).join(', ') }))
      // The reference points for medication overuse only go with a source (the report), and only where an attack medication was noted.
      if (options.mohReference !== undefined && headache.acuteMedDays > 0) lines.push(format(w.headacheReference, { ref: options.mohReference }))
    }
  }
  return lines
}
