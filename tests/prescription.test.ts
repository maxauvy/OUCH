// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addMonthsISO, closeCard, makePrescription, prescriptionCard, prescriptionEnd, reminderDay, snoozeCard } from '../src/lib/prescription.ts'
import { sanitizeSettings } from '../src/lib/backupSanitize.ts'
import type { Prescription, Settings } from '../src/db/types.ts'

const rx = (start: string, months: number, remindDays: 7 | 14 = 7): Prescription => ({ start, months, remindDays })
const card = (p: Prescription | undefined, today: string, state?: Settings['prescriptionCardState']) => prescriptionCard({ prescription: p, prescriptionCardState: state }, today)

test('months are added by the calendar, a short month lands on its last day', () => {
  assert.equal(addMonthsISO('2026-11-02', 1), '2026-12-02')
  assert.equal(addMonthsISO('2026-11-02', 3), '2027-02-02')
  assert.equal(addMonthsISO('2026-11-30', 3), '2027-02-28')
  assert.equal(addMonthsISO('2027-11-30', 3), '2028-02-29')
  assert.equal(addMonthsISO('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonthsISO('2026-11-02', 14), '2028-01-02')
})

test('the end and the reminder day follow the prescription', () => {
  assert.equal(prescriptionEnd(rx('2026-11-02', 3)), '2027-02-02')
  assert.equal(reminderDay(rx('2026-11-02', 3)), '2027-01-26')
  assert.equal(reminderDay(rx('2026-11-02', 3, 14)), '2027-01-19')
})

test('no prescription: no card; before the reminder: none', () => {
  assert.equal(card(undefined, '2027-01-26'), null)
  assert.equal(card(rx('2026-11-02', 3), '2027-01-25'), null)
})

test('from the reminder day to the end the card says it is ending', () => {
  assert.equal(card(rx('2026-11-02', 3), '2027-01-26'), 'soon')
  assert.equal(card(rx('2026-11-02', 3), '2027-02-01'), 'soon')
})

test('from the end day on it says it has ended, for 14 days, then stops', () => {
  assert.equal(card(rx('2026-11-02', 3), '2027-02-02'), 'ended')
  assert.equal(card(rx('2026-11-02', 3), '2027-02-16'), 'ended')
  assert.equal(card(rx('2026-11-02', 3), '2027-02-17'), null)
})

test('closing hides it for that prescription only; a new one brings it back', () => {
  const p = rx('2026-11-02', 3)
  assert.equal(card(p, '2027-01-28', closeCard(p)), null)
  assert.equal(card(rx('2027-01-28', 1), '2027-02-22', closeCard(p)), 'soon')
})

test('"later" hides it for three days only', () => {
  const p = rx('2026-11-02', 3)
  const state = snoozeCard(p, '2027-01-26')
  assert.equal(card(p, '2027-01-28', state), null)
  assert.equal(card(p, '2027-01-29', state), 'soon')
})

test('what is typed is made valid', () => {
  assert.equal(makePrescription('2026-11-02', 0, 7), null)
  assert.equal(makePrescription('2026-11-02', 25, 7), null)
  assert.equal(makePrescription('2026-11-02', 1.5, 7), null)
  assert.deepEqual(makePrescription('2026-11-02', 3, 9), { start: '2026-11-02', months: 3, remindDays: 7 })
  assert.deepEqual(makePrescription('2026-11-02', 3, 14, '  Traitement   de fond '), { start: '2026-11-02', months: 3, remindDays: 14, label: 'Traitement de fond' })
})

test('a backup brings the prescription back clean, and ignores one that is not valid', () => {
  const ok = sanitizeSettings({ prescription: { start: '2026-11-02', months: 3, remindDays: 14, label: ' x ', evil: 1 } })
  assert.deepEqual(ok?.prescription, { start: '2026-11-02', months: 3, remindDays: 14, label: 'x' })
  assert.equal(sanitizeSettings({ prescription: { start: '2026-13-02', months: 3, remindDays: 7 } })?.prescription, undefined)
  assert.equal(sanitizeSettings({ prescription: { start: '2026-11-02', months: 99, remindDays: 7 } })?.prescription, undefined)
  assert.equal(sanitizeSettings({ prescription: 'x' })?.prescription, undefined)
})

test('a draft is a prescription only once a valid length is chosen', async () => {
  const { draftPrescription } = await import('../src/lib/prescription.ts')
  const base = { start: '2026-11-02', remindDays: 7 as const, label: '' }
  assert.equal(draftPrescription({ ...base, months: null }), null)
  assert.equal(draftPrescription({ ...base, months: 40 }), null)
  assert.deepEqual(draftPrescription({ ...base, months: 3 }), { start: '2026-11-02', months: 3, remindDays: 7 })
})
