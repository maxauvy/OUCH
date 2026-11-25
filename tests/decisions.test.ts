// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry, Medication } from '../src/db/types.ts'
import { cleanDecisions, followDecisions, lastDecided } from '../src/lib/decisions.ts'
import { shiftISO } from '../src/lib/dates.ts'

const D = '2026-10-03'
const day = (n: number) => shiftISO(D, n)
const entry = (n: number, pain: number, extra: Partial<LoggedEntry> = {}): LoggedEntry => ({ date: day(n), painLevel: pain, createdAt: 0, updatedAt: 0, ...extra })
const med = { id: 'dulox', name: 'Duloxétine', settleDays: 7 } as unknown as Medication

test('decisions are cleaned: known kinds, details that fit the kind, four at most', () => {
  assert.equal(cleanDecisions('x'), undefined)
  assert.equal(cleanDecisions([]), undefined)
  assert.deepEqual(
    cleanDecisions([
      { kind: 'habit', text: '  Marcher   20 min ', action: 'Marche courte', perWeek: 3, medicationId: 'x' },
      { kind: 'treatment', text: 'Duloxétine 60 mg', medicationId: 'dulox', perWeek: 3 },
      { kind: 'nope', text: 'x' },
      { kind: 'other', text: '' },
      { kind: 'habit', text: '', action: 'Sieste', perWeek: 4 },
    ]),
    [
      { kind: 'habit', text: 'Marcher 20 min', action: 'Marche courte', perWeek: 3 },
      { kind: 'treatment', text: 'Duloxétine 60 mg', medicationId: 'dulox' },
      { kind: 'habit', text: 'Sieste', action: 'Sieste' },
    ]
  )
  assert.equal(cleanDecisions(Array.from({ length: 9 }, () => ({ kind: 'other', text: 'a' })))!.length, 4)
})

test('the last appointment with decisions, up to a day', () => {
  const past = [
    { date: '2026-09-01', kind: 'gp' as const, decisions: [{ kind: 'other' as const, text: 'a' }] },
    { date: '2026-10-03', kind: 'gp' as const, decisions: [{ kind: 'other' as const, text: 'b' }] },
    { date: '2026-11-20', kind: 'gp' as const },
  ]
  assert.equal(lastDecided(past, '2026-12-01')!.date, '2026-10-03')
  assert.equal(lastDecided(past, '2026-09-30')!.date, '2026-09-01')
  assert.equal(lastDecided(undefined, '2026-12-01'), null)
})

test('a treatment: 28 days before, 28 after its settling-in days, and the effects noted since', () => {
  const entries = [
    ...Array.from({ length: 28 }, (_, i) => entry(-28 + i, 6)),
    ...Array.from({ length: 50 }, (_, i) => entry(1 + i, i < 7 ? 6 : 4, i === 10 || i === 12 ? { intakes: [{ medicationId: 'dulox', sideEffects: ['Nausées'] }] } as Partial<LoggedEntry> : {})),
  ]
  const [f] = followDecisions([{ kind: 'treatment', text: 'Duloxétine 60 mg', medicationId: 'dulox' }], D, day(50), entries, [med])
  assert.equal(f!.kind, 'treatment')
  if (f!.kind !== 'treatment') return
  assert.equal(f.before!.mean, 6)
  assert.equal(f.after!.mean, 4)
  assert.equal(f.after!.n, 28)
  assert.equal(f.effectDays, 2)
  assert.deepEqual(f.effects, ['Nausées'])
})

test('too few days after: no mean is quoted', () => {
  const entries = [...Array.from({ length: 28 }, (_, i) => entry(-28 + i, 6)), entry(9, 4), entry(10, 4)]
  const [f] = followDecisions([{ kind: 'treatment', text: 'x', medicationId: 'dulox' }], D, day(11), entries, [med])
  assert.equal(f!.kind === 'treatment' && f!.after, null)
})

test('a habit: days noted against the times planned, pain with and without', () => {
  const entries = Array.from({ length: 21 }, (_, i) => entry(1 + i, i % 3 === 0 ? 3 : 5, i % 3 === 0 ? { positiveActions: ['marche courte'] } : {}))
  const [f] = followDecisions([{ kind: 'habit', text: 'Marcher', action: 'Marche courte', perWeek: 3 }], D, day(21), entries, [])
  assert.equal(f!.kind, 'habit')
  if (f!.kind !== 'habit') return
  assert.equal(f.done, 7)
  assert.equal(f.planned, 9)
  assert.equal(f.withMean, 3)
  assert.equal(f.withoutMean, 5)
})

test('an exam or anything else: the sentence only', () => {
  assert.deepEqual(followDecisions([{ kind: 'exam', text: 'Bilan thyroïdien' }], D, day(20), [], []), [{ kind: 'note', decision: { kind: 'exam', text: 'Bilan thyroïdien' } }])
})

test('a trial needs its action, and follows the first drawn trial of that action after the appointment', async () => {
  assert.equal(cleanDecisions([{ kind: 'trial', text: 'La chaleur' }]), undefined)
  assert.deepEqual(cleanDecisions([{ kind: 'trial', text: '', action: 'Chaleur', perWeek: 3 }]), [{ kind: 'trial', text: 'Chaleur', action: 'Chaleur' }])
  const plan = ['with', 'without', 'with', 'without', 'with', 'without', 'with', 'without', 'with', 'without'] as const
  const trial = { key: 'action:chaleur', action: 'Chaleur', start: day(1), end: day(10), plan: [...plan], byDoctor: true as const }
  const older = { key: 'action:chaleur', action: 'Chaleur', start: day(-30), end: day(-21), plan: [...plan] }
  const entries = Array.from({ length: 12 }, (_, i) => entry(1 + i, plan[i] === 'with' ? 3 : 5))
  const d = { kind: 'trial' as const, text: 'Chaleur', action: 'Chaleur' }
  const [notYet] = followDecisions([d], D, day(0), entries, [], [trial, older])
  assert.ok(notYet!.kind === 'trial' && notYet!.status === null && notYet!.trial === trial)
  const [running] = followDecisions([d], D, day(4), entries, [], [trial])
  assert.ok(running!.kind === 'trial' && running!.status!.over === false && running!.status!.day === 4)
  const [done] = followDecisions([d], D, day(12), entries, [], [trial])
  assert.ok(done!.kind === 'trial' && done!.status!.result!.with.mean === 3 && done!.status!.result!.without.mean === 5)
  const [none] = followDecisions([d], D, day(12), entries, [], [])
  assert.ok(none!.kind === 'trial' && none!.trial === null)
})
