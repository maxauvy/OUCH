// The sheet for a health professional who does not know the person (an
// emergency room, a new doctor): one page made of what the journal already
// holds, plus three things only the person can say (allergies, people to
// reach, a word). Nothing is guessed, and everything is a statement of what
// the person declared or noted, never an assessment.

import type { CareSheetContact, CareSheetInfo, DailyEntry, Medication, MedicationRegimen, MedicationPeriod } from '../db/types.ts'
import { cleanZones } from './bodyZones.ts'
import type { BodyZone } from '../db/types.ts'
import { shiftISO } from './dates.ts'
import { currentPeriod, isStopped } from './medications.ts'
import { loggedEntries } from './loggedEntries.ts'
import { quantile } from './stats.ts'
import type { Language } from '../i18n/language.ts'
import fr from '../i18n/locales/fr.ts'
import en from '../i18n/locales/en.ts'

const SUGGESTIONS: Record<Language, readonly string[]> = {
  fr: fr.entryForm.positiveActionsSuggestions,
  en: en.entryForm.positiveActionsSuggestions,
}

/** Suggestions that were worded differently before, as already stored in the journal, and the place of their current wording in the list. */
const RENAMED: Record<string, number> = { 'bain chaud': 6, 'warm bath': 6 }

/** A suggestion offered by the app is stored in the language it was picked in; shown in another language it is put in that one. What the person typed is kept as typed. */
export function helperIn(label: string, language: Language): string {
  const key = label.toLocaleLowerCase()
  const renamed = RENAMED[key]
  if (renamed !== undefined) return SUGGESTIONS[language][renamed] ?? label
  for (const list of Object.values(SUGGESTIONS)) {
    const i = list.findIndex((s) => s.toLocaleLowerCase() === key)
    if (i >= 0) return SUGGESTIONS[language][i] ?? label
  }
  return label
}

export const MAX_ALLERGIES = 8
export const MAX_ALLERGY_LENGTH = 60
export const MAX_CONTACTS = 3
export const MAX_CONTACT_LABEL = 60
export const MAX_PHONE = 30
export const MAX_NOTE = 280

/** The journal is read over this many days for the usual pain, the zones and what helped. */
export const WINDOW_DAYS = 90
/** Fewer logged days than this and the journal says nothing about what is usual. */
export const MIN_DAYS = 14
/** An action counts as "what helps" once it was noted on this many days. */
export const MIN_HELPED_DAYS = 3
/** A zone is listed when it was reported on at least this share of the logged days. */
export const MIN_ZONE_SHARE = 0.2

const oneLine = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max)

/** A number as typed: digits, spaces and the few signs a number carries. */
export function cleanPhone(s: string): string {
  return oneLine(s.replace(/[^\d+\s().-]/g, ''), MAX_PHONE)
}

/** Allergies: clean lines, no empty one, no repeat (case aside), a few at most. */
export function cleanAllergies(list: readonly string[]): string[] {
  const out: string[] = []
  for (const raw of list) {
    const line = oneLine(raw, MAX_ALLERGY_LENGTH)
    if (line && !out.some((o) => o.toLocaleLowerCase() === line.toLocaleLowerCase())) out.push(line)
  }
  return out.slice(0, MAX_ALLERGIES)
}

/** A contact needs a name or a link; a number alone says nothing to the reader. */
export function cleanContacts(list: readonly CareSheetContact[]): CareSheetContact[] {
  return list
    .flatMap((c): CareSheetContact[] => {
      const label = oneLine(c.label, MAX_CONTACT_LABEL)
      const phone = c.phone ? cleanPhone(c.phone) : ''
      return label ? [{ label, ...(phone ? { phone } : {}) }] : []
    })
    .slice(0, MAX_CONTACTS)
}

export function cleanNote(s: string): string {
  return s.trim().replace(/\r\n/g, '\n').slice(0, MAX_NOTE)
}

/** What the person typed, tidied; undefined when nothing is left, so an empty form leaves no trace. */
export function cleanCareSheet(info: { allergies?: readonly string[]; contacts?: readonly CareSheetContact[]; note?: string }): CareSheetInfo | undefined {
  const allergies = cleanAllergies(info.allergies ?? [])
  const contacts = cleanContacts(info.contacts ?? [])
  const note = cleanNote(info.note ?? '')
  if (!allergies.length && !contacts.length && !note) return undefined
  return { allergies, contacts, ...(note ? { note } : {}) }
}

/** Read from a backup file: anything that is not what the sheet holds is dropped. */
export function careSheetFromBackup(v: unknown): CareSheetInfo | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined
  const r = v as Record<string, unknown>
  const strs = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : [])
  const contacts = (Array.isArray(r.contacts) ? r.contacts : []).flatMap((c): CareSheetContact[] => {
    if (typeof c !== 'object' || c === null) return []
    const o = c as Record<string, unknown>
    return typeof o.label === 'string' ? [{ label: o.label, phone: typeof o.phone === 'string' ? o.phone : undefined }] : []
  })
  return cleanCareSheet({ allergies: strs(r.allergies), contacts, note: typeof r.note === 'string' ? r.note : undefined })
}

type Dated = Pick<DailyEntry, 'date' | 'painLevel' | 'painLocations' | 'positiveActions'>

function recent<T extends Dated>(entries: readonly T[], today: string): T[] {
  const from = shiftISO(today, -(WINDOW_DAYS - 1))
  return entries.filter((e) => e.date >= from && e.date <= today)
}

/** The pain the last 90 days were mostly at: the middle half of the logged days, rounded. Null under 14 logged days. */
export function usualPain(entries: readonly DailyEntry[], today: string): { low: number; high: number; days: number } | null {
  const levels = loggedEntries(recent(entries as DailyEntry[], today)).map((e) => e.painLevel)
  if (levels.length < MIN_DAYS) return null
  const low = Math.round(quantile(levels, 0.25))
  const high = Math.round(quantile(levels, 0.75))
  return { low, high, days: levels.length }
}

/** The zones reported most often over the last 90 days, at most three; none under 14 logged days. */
export function usualZones(entries: readonly DailyEntry[], today: string, max = 3): BodyZone[] {
  const days = loggedEntries(recent(entries as DailyEntry[], today))
  if (days.length < MIN_DAYS) return []
  const counts = new Map<BodyZone, number>()
  for (const e of days) for (const z of cleanZones(e.painLocations ?? [])) counts.set(z, (counts.get(z) ?? 0) + 1)
  return [...counts]
    .filter(([, n]) => n / days.length >= MIN_ZONE_SHARE)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([z]) => z)
}

/** What the person noted as having helped, on the most days of the last 90, at most three; kept as typed. */
export function usualHelpers(entries: readonly DailyEntry[], today: string, max = 3, language?: Language): string[] {
  const counts = new Map<string, { label: string; n: number }>()
  for (const e of recent(entries as DailyEntry[], today)) {
    for (const raw of new Set((e.positiveActions ?? []).map((a) => oneLine(a, 60)).filter(Boolean).map((a) => (language ? helperIn(a, language) : a)))) {
      const key = raw.toLocaleLowerCase()
      const cur = counts.get(key)
      counts.set(key, { label: cur?.label ?? raw, n: (cur?.n ?? 0) + 1 })
    }
  }
  return [...counts.values()]
    .filter((c) => c.n >= MIN_HELPED_DAYS)
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, max)
    .map((c) => c.label)
}

export interface CurrentMedication {
  name: string
  regimen: MedicationRegimen
  period: MedicationPeriod | undefined
  reason?: string
}

/** The treatments not stopped: those taken on a schedule first, then those taken when needed. */
export function currentMedications(meds: readonly Medication[]): CurrentMedication[] {
  const rank = (r: MedicationRegimen) => (r === 'scheduled' ? 0 : r === 'asNeeded' ? 2 : 1)
  return meds
    .filter((m) => !isStopped(m))
    .map((m) => ({ name: m.name, regimen: m.regimen, period: currentPeriod(m), ...(m.reason ? { reason: m.reason } : {}) }))
    .sort((a, b) => rank(a.regimen) - rank(b.regimen) || a.name.localeCompare(b.name))
}

export interface NotedEffects {
  name: string
  effects: string[]
  /** The person stopped it and said it was for its side effects. */
  stoppedForEffects: boolean
}

/** The side effects the person noted with a treatment, and the treatments they stopped for that reason: what was written, not a verdict on the treatment. */
export function notedEffects(meds: readonly Medication[], entries: readonly Pick<DailyEntry, 'intakes'>[], maxMeds = 5, maxEffects = 3): NotedEffects[] {
  const byId = new Map<string, Map<string, string>>()
  for (const e of entries) {
    for (const intake of e.intakes ?? []) {
      for (const raw of intake.sideEffects ?? []) {
        const text = oneLine(raw, 60)
        if (!text) continue
        const m = byId.get(intake.medicationId) ?? new Map<string, string>()
        if (!m.has(text.toLocaleLowerCase())) m.set(text.toLocaleLowerCase(), text)
        byId.set(intake.medicationId, m)
      }
    }
  }
  const out: NotedEffects[] = []
  for (const med of meds) {
    const effects = [...(byId.get(med.id)?.values() ?? [])].slice(0, maxEffects)
    const stoppedForEffects = med.periods.some((p) => p.stopReason === 'sideEffects')
    if (effects.length || stoppedForEffects) out.push({ name: med.name, effects, stoppedForEffects })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name)).slice(0, maxMeds)
}

/** A pain range as a short text: "5" when the middle half sits on one level, "4 à 5" otherwise (the word comes from the language). */
export function painRange(p: { low: number; high: number }, to: string): string {
  return p.low === p.high ? String(p.low) : `${p.low} ${to} ${p.high}`
}

/** Whole years between a birth date and a day; null when the date is missing or in the future. */
export function ageOn(birthDate: string | undefined, today: string): number | null {
  if (!birthDate || birthDate > today) return null
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}

/** Everything the journal gives the sheet, as data: the words around it come from the language of the sheet. */
export function careSheetData(input: { entries: readonly DailyEntry[]; medications: readonly Medication[]; today: string; language?: Language }) {
  const { entries, medications, today, language } = input
  return {
    pain: usualPain(entries, today),
    zones: usualZones(entries, today),
    helpers: usualHelpers(entries, today, 3, language),
    treatments: currentMedications(medications),
    effects: notedEffects(medications, entries),
  }
}
export type CareSheetData = ReturnType<typeof careSheetData>
