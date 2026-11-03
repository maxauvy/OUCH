// A prescription's length, given by the person (after an appointment): from
// its date, for so many months, and a reminder some days before the end. Not
// worked out from the doses logged (a missed entry would throw it off) and
// not a stock count: it only says when to ask for a new one.

import type { Prescription, Settings } from '../db/types.ts'
import { daysBetween, shiftISO } from './dates.ts'

export const DURATION_MONTHS = [1, 3, 6] as const
export const MAX_MONTHS = 24
export const REMIND_DAYS = [7, 14] as const
export const DEFAULT_REMIND_DAYS = 7
export const MAX_LABEL_LENGTH = 60
/** The card stays this many days after the end, for someone who has not renewed yet. */
export const AFTER_END_DAYS = 14
/** "Remind me later" on the card waits this long. */
export const SNOOZE_DAYS = 3

/** A date moved by whole months; a day that does not exist in the target month (31 January + 1 month) lands on its last day. */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const index = y * 12 + (m - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

/** The last day the prescription covers: its start plus its length. */
export function prescriptionEnd(p: Prescription): string {
  return addMonthsISO(p.start, p.months)
}

/** The day the card starts to appear. */
export function reminderDay(p: Prescription): string {
  return shiftISO(prescriptionEnd(p), -p.remindDays)
}

export type PrescriptionCardKind = 'soon' | 'ended'

/** Which card the day's page shows, if any: from the reminder day until the end ("soon"), then for two weeks after it ("ended"). Closing it hides it for that prescription; "later" hides it for a few days. */
export function prescriptionCard(
  settings: Pick<Settings, 'prescription' | 'prescriptionCardState'>,
  today: string
): PrescriptionCardKind | null {
  const p = settings.prescription
  if (!p) return null
  const end = prescriptionEnd(p)
  if (today < reminderDay(p) || daysBetween(end, today) > AFTER_END_DAYS) return null
  const state = settings.prescriptionCardState
  if (state && state.start === p.start) {
    if (state.closed) return null
    if (state.snoozeUntil && today < state.snoozeUntil) return null
  }
  return today < end ? 'soon' : 'ended'
}

export function closeCard(p: Prescription): NonNullable<Settings['prescriptionCardState']> {
  return { start: p.start, closed: true }
}

export function snoozeCard(p: Prescription, today: string): NonNullable<Settings['prescriptionCardState']> {
  return { start: p.start, snoozeUntil: shiftISO(today, SNOOZE_DAYS) }
}

/** What the person typed, made valid: whole months from 1 to the maximum, a known delay, a short label. */
export function makePrescription(start: string, months: number, remindDays: number, label?: string): Prescription | null {
  if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) return null
  const clean = label?.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LENGTH)
  const p: Prescription = { start, months, remindDays: remindDays === 14 ? 14 : DEFAULT_REMIND_DAYS }
  return clean ? { ...p, label: clean } : p
}

/** What the sheets hold while the person fills them in. */
export interface PrescriptionDraft {
  /** Null until a length is chosen: nothing is noted before that. */
  months: number | null
  start: string
  remindDays: 7 | 14
  label: string
}

/** The draft as a prescription, or null while no valid length is chosen. */
export function draftPrescription(d: PrescriptionDraft): Prescription | null {
  return d.months === null ? null : makePrescription(d.start, d.months, d.remindDays, d.label)
}
