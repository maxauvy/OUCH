// The "leads" on the Trends screen: the few things in a person's own notes
// that go along with a clearly different pain, written so they can be read in
// two seconds. Nothing here says what causes what.
//
// The same bar as the doctor report, so the two never disagree: a Spearman
// correlation over at least 14 days, above the conventional "weak" mark (0.3)
// and above what chance alone tends to produce (about 2/√n). On top of that, the
// two groups compared must each hold a few days and sit a full point apart, so
// the numbers on the card show a difference worth reading.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types'
import { shiftISO } from './medications.ts'
import { spearman } from './report.ts'

export type LeadKind = 'sleep' | 'stress' | 'activity' | 'action'

export interface LeadGroup {
  /** Mean pain over the days of the group. */
  mean: number
  n: number
}

export interface Lead {
  /** Stable name for what the person answered: 'sleep', 'stress', 'activity' or 'action:<name>'. */
  key: string
  kind: LeadKind
  /** The action, as the person wrote it first (kind 'action' only). */
  action?: string
  /** Days with the highest third of the factor, or with the action. */
  high: LeadGroup
  /** Days with the lowest third of the factor, or without the action. */
  low: LeadGroup
  /** Rank correlation behind the lead, and the days it rests on. */
  rho: number
  days: number
  /** high.mean − low.mean: negative when pain is lower on the "high" side. */
  gap: number
}

/** What the person answered to a lead. Kept as a preference, restored from a backup. */
export interface LeadChoice {
  choice: 'kept' | 'dismissed'
  /** When (ms). */
  at: number
  /** What the lead looked like then: a dismissed lead comes back when it gets clearly stronger. */
  gap: number
  days: number
}

export type LeadChoices = Record<string, LeadChoice>

/** Days with a pain level and a value, at least, before a correlation is read. */
export const LEAD_MIN_DAYS = 14
/** Days in each of the two groups compared. */
export const LEAD_MIN_GROUP = 4
/** A full point of pain between the two groups. */
export const LEAD_MIN_GAP = 1
/** The most leads on the card at once: a few, so that none is noise piled on noise. */
export const LEAD_MAX = 3
/** A dismissed lead comes back with a point more of gap, or twice the days. */
const COMEBACK_EXTRA_GAP = 1
const COMEBACK_DAYS_FACTOR = 2

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length

/** What the correlation has to reach for `n` days: the "weak" mark, and twice
 * the size chance alone tends to give. */
export function leadThreshold(n: number): number {
  return Math.max(0.3, 2 / Math.sqrt(n))
}

function group(pains: number[]): LeadGroup {
  return { mean: mean(pains), n: pains.length }
}

function build(
  key: string,
  kind: LeadKind,
  highPains: number[],
  lowPains: number[],
  rho: number,
  days: number,
  action?: string
): Lead | null {
  if (highPains.length < LEAD_MIN_GROUP || lowPains.length < LEAD_MIN_GROUP) return null
  if (!Number.isFinite(rho) || Math.abs(rho) < leadThreshold(days)) return null
  const high = group(highPains)
  const low = group(lowPains)
  const gap = high.mean - low.mean
  if (Math.abs(gap) < LEAD_MIN_GAP) return null
  return { key, kind, action, high, low, rho, days, gap }
}

/** Highest and lowest third of the person's own values, by value: days equal
 * to a cut belong to the lower group, so a tie never fills both sides. */
function thirds(pairs: { x: number; pain: number }[]) {
  const sorted = pairs.map((p) => p.x).sort((a, b) => a - b)
  const cut1 = sorted[Math.floor(sorted.length / 3) - 1] ?? sorted[0]
  const cut2 = sorted[Math.floor((2 * sorted.length) / 3) - 1] ?? sorted[sorted.length - 1]
  return {
    low: pairs.filter((p) => p.x <= cut1).map((p) => p.pain),
    high: pairs.filter((p) => p.x > cut2).map((p) => p.pain),
  }
}

function scaleLead(
  entries: LoggedEntry[],
  key: string,
  kind: LeadKind,
  get: (e: LoggedEntry, previous: LoggedEntry | undefined) => number | undefined
): Lead | null {
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const pairs: { x: number; pain: number }[] = []
  for (const e of entries) {
    const x = get(e, byDate.get(shiftISO(e.date, -1)))
    if (typeof x === 'number') pairs.push({ x, pain: e.painLevel })
  }
  if (pairs.length < LEAD_MIN_DAYS) return null
  const { low, high } = thirds(pairs)
  return build(key, kind, high, low, spearman(pairs.map((p) => p.x), pairs.map((p) => p.pain)), pairs.length)
}

/** Two spellings of one action ("Marche", " marche ") are the same action. */
const actionKey = (name: string) => name.trim().toLowerCase()

function actionLeads(entries: LoggedEntry[]): Lead[] {
  if (entries.length < LEAD_MIN_DAYS) return []
  const shown = new Map<string, string>()
  const daysWith = new Map<string, Set<string>>()
  for (const e of entries) {
    for (const raw of e.positiveActions ?? []) {
      const k = actionKey(raw)
      if (!k) continue
      if (!shown.has(k)) shown.set(k, raw.trim())
      if (!daysWith.has(k)) daysWith.set(k, new Set())
      daysWith.get(k)!.add(e.date)
    }
  }
  const leads: Lead[] = []
  for (const [k, dates] of daysWith) {
    const x = entries.map((e) => (dates.has(e.date) ? 1 : 0))
    const pains = entries.map((e) => e.painLevel)
    const lead = build(
      `action:${k}`,
      'action',
      entries.filter((e) => dates.has(e.date)).map((e) => e.painLevel),
      entries.filter((e) => !dates.has(e.date)).map((e) => e.painLevel),
      spearman(x, pains),
      entries.length,
      shown.get(k)
    )
    if (lead) leads.push(lead)
  }
  return leads
}

export interface LeadFactors {
  sleep: boolean
  stress: boolean
  activity: boolean
  actions: boolean
}

/** Every lead the notes hold, the strongest first. Which factors count follows
 * what the person tracks. The activity is the previous day's, as in the
 * report; sleep is the one entered that day, which describes the night before. */
export function findLeads(
  entries: LoggedEntry[],
  factors: LeadFactors = { sleep: true, stress: true, activity: true, actions: true }
): Lead[] {
  const found: (Lead | null)[] = [
    factors.sleep ? scaleLead(entries, 'sleep', 'sleep', (e) => e.sleepQuality) : null,
    factors.stress ? scaleLead(entries, 'stress', 'stress', (e) => e.stressLevel) : null,
    factors.activity ? scaleLead(entries, 'activity', 'activity', (_, previous) => previous?.activityLevel) : null,
    ...(factors.actions ? actionLeads(entries) : []),
  ]
  return found.filter((l): l is Lead => l !== null).sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho))
}

/** True while an answer of "not really" still holds: the lead has not got
 * clearly stronger, and still goes the same way. */
export function isDismissed(lead: Lead, choice: LeadChoice | undefined): boolean {
  if (choice?.choice !== 'dismissed') return false
  if (Math.sign(lead.gap) !== Math.sign(choice.gap)) return false
  const stronger = Math.abs(lead.gap) >= Math.abs(choice.gap) + COMEBACK_EXTRA_GAP
  const moreDays = lead.days >= choice.days * COMEBACK_DAYS_FACTOR
  return !(stronger || moreDays)
}

export interface LeadList {
  /** What the card shows: the ones the person kept first, then the strongest. At most `LEAD_MAX`. */
  shown: Lead[]
  /** Set aside, to be reopened. */
  dismissed: Lead[]
}

export function arrangeLeads(leads: Lead[], choices: LeadChoices | undefined): LeadList {
  const dismissed = leads.filter((l) => isDismissed(l, choices?.[l.key]))
  const open = leads.filter((l) => !dismissed.includes(l))
  const kept = open.filter((l) => choices?.[l.key]?.choice === 'kept')
  const rest = open.filter((l) => !kept.includes(l))
  return { shown: [...kept, ...rest].slice(0, LEAD_MAX), dismissed }
}

export function choiceFor(lead: Lead, choice: LeadChoice['choice'], at: number): LeadChoice {
  return { choice, at, gap: lead.gap, days: lead.days }
}
