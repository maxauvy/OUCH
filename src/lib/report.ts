// Numbers behind the doctor report. Everything here is descriptive: counts,
// averages, distributions and rank correlations over self-reported daily
// entries. Nothing is interpreted, and missing days are left out rather
// than filled in (the report states how many days were logged).

import type { DailyEntry, Medication, MedicationRegimen } from '../db/types'
import { shiftISO } from './medications'

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)
}

// ---------------------------------------------------------------------------
// Descriptive statistics

export const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length

export function sd(a: number[]): number {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1))
}

/** Linear interpolation between order statistics (same as R's type 7). */
export function quantile(a: number[], p: number): number {
  const s = [...a].sort((x, y) => x - y)
  const pos = (s.length - 1) * p
  const lo = Math.floor(pos)
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo)
}

export const median = (a: number[]) => quantile(a, 0.5)

function ranks(a: number[]): number[] {
  const order = a.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0])
  const r = new Array<number>(a.length)
  for (let i = 0; i < order.length; ) {
    let j = i
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++
    for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2 + 1
    i = j + 1
  }
  return r
}

function pearson(x: number[], y: number[]): number {
  const mx = mean(x)
  const my = mean(y)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN
}

/** Spearman's rank correlation (ties get their average rank). */
export const spearman = (x: number[], y: number[]) => pearson(ranks(x), ranks(y))

// ---------------------------------------------------------------------------
// Periods

export interface ReportPeriods {
  /** First day of the comparison period (same length, right before) */
  prevStart: string
  /** Last consultation: first day of the reported period */
  start: string
  /** Last day of the reported period (today) */
  end: string
  periodDays: number
  /** Days from prevStart to end, the span every chart shares */
  totalDays: number
  /** Day offset from prevStart, for chart x positions */
  dayIndex: (date: string) => number
}

export function reportPeriods(consultation: string, end: string): ReportPeriods {
  const periodDays = daysBetween(consultation, end) + 1
  const prevStart = shiftISO(consultation, -periodDays)
  return {
    prevStart,
    start: consultation,
    end,
    periodDays,
    totalDays: periodDays * 2,
    dayIndex: (date) => daysBetween(prevStart, date),
  }
}

export function splitEntries(entries: DailyEntry[], p: ReportPeriods) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  return {
    current: sorted.filter((e) => e.date >= p.start && e.date <= p.end),
    previous: sorted.filter((e) => e.date >= p.prevStart && e.date < p.start),
  }
}

// ---------------------------------------------------------------------------
// Pain

export interface PainStats {
  n: number
  mean: number
  sd: number
  median: number
  q1: number
  q3: number
  min: number
  max: number
  /** Share of days ≤ 3 / 4–6 / ≥ 7 */
  mild: number
  moderate: number
  severe: number
  /** Share of days at each level 0–10 */
  distribution: number[]
}

export function painStats(entries: DailyEntry[]): PainStats | null {
  if (!entries.length) return null
  const p = entries.map((e) => e.painLevel)
  const share = (test: (v: number) => boolean) => p.filter(test).length / p.length
  return {
    n: p.length,
    mean: mean(p),
    sd: sd(p),
    median: median(p),
    q1: quantile(p, 0.25),
    q3: quantile(p, 0.75),
    min: Math.min(...p),
    max: Math.max(...p),
    mild: share((v) => v <= 3),
    moderate: share((v) => v >= 4 && v <= 6),
    severe: share((v) => v >= 7),
    distribution: Array.from({ length: 11 }, (_, level) => share((v) => v === level)),
  }
}

export interface Flare {
  start: string
  end: string
}

/** Runs of consecutive logged days at or above `threshold`, at least
 * `minDays` long. A day without an entry neither breaks nor extends a run. */
export function flares(entries: DailyEntry[], threshold = 7, minDays = 2): Flare[] {
  const out: Flare[] = []
  let run: { start: string; end: string; days: number } | null = null
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    // More than one missing day in a row ends the run: too little to say.
    const broken = run !== null && daysBetween(run.end, e.date) > 2
    if (run && (broken || e.painLevel < threshold)) {
      if (run.days >= minDays) out.push({ start: run.start, end: run.end })
      run = null
    }
    if (e.painLevel >= threshold) run = run ? { start: run.start, end: e.date, days: run.days + 1 } : { start: e.date, end: e.date, days: 1 }
  }
  if (run && run.days >= minDays) out.push({ start: run.start, end: run.end })
  return out
}

/** Mean of the values over the last `window` calendar days, for each day of
 * the chart, once at least `minValues` of them are known. */
export function rollingMean(
  entries: DailyEntry[],
  get: (e: DailyEntry) => number | undefined,
  p: ReportPeriods,
  window = 7,
  minValues = 4
): (number | null)[] {
  const byIndex = new Map(entries.map((e) => [p.dayIndex(e.date), get(e)]))
  return Array.from({ length: p.totalDays }, (_, i) => {
    const values: number[] = []
    for (let k = i - window + 1; k <= i; k++) {
      const v = byIndex.get(k)
      if (typeof v === 'number') values.push(v)
    }
    return values.length >= minValues ? mean(values) : null
  })
}

// ---------------------------------------------------------------------------
// Other symptoms, zones, actions, notes

export type SymptomKey = 'fatigueLevel' | 'sleepQuality' | 'sleepHours' | 'brainFog' | 'moodLevel' | 'stressLevel' | 'activityLevel'

export function meanOf(entries: DailyEntry[], key: SymptomKey): { mean: number; n: number } | null {
  const v = entries.map((e) => e[key]).filter((x): x is number => typeof x === 'number')
  return v.length ? { mean: mean(v), n: v.length } : null
}

/** Share of logged days on which each tag appears, most frequent first. */
export function tagShares(entries: DailyEntry[], get: (e: DailyEntry) => string[] | undefined): [string, number][] {
  const counts = new Map<string, number>()
  for (const e of entries) for (const tag of new Set(get(e) ?? [])) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts].map(([tag, n]) => [tag, n / entries.length] as [string, number]).sort((a, b) => b[1] - a[1])
}

// ---------------------------------------------------------------------------
// Medications

export interface MedicationReport {
  med: Medication
  regimen: MedicationRegimen
  /** Days with at least one intake */
  daysTaken: number
  /** Scheduled only: days the dose was explicitly marked missed */
  daysMissed: number
  /** Sum of recorded dose counts */
  doses: number
  /** Days taken without a recorded count (migrated from free text) */
  daysWithoutCount: number
  maxDosesInADay: number
  /** Count of intakes rated none / slight / moderate / strong */
  relief: [number, number, number, number]
  /** Side effect → dates it was reported */
  sideEffects: Map<string, string[]>
  /** Posology periods that started inside the charted span */
  changes: Medication['periods']
}

export function medicationReports(entries: DailyEntry[], medications: Medication[], p: ReportPeriods): MedicationReport[] {
  const out: MedicationReport[] = []
  for (const med of medications) {
    const intakes = entries.flatMap((e) =>
      (e.intakes ?? []).filter((i) => i.medicationId === med.id).map((i) => ({ ...i, date: e.date }))
    )
    const activeDuringPeriod = med.periods.some((per) => per.start <= p.end && (!per.end || per.end >= p.start))
    if (!intakes.length && !activeDuringPeriod) continue
    const taken = intakes.filter((i) => i.doses === undefined || i.doses > 0)
    const relief: [number, number, number, number] = [0, 0, 0, 0]
    const sideEffects = new Map<string, string[]>()
    for (const i of intakes) {
      if (i.relief !== undefined) relief[i.relief]++
      for (const s of i.sideEffects ?? []) sideEffects.set(s, [...(sideEffects.get(s) ?? []), i.date])
    }
    out.push({
      med,
      regimen: med.regimen,
      daysTaken: taken.length,
      daysMissed: intakes.filter((i) => i.doses === 0).length,
      doses: taken.reduce((s, i) => s + (i.doses ?? 0), 0),
      daysWithoutCount: taken.filter((i) => i.doses === undefined).length,
      maxDosesInADay: Math.max(0, ...taken.map((i) => i.doses ?? 0)),
      relief,
      sideEffects,
      changes: med.periods.filter((per) => per.start > p.prevStart && per.start <= p.end),
    })
  }
  const order = { scheduled: 0, asNeeded: 1, unspecified: 2 }
  return out.sort((a, b) => order[a.regimen] - order[b.regimen] || a.med.name.localeCompare(b.med.name))
}

/** Days on which at least one as-needed (or undescribed) medication was taken. */
export function daysWithRescueMedication(entries: DailyEntry[], medications: Medication[]): number {
  const rescue = new Set(medications.filter((m) => m.regimen !== 'scheduled').map((m) => m.id))
  return entries.filter((e) => e.intakes?.some((i) => rescue.has(i.medicationId) && (i.doses === undefined || i.doses > 0))).length
}

export interface WeekRow {
  start: string
  end: string
  logged: number
  days: number
  meanPain: number | null
  /** medication id → doses that week (scheduled: days taken) */
  byMedication: Map<string, number>
}

export function weeklyRows(entries: DailyEntry[], p: ReportPeriods): WeekRow[] {
  const rows: WeekRow[] = []
  for (let start = p.start; start <= p.end; start = shiftISO(start, 7)) {
    const endCandidate = shiftISO(start, 6)
    const end = endCandidate < p.end ? endCandidate : p.end
    const week = entries.filter((e) => e.date >= start && e.date <= end)
    const byMedication = new Map<string, number>()
    for (const e of week)
      for (const i of e.intakes ?? []) {
        const n = i.doses === undefined ? 1 : i.doses
        byMedication.set(i.medicationId, (byMedication.get(i.medicationId) ?? 0) + n)
      }
    rows.push({
      start,
      end,
      logged: week.length,
      days: daysBetween(start, end) + 1,
      meanPain: week.length ? mean(week.map((e) => e.painLevel)) : null,
      byMedication,
    })
  }
  return rows
}

// ---------------------------------------------------------------------------
// Associations (pain vs. other factors), over the whole charted span

export interface Association {
  key: string
  rho: number
  n: number
}

export function association(
  entries: DailyEntry[],
  key: string,
  get: (e: DailyEntry, previous: DailyEntry | undefined) => number | undefined,
  minN = 14
): Association | null {
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const x: number[] = []
  const y: number[] = []
  for (const e of entries) {
    const v = get(e, byDate.get(shiftISO(e.date, -1)))
    if (typeof v === 'number') {
      x.push(v)
      y.push(e.painLevel)
    }
  }
  if (x.length < minN) return null
  const rho = spearman(x, y)
  return Number.isFinite(rho) ? { key, rho, n: x.length } : null
}

/** Conventional labels for |ρ|: < 0.1, < 0.3, < 0.5, above. */
export function strengthIndex(rho: number): 0 | 1 | 2 | 3 {
  const a = Math.abs(rho)
  return a < 0.1 ? 0 : a < 0.3 ? 1 : a < 0.5 ? 2 : 3
}

export interface ContextComparison {
  key: string
  withMedian: number
  withN: number
  withoutMedian: number
  withoutN: number
}

export function compareContext(
  entries: DailyEntry[],
  key: string,
  test: (e: DailyEntry, previous: DailyEntry | undefined) => boolean | undefined,
  minN = 3
): ContextComparison | null {
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const yes: number[] = []
  const no: number[] = []
  for (const e of entries) {
    const r = test(e, byDate.get(shiftISO(e.date, -1)))
    if (r === true) yes.push(e.painLevel)
    else if (r === false) no.push(e.painLevel)
  }
  if (yes.length < minN || no.length < minN) return null
  return { key, withMedian: median(yes), withN: yes.length, withoutMedian: median(no), withoutN: no.length }
}
