// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry, LoggedEntry, PastConsultation } from '../src/db/types.ts'
import { shiftISO } from '../src/lib/dates.ts'
import { followDecisions } from '../src/lib/decisions.ts'
import { cleanDecisions } from '../src/lib/decisions.ts'
import { currentActionKey, currentLabels } from '../src/lib/renamedSuggestions.ts'
import { sanitizeBackup } from '../src/lib/backupSanitize.ts'
import {
  aroundSessions, countExercises, medianPain, painWithExercises, physioActive, physioReport, runningExercises, seriesProgress, sessionDates, sinceLastSession, withSeriesTotal,
} from '../src/lib/physio.ts'

const D = '2026-11-03' // a Tuesday
const day = (n: number) => shiftISO(D, n)
const entry = (n: number, pain: number, extra: Partial<DailyEntry> = {}): LoggedEntry => ({ date: day(n), painLevel: pain, createdAt: 0, updatedAt: 0, ...extra })
const session = { positiveActions: ['Séance de kiné'] }
const done = { positiveActions: ['Exercices du kiné'], physioExercises: 'done' as const }
const part = { positiveActions: ['Exercices du kiné'], physioExercises: 'part' as const }
const exercisesGiven: PastConsultation = { date: day(0), kind: 'kine', doctor: 'Mme Durand', decisions: [{ kind: 'habit', text: 'Gainage, 15 min', action: 'Exercices du kiné', perWeek: 5 }] }

test('the switch needs the early access on this device', () => {
  assert.equal(physioActive({ physioTracking: true }, true), true)
  assert.equal(physioActive({ physioTracking: true }, false), false)
  assert.equal(physioActive({}, true), false)
})

test('the old « Kiné / soins » becomes « Séance de kiné », in the days, the decisions and the keys', () => {
  assert.deepEqual(currentLabels(['Kiné / soins', 'Chaleur']), ['Séance de kiné', 'Chaleur'])
  assert.deepEqual(currentLabels(['Kiné / soins', 'Séance de kiné']), ['Séance de kiné'])
  assert.deepEqual(currentLabels(['Physiotherapy / care']), ['Physio session'])
  assert.equal(currentActionKey('action:kiné / soins'), 'action:séance de kiné')
  assert.equal(currentActionKey('factor:sleep'), 'factor:sleep')
  assert.deepEqual(cleanDecisions([{ kind: 'habit', text: 'Kiné / soins', action: 'Kiné / soins', perWeek: 1 }]), [{ kind: 'habit', text: 'Séance de kiné', action: 'Séance de kiné', perWeek: 1 }])
  // The person's own sentence is kept as written.
  assert.equal(cleanDecisions([{ kind: 'habit', text: 'Une séance par semaine', action: 'Kiné / soins' }])![0]!.text, 'Une séance par semaine')
})

test('the sessions are the days marked « Séance de kiné » and the physio appointments, once each, up to a day', () => {
  const entries = [entry(0, 4, session), entry(7, 5, session), entry(14, 4, session)]
  const past: PastConsultation[] = [{ date: day(7), kind: 'kine' }, { date: day(10), kind: 'kine' }, { date: day(10), kind: 'gp' }]
  assert.deepEqual(sessionDates(entries, past, day(12)), [day(0), day(7), day(10)])
})

test('a series counts its sessions from its start, and keeps that start when its size changes', () => {
  const sessions = [day(-7), day(0), day(7), day(14)]
  assert.deepEqual(seriesProgress({ total: 8, start: day(0) }, sessions, day(10)), { done: 2, total: 8, start: day(0) })
  assert.equal(seriesProgress(undefined, sessions, day(10)), null)
  assert.deepEqual(withSeriesTotal({ total: 8, start: day(0) }, 10, day(20)), { total: 10, start: day(0) })
  assert.deepEqual(withSeriesTotal(undefined, 8, day(20), day(15)), { total: 8, start: day(15) })
  assert.deepEqual(withSeriesTotal(undefined, 8, day(20), day(25)), { total: 8, start: day(20) })
})

test('the exercises under way are the latest decision counted by « Exercices du kiné », whatever the appointment', () => {
  const gp: PastConsultation = { date: day(3), kind: 'gp', decisions: [{ kind: 'habit', text: 'Marcher', action: 'Marche courte', perWeek: 3 }] }
  assert.equal(runningExercises([gp, exercisesGiven], day(10))?.date, day(0))
  assert.equal(runningExercises([exercisesGiven], day(-1)), null)
  assert.equal(runningExercises([gp], day(10)), null)
})

test('a day in part counts as half a day; taking the action off by hand makes it a day without', () => {
  const entries: DailyEntry[] = [entry(1, 4, done), entry(2, 5, part), entry(3, 5, part), entry(4, 6), entry(5, 5, { physioExercises: 'part' })]
  assert.deepEqual(countExercises(entries, day(1), day(7), 5), { done: 2, part: 2, planned: 5 })
  assert.equal(countExercises(entries, day(1), day(5), 5).planned, null)
})

test('the follow-up of the decision counts a day in part as half, and says so', () => {
  const entries = [entry(1, 4, done), entry(2, 5, part), entry(3, 5, done), entry(4, 6), entry(5, 6), entry(6, 6), entry(7, 4, done)]
  const [f] = followDecisions(exercisesGiven.decisions!, day(0), day(7), entries, [])
  assert.equal(f!.kind, 'habit')
  if (f!.kind !== 'habit') return
  assert.equal(f.done, 3.5)
  assert.equal(f.part, 1)
  assert.equal(f.planned, 5)
  // The pain on days with counts the day in part among them.
  assert.equal(f.withDays, 4)
})

test('the pain with and without exercises needs three days on each side', () => {
  const entries = [entry(1, 3, done), entry(2, 4, part), entry(3, 5, done), entry(4, 6), entry(5, 6), entry(6, 7)]
  assert.deepEqual(painWithExercises(entries, day(1), day(6)), { with: 4, without: 19 / 3, nWith: 3, nWithout: 3 })
  assert.equal(painWithExercises(entries, day(1), day(5)).without, null)
})

test('around each of the last sessions: the day before, the day, the day after and two days after, as noted', () => {
  const entries = [entry(-1, 4), entry(0, 4, session), entry(1, 6), entry(6, 4), entry(7, 5, session), entry(8, 7)]
  const sessions = sessionDates(entries, [], day(8))
  assert.deepEqual(aroundSessions(entries, sessions, day(8)), [
    { date: day(0), pain: [4, 4, 6, undefined] },
    { date: day(7), pain: [4, 5, 7, undefined] },
  ])
  // The session of today is not around yet.
  assert.deepEqual(aroundSessions(entries, sessions, day(7)).map((s) => s.date), [day(0)])
})

test('the screen covers the days since the last session, or the last 7 days without one', () => {
  assert.deepEqual(sinceLastSession([day(0), day(7)], day(10)), { from: day(7), session: day(7) })
  assert.deepEqual(sinceLastSession([day(7)], day(7)), { from: day(1), session: null })
  assert.deepEqual(sinceLastSession([day(-60)], day(0)), { from: day(-6), session: null })
  assert.equal(medianPain([entry(1, 3), entry(2, 5), entry(3, 4), entry(4, 8)], day(1), day(4)), 4.5)
  assert.equal(medianPain([entry(1, 3)], day(1), day(4)), null)
})

test('the report: the sessions of the period, the series, the exercises from the day after they were given', () => {
  const all = [entry(0, 4, session), entry(1, 4, done), entry(2, 5, part), entry(3, 5, done), entry(4, 6), entry(5, 6), entry(6, 6), entry(7, 4, session)]
  const r = physioReport({ entries: all, allEntries: all, past: [exercisesGiven], series: { total: 8, start: day(0) }, from: day(-10), to: day(7) })
  assert.ok(r)
  assert.equal(r.sessions, 2)
  assert.deepEqual(r.series, { done: 2, total: 8, start: day(0) })
  assert.equal(r.therapist, 'Mme Durand')
  assert.equal(r.exercises?.since, day(1))
  assert.deepEqual(r.exercises?.count, { done: 2.5, part: 1, planned: 5 })
  // Nothing to say: no block.
  assert.equal(physioReport({ entries: [entry(1, 4)], allEntries: [entry(1, 4)], past: [], series: undefined, from: day(0), to: day(7) }), null)
})

test('a backup brings back the switch, the series and the evening answer, and renames the old action', () => {
  const r = sanitizeBackup({
    entries: [{ date: day(1), painLevel: 4, positiveActions: ['Kiné / soins', 'Exercices du kiné'], physioExercises: 'part' }, { date: day(2), painLevel: 4, physioExercises: 'maybe' }],
    settings: { physioTracking: true, physioSeries: { total: 8, start: day(0) }, leadChoices: { 'action:kiné / soins': { choice: 'kept', at: 1, gap: -1, days: 30 } } },
  })
  assert.ok(r)
  assert.deepEqual(r.entries[0]!.positiveActions, ['Séance de kiné', 'Exercices du kiné'])
  assert.equal(r.entries[0]!.physioExercises, 'part')
  assert.equal(r.entries[1]!.physioExercises, undefined)
  assert.equal(r.settings?.physioTracking, true)
  assert.deepEqual(r.settings?.physioSeries, { total: 8, start: day(0) })
  assert.deepEqual(Object.keys(r.settings?.leadChoices ?? {}), ['action:séance de kiné'])
  const bad = sanitizeBackup({ entries: [], settings: { physioSeries: { total: 0, start: day(0) } } })
  assert.equal(bad?.settings?.physioSeries, undefined)
})

test('a figure written with a decimal comma takes the plural of its value', async () => {
  const { format } = await import('../src/i18n/format.ts')
  assert.equal(format('{{n}} {{n:jour|jours}}', { n: '0,5' }, 'fr'), '0,5 jour')
  assert.equal(format('{{n}} {{n:jour|jours}}', { n: '8,5' }, 'fr'), '8,5 jours')
  assert.equal(format('{{n}} {{n:day|days}}', { n: '1.5' }, 'en'), '1.5 days')
})
