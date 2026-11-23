// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import type { Lead } from '../src/lib/leads.ts'
import { DRAWN_DAYS, MAX_TRIAL_HISTORY, archiveTrial, drawPlan, newTrial, reportTrials, restartTrial, startTrial, trialStatus, triedKeys, type LeadTrial, type TrialArm } from '../src/lib/leadTrial.ts'
import { shiftISO } from '../src/lib/dates.ts'

const START = '2026-10-05'
const day = (n: number) => shiftISO(START, n)
const entry = (n: number, painLevel: number, actions?: string[]): LoggedEntry => ({
  date: day(n),
  painLevel,
  createdAt: 0,
  updatedAt: 0,
  positiveActions: actions,
})
const lead = (kind: Lead['kind'], action?: string, gap = -1.5): Lead => ({
  key: kind === 'action' ? `action:${action?.toLowerCase()}` : kind,
  kind,
  action,
  high: { mean: 4, n: 10 },
  low: { mean: 4 - gap, n: 20 },
  rho: -0.5,
  days: 30,
  gap,
})
const trial: LeadTrial = { key: 'action:marche', action: 'Marche', start: START, end: day(6) }

/** A seeded generator, for draws that are the same at each run. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return seed / 2 ** 31
  }
}

test('only an action can be tried: ten drawn days from tomorrow', () => {
  const t = startTrial(lead('action', 'Marche'), day(-1), seeded(1))
  assert.ok(t)
  assert.equal(t.key, 'action:marche')
  assert.equal(t.start, START)
  assert.equal(t.end, day(DRAWN_DAYS - 1))
  assert.equal(t.plan?.length, DRAWN_DAYS)
  assert.equal(startTrial(lead('sleep'), START), null)
  assert.equal(startTrial(lead('stress'), START), null)
})

test('the draw gives half the days with the action, in an order that changes', () => {
  const orders = new Set<string>()
  for (let seed = 1; seed <= 40; seed++) {
    const plan = drawPlan(seeded(seed))
    assert.equal(plan.filter((a) => a === 'with').length, DRAWN_DAYS / 2)
    orders.add(plan.join())
  }
  assert.ok(orders.size > 20)
})

test('doing a trial again draws ten new days from tomorrow, on the same action', () => {
  const again = restartTrial(trial, day(60), seeded(3))
  assert.equal(again.key, trial.key)
  assert.equal(again.action, trial.action)
  assert.equal(again.start, day(61))
  assert.equal(again.end, day(70))
  assert.equal(again.plan?.length, DRAWN_DAYS)
})

test('during the week it counts the days with the action, and the days to come are not missing', () => {
  const entries = [entry(0, 4, ['marche']), entry(1, 6), entry(2, 3, [' MARCHE '])]
  const s = trialStatus(trial, entries, day(2))
  assert.equal(s.over, false)
  assert.equal(s.day, 3)
  assert.equal(s.withDays, 2)
  assert.deepEqual(s.days.map((d) => d.state), ['with', 'without', 'with', 'future', 'future', 'future', 'future'])
  assert.equal(s.result, null)
  assert.equal(s.tooFew, false)
})

test('a day without an entry in the week is simply not logged', () => {
  const s = trialStatus(trial, [entry(0, 4, ['Marche'])], day(3))
  assert.deepEqual(s.days.slice(0, 4).map((d) => d.state), ['with', 'unlogged', 'unlogged', 'unlogged'])
})

test('once the week is over, the days with it are set beside the others', () => {
  const entries = [entry(0, 3, ['Marche']), entry(1, 5), entry(2, 4, ['Marche']), entry(3, 6), entry(4, 5), entry(5, 4, ['Marche']), entry(6, 7)]
  const s = trialStatus(trial, entries, day(7), -2)
  assert.equal(s.over, true)
  assert.equal(s.day, 7)
  assert.ok(s.result)
  assert.equal(s.result.with.n, 3)
  assert.equal(s.result.without.n, 4)
  assert.equal(s.result.with.mean, 11 / 3)
  assert.equal(s.result.without.mean, 23 / 4)
  assert.ok(s.result.gap < 0)
  assert.equal(s.result.sameDirection, true)
})

test('it says when the week goes the other way from the lead, and nothing when there is no direction', () => {
  const entries = [entry(0, 7, ['Marche']), entry(1, 4), entry(2, 6, ['Marche']), entry(3, 3), entry(4, 4)]
  assert.equal(trialStatus(trial, entries, day(7), -2).result?.sameDirection, false)
  assert.equal(trialStatus(trial, entries, day(7)).result?.sameDirection, null)
})

test('with too few days of one sort there is nothing to compare', () => {
  const s = trialStatus(trial, [entry(0, 3, ['Marche']), entry(1, 5), entry(2, 6), entry(3, 6)], day(7))
  assert.equal(s.result, null)
  assert.equal(s.tooFew, true)
})

test('before the end it never says too few', () => {
  assert.equal(trialStatus(trial, [entry(0, 3)], day(3)).tooFew, false)
})

test('a closed week is kept once, the newest kept past a cap', () => {
  assert.deepEqual(archiveTrial(undefined, trial), [trial])
  assert.deepEqual(archiveTrial([trial], trial), [trial])
  const many = Array.from({ length: MAX_TRIAL_HISTORY + 5 }, (_, i) => ({ ...trial, start: shiftISO(START, i * 10), end: shiftISO(START, i * 10 + 6) }))
  const kept = many.reduce<LeadTrial[]>((h, t) => archiveTrial(h, t), [])
  assert.equal(kept.length, MAX_TRIAL_HISTORY)
  assert.equal(kept.at(-1)?.start, many.at(-1)?.start)
})

const WEEK = [entry(0, 3, ['Marche']), entry(1, 5), entry(2, 4, ['Marche']), entry(3, 6), entry(4, 5), entry(5, 4, ['Marche']), entry(6, 7)]

test('the report takes the weeks that ended in its periods and can be compared', () => {
  const out = reportTrials([trial], undefined, WEEK, day(-30), day(20))
  assert.equal(out.length, 1)
  assert.equal(out[0].result.with.n, 3)
  assert.equal(out[0].result.without.n, 4)
  // ended before the periods, or after them
  assert.deepEqual(reportTrials([trial], undefined, WEEK, day(10), day(20)), [])
  assert.deepEqual(reportTrials([trial], undefined, WEEK, day(-30), day(3)), [])
})

test('a week with too few days of one sort is left out of the report', () => {
  assert.deepEqual(reportTrials([trial], undefined, [entry(0, 3, ['Marche']), entry(1, 5), entry(2, 6)], day(-30), day(20)), [])
})

test('the week under way is on the report once it is over, even if the patient never closed it', () => {
  assert.equal(reportTrials([], trial, WEEK, day(-30), day(20)).length, 1)
  assert.deepEqual(reportTrials([], trial, WEEK, day(-30), day(5)), [])
})

test('a week that ends on the last day of the report is not over yet: that day is still being lived', () => {
  assert.deepEqual(reportTrials([trial], undefined, WEEK, day(-30), day(6)), [])
  assert.equal(reportTrials([trial], undefined, WEEK, day(-30), day(7)).length, 1)
})

test('the weeks come oldest first', () => {
  const later: LeadTrial = { ...trial, start: day(20), end: day(26) }
  const entries = [...WEEK, ...WEEK.map((e, i) => ({ ...e, date: day(20 + i) }))]
  const out = reportTrials([later, trial], undefined, entries, day(-30), day(40))
  assert.deepEqual(out.map((t) => t.trial.start), [day(0), day(20)])
})

test('the leads tried are the one under way and the closed ones, once each', () => {
  const other: LeadTrial = { ...trial, key: 'action:yoga', action: 'Yoga' }
  assert.deepEqual(triedKeys(undefined, undefined), [])
  assert.deepEqual(triedKeys(trial, [trial, other]), [trial.key, other.key])
})

// Drawn trials
const PLAN: TrialArm[] = ['with', 'without', 'with', 'without', 'with', 'without', 'with', 'without', 'with', 'without']
const drawn: LeadTrial = { ...newTrial('action:marche', 'Marche', day(-1)), plan: PLAN }

test('a drawn trial starts tomorrow, and tomorrow is shown at once', () => {
  assert.equal(drawn.start, START)
  const s = trialStatus(drawn, [], day(-1))
  assert.equal(s.drawn, true)
  assert.equal(s.day, 0)
  assert.equal(s.length, DRAWN_DAYS)
  assert.deepEqual(s.days.map((d) => d.revealed), [true, false, false, false, false, false, false, false, false, false])
})

test('the next day shows once the day is logged, not before', () => {
  assert.equal(trialStatus(drawn, [], day(2)).days[3].revealed, false)
  const s = trialStatus(drawn, [entry(2, 5)], day(2))
  assert.equal(s.day, 3)
  assert.deepEqual(s.days.slice(0, 5).map((d) => d.revealed), [true, true, true, true, false])
})

test('a day without on which the action is noted all the same is a rescue day', () => {
  const s = trialStatus(drawn, [entry(0, 4, ['Marche']), entry(1, 7, [' marche ']), entry(2, 5)], day(2))
  assert.deepEqual(s.days.slice(0, 3).map((d) => d.rescue), [false, true, false])
  assert.deepEqual(s.days.slice(0, 3).map((d) => d.state), ['with', 'without', 'with'])
})

const TEN = [3, 6, 4, 6, 3, 5, 4, 7, 3, 6].map((p, i) => entry(i, p, i === 3 ? ['Marche'] : undefined))

test('once over, days are compared by the draw: rescue days stay among the days without', () => {
  const s = trialStatus(drawn, TEN, day(10))
  assert.equal(s.over, true)
  assert.ok(s.result)
  assert.equal(s.result.with.n, 5)
  assert.equal(s.result.without.n, 5)
  assert.equal(s.result.with.mean, 17 / 5)
  assert.equal(s.result.without.mean, 30 / 5)
  assert.equal(s.result.rescues, 1)
  assert.equal(s.result.sameDirection, null)
})

test('the next day pairs each day but the last with the one after it', () => {
  const r = trialStatus(drawn, TEN, day(10)).result
  // after a day with (days 0, 2, 4, 6, 8): 6, 6, 5, 7, 6; after a day without (1, 3, 5, 7): 4, 3, 4, 3
  assert.equal(r?.next?.with.mean, 30 / 5)
  assert.equal(r?.next?.without.mean, 14 / 4)
})

test('a drawn trial with fewer than three logged days of a sort is not compared', () => {
  const few = TEN.filter((e) => ![day(1), day(3), day(5)].includes(e.date))
  const s = trialStatus(drawn, few, day(10))
  assert.equal(s.result, null)
  assert.equal(s.tooFew, true)
  assert.deepEqual(reportTrials([drawn], undefined, few, day(-30), day(20)), [])
})

test('the next day is left out when it rests on too few pairs', () => {
  const sparse = TEN.filter((e) => [day(0), day(1), day(3), day(4), day(5), day(6)].includes(e.date) || e.date === day(9))
  const r = trialStatus(drawn, [...sparse, entry(8, 3)], day(10)).result
  assert.ok(r)
  assert.equal(r.next, null)
})
