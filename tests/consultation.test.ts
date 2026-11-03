// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addQuestion, agendaLines, consultationCard, finishConsultation, MAX_QUESTIONS, newConsultation, removeQuestion, reportStart, sinceFacts, sinceLast, withGoal,
} from '../src/lib/consultation.ts'
import { sanitizeSettings } from '../src/lib/backupSanitize.ts'
import { DEFAULT_SETTINGS } from '../src/db/types.ts'
import type { Settings } from '../src/db/types.ts'

const withC = (date: string, extra: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, consultation: newConsultation(date), ...extra })

test('no appointment: no card', () => {
  assert.equal(consultationCard(DEFAULT_SETTINGS, '2026-11-03'), null)
})

test('the card comes 14 days before, and not earlier', () => {
  assert.equal(consultationCard(withC('2026-11-17'), '2026-11-02'), null)
  assert.equal(consultationCard(withC('2026-11-17'), '2026-11-03'), 'soon')
  assert.equal(consultationCard(withC('2026-11-17'), '2026-11-16'), 'soon')
})

test('from the day itself the card asks for a note, for 14 days, then stops', () => {
  assert.equal(consultationCard(withC('2026-11-17'), '2026-11-17'), 'after')
  assert.equal(consultationCard(withC('2026-11-17'), '2026-12-01'), 'after')
  assert.equal(consultationCard(withC('2026-11-17'), '2026-12-02'), null)
})

test('closing a card hides that stage only, for that appointment only', () => {
  const closed = withC('2026-11-17', { consultationCardClosed: { date: '2026-11-17', kind: 'soon' } })
  assert.equal(consultationCard(closed, '2026-11-10'), null)
  assert.equal(consultationCard(closed, '2026-11-17'), 'after')
  const other = withC('2026-12-20', { consultationCardClosed: { date: '2026-11-17', kind: 'soon' } })
  assert.equal(consultationCard(other, '2026-12-10'), 'soon')
})

test('questions are trimmed, deduplicated, capped, and can be removed', () => {
  let c = newConsultation('2026-11-17')
  c = addQuestion(c, '  La dose   peut monter ? ')
  c = addQuestion(c, 'La dose peut monter ?')
  c = addQuestion(c, '   ')
  assert.deepEqual(c.questions, ['La dose peut monter ?'])
  for (let i = 0; i < MAX_QUESTIONS + 5; i++) c = addQuestion(c, `Question ${i}`)
  assert.equal(c.questions.length, MAX_QUESTIONS)
  assert.deepEqual(removeQuestion({ date: 'x', questions: ['a', 'b', 'c'] }, 1).questions, ['a', 'c'])
})

test('the goal is one clean line, and a blank one removes it', () => {
  const c = withGoal(newConsultation('2026-11-17'), '  Reprendre   la marche ')
  assert.equal(c.goal, 'Reprendre la marche')
  assert.equal('goal' in withGoal(c, '  '), false)
})

test('after the appointment it becomes the last one, with the note, and nothing is planned', () => {
  const s = withC('2026-11-17', { consultationCardClosed: { date: '2026-11-17', kind: 'after' } })
  const patch = finishConsultation(s, '  Dose à 60 mg  ')
  assert.deepEqual(patch.lastConsultation, { date: '2026-11-17', notes: 'Dose à 60 mg' })
  assert.equal(patch.consultation, undefined)
  assert.equal('consultation' in patch, true)
  assert.deepEqual(finishConsultation(s, '  ').lastConsultation, { date: '2026-11-17' })
  assert.deepEqual(finishConsultation(DEFAULT_SETTINGS, 'x'), {})
})

test('the report agenda holds the questions, then the goal', () => {
  const c = withGoal({ date: '2026-11-17', questions: ['A ?', 'B ?'] }, 'Marcher')
  assert.deepEqual(agendaLines(c, 'Objectif :'), ['A ?', 'B ?', 'Objectif : Marcher'])
  assert.deepEqual(agendaLines(undefined, 'Objectif :'), [])
})

test('the report starts at the last appointment, else at the fallback', () => {
  assert.equal(reportStart({ lastConsultation: { date: '2026-09-03' } }, '2026-11-03', '2026-08-05'), '2026-09-03')
  assert.equal(reportStart({}, '2026-11-03', '2026-08-05'), '2026-08-05')
  assert.equal(reportStart({ lastConsultation: { date: '2027-01-01' } }, '2026-11-03', '2026-08-05'), '2026-08-05')
})

test('a backup brings the appointment back clean, and ignores what is not valid', () => {
  const s = sanitizeSettings({
    consultation: { date: '2026-11-17', questions: ['  A  ?', 3, '', 'B'], goal: ' x ', evil: 1 },
    lastConsultation: { date: '2026-09-03', notes: ' n ' },
  })
  assert.deepEqual(s?.consultation, { date: '2026-11-17', questions: ['A ?', 'B'], goal: 'x' })
  assert.deepEqual(s?.lastConsultation, { date: '2026-09-03', notes: 'n' })
  const bad = sanitizeSettings({ consultation: { date: '2026-13-40', questions: ['A'] }, lastConsultation: 'nope' })
  assert.equal(bad?.consultation, undefined)
  assert.equal(bad?.lastConsultation, undefined)
})

test('since the last appointment: two means, the stretch before as long as the one since', () => {
  const day = (n: number, pain: number) => ({ date: `2026-10-${String(n).padStart(2, '0')}`, painLevel: pain })
  const entries = [day(1, 6), day(2, 6), day(3, 6), day(11, 4), day(12, 4), day(13, 4), day(14, 4)]
  // last appointment on the 10th, today the 20th: 10 days since, the 10 days before it
  const r = sinceLast(entries, '2026-10-10', '2026-10-20')
  assert.deepEqual(r, { now: 4, before: 6 })
})

test('since the last appointment: too few days, nothing is quoted', () => {
  const entries = [{ date: '2026-10-11', painLevel: 4 }, { date: '2026-10-12', painLevel: 4 }]
  assert.equal(sinceLast(entries, '2026-10-10', '2026-10-20'), null)
  const three = [...entries, { date: '2026-10-13', painLevel: 4 }]
  assert.deepEqual(sinceLast(three, '2026-10-10', '2026-10-20'), { now: 4, before: null })
  assert.equal(sinceLast(three, '2026-10-20', '2026-10-20'), null)
})

test('since the last appointment: the flares and marked periods that touch it, the treatment events inside it', () => {
  const flare = (start: string, end: string) => ({ start, end }) as never
  const marked = (start: string, last: string) => ({ start, last }) as never
  const event = (date: string) => ({ date }) as never
  const r = sinceFacts({
    from: '2026-10-01',
    to: '2026-11-03',
    flares: [flare('2026-09-25', '2026-09-30'), flare('2026-09-29', '2026-10-02'), flare('2026-10-16', '2026-10-20')],
    marked: [marked('2026-10-30', '2026-11-02'), marked('2026-08-01', '2026-08-03')],
    events: [event('2026-09-30'), event('2026-10-03'), event('2026-11-03'), event('2026-11-04')],
  })
  assert.deepEqual([r.detected, r.marked, r.treatments.length], [2, 1, 2])
})
