// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FlareEpisode } from '../src/lib/flares.ts'
import type { LeadTrial } from '../src/lib/leadTrial.ts'
import type { TreatmentEvent } from '../src/lib/treatmentEvents.ts'
import { lastTreatmentEvent, timelineItems, trialSpans } from '../src/lib/trendsTimeline.ts'

const flare = (start: string, end: string): FlareEpisode => ({ start, end, days: 5, peak: 8, baseline: 3, recoveryDays: 2, ongoing: false, endUnknown: false })
const trial = (key: string, start: string, end: string): LeadTrial => ({ key, action: key, start, end })
const event = (date: string, kind: TreatmentEvent['kind'] = 'doseChanged'): TreatmentEvent =>
  ({ med: { id: 'm', name: 'Amitriptyline', regimen: 'scheduled', periods: [], createdAt: 0, updatedAt: 0 }, kind, date, period: { start: date } }) as unknown as TreatmentEvent

const base = { from: '2026-10-01', to: '2026-10-30', flares: [], events: [], history: [], current: undefined, today: '2026-10-30' }
const kinds = (r: ReturnType<typeof timelineItems>) => r.map((i) => `${i.kind}:${i.date}`)

test('flares, changes and trials are listed together, newest first', () => {
  const r = timelineItems({
    ...base,
    flares: [flare('2026-10-03', '2026-10-08'), flare('2026-10-20', '2026-10-25')],
    events: [event('2026-10-12')],
    history: [trial('action:marche', '2026-10-14', '2026-10-20')],
  })
  assert.deepEqual(kinds(r), ['flare:2026-10-20', 'trial:2026-10-14', 'treatment:2026-10-12', 'flare:2026-10-03'])
})

test('what is outside the range stays out, what only touches it stays in', () => {
  const r = timelineItems({
    ...base,
    flares: [flare('2026-09-25', '2026-10-02'), flare('2026-08-01', '2026-08-05')],
    events: [event('2026-09-30')],
    history: [trial('action:bain', '2026-09-20', '2026-09-26')],
  })
  assert.deepEqual(kinds(r), ['flare:2026-09-25'])
})

test('on the same day a flare comes first, then a trial, then a treatment', () => {
  const r = timelineItems({ ...base, flares: [flare('2026-10-10', '2026-10-14')], events: [event('2026-10-10')], history: [trial('action:thé', '2026-10-10', '2026-10-16')] })
  assert.deepEqual(kinds(r), ['flare:2026-10-10', 'trial:2026-10-10', 'treatment:2026-10-10'])
})

test('the trial under way is listed once and marked as running; a week over is not', () => {
  const current = trial('action:marche', '2026-10-27', '2026-11-02')
  const r = timelineItems({ ...base, history: [trial('action:marche', '2026-10-27', '2026-11-02')], current })
  assert.equal(r.length, 1)
  assert.equal(r[0].kind === 'trial' && r[0].running, true)
  const over = timelineItems({ ...base, current: trial('action:marche', '2026-10-15', '2026-10-21') })
  assert.equal(over[0].kind === 'trial' && over[0].running, false)
})

test('the trials make bands under the curve', () => {
  const r = timelineItems({ ...base, flares: [flare('2026-10-03', '2026-10-08')], history: [trial('action:marche', '2026-10-14', '2026-10-20')] })
  assert.deepEqual(trialSpans(r), [{ from: '2026-10-14', to: '2026-10-20' }])
})

test('the last change of treatment is the latest one up to today', () => {
  const events = [event('2026-08-01', 'started'), event('2026-09-17'), event('2026-11-05')]
  assert.equal(lastTreatmentEvent(events, '2026-10-30')?.date, '2026-09-17')
  assert.equal(lastTreatmentEvent([], '2026-10-30'), undefined)
})
