// « Les mots de ma douleur »: what the pain feels like, in a few everyday
// words the person picks. Our own palette, in our own order: not the list,
// the order, the questions nor the scales of the DN4, the NPSI, the McGill or
// the QDSA (whose rights belong to others), and never a score or a threshold.
// The report and Trends count days, like the other indicators.
//
// The usual words come back each day: one tap says « as usual » and writes
// them for the day (before there are enough days, « same as last time »); « different » opens the palette. So every day keeps its
// own words, and days of flare can be told from the others.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry } from '../db/types.ts'
import { shiftISO } from './dates.ts'

/** The palette, as stable identifiers; the words themselves come from the translation. */
export const PAIN_WORDS = ['burning', 'shocks', 'shooting', 'tingling', 'numbness', 'tightness', 'crushing', 'pulling', 'cramps', 'throbbing', 'dull', 'tender'] as const
export type PainWord = (typeof PAIN_WORDS)[number]

/** At most this many words a day: enough to say it, few enough to choose. */
export const MAX_WORDS = 3
/** A word typed by the person is kept to this length. */
export const MAX_TYPED = 40
/** The usual words are read over these days before today… */
export const USUAL_WINDOW = 28
/** …once this many of them carry words… */
export const USUAL_MIN_DAYS = 3
/** …and are the ones chosen on at least this share of those days. */
export const USUAL_SHARE = 0.4

export const isPaletteWord = (w: string): w is PainWord => (PAIN_WORDS as readonly string[]).includes(w)

/** The day's words, tidied: a palette word as is, a typed word trimmed and kept as typed, no repeat (case aside), three at most. */
export function cleanPainWords(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: string[] = []
  for (const w of raw) {
    if (typeof w !== 'string') continue
    const word = isPaletteWord(w) ? w : w.replace(/\s+/g, ' ').trim().slice(0, MAX_TYPED)
    if (word && !out.some((o) => o.toLocaleLowerCase() === word.toLocaleLowerCase())) out.push(word)
  }
  return out.slice(0, MAX_WORDS)
}

/** The same words, whatever their order. */
export const sameWords = (a: readonly string[] | undefined, b: readonly string[]) => !!a && a.length === b.length && b.every((w) => a.includes(w))

/** The words chosen on most of the recent days with words, before `today`: what « as usual » writes. Empty when there are too few days to say. */
export function usualWords(entries: readonly Pick<DailyEntry, 'date' | 'painWords'>[], today: string): string[] {
  const from = shiftISO(today, -USUAL_WINDOW)
  const days = entries.filter((e) => e.date >= from && e.date < today && e.painWords && e.painWords.length > 0)
  if (days.length < USUAL_MIN_DAYS) return []
  const counts = new Map<string, number>()
  for (const e of days) for (const w of new Set(e.painWords)) counts.set(w, (counts.get(w) ?? 0) + 1)
  return [...counts]
    .filter(([, n]) => n / days.length >= USUAL_SHARE)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_WORDS)
    .map(([w]) => w)
}

export interface PainWordsSummary {
  /** Days with at least one word. */
  noted: number
  /** Each word chosen, the most often first, with the days and the flare days among them. */
  words: { word: string; days: number; flareDays: number }[]
}

/** The words counted in days, and on how many of those days a flare was under way. No score. */
export function summarizePainWords(entries: readonly Pick<DailyEntry, 'date' | 'painWords'>[], flareDays: ReadonlySet<string> = new Set()): PainWordsSummary {
  const days = entries.filter((e) => e.painWords && e.painWords.length > 0)
  const counts = new Map<string, { days: number; flareDays: number }>()
  for (const e of days) {
    for (const w of new Set(e.painWords)) {
      const c = counts.get(w) ?? { days: 0, flareDays: 0 }
      c.days++
      if (flareDays.has(e.date)) c.flareDays++
      counts.set(w, c)
    }
  }
  return {
    noted: days.length,
    words: [...counts].map(([word, c]) => ({ word, ...c })).sort((a, b) => b.days - a.days || a.word.localeCompare(b.word)),
  }
}

/** The words of the most recent day with words, in the same weeks before `today`: what « same as last time » writes. Empty when there is none. */
export function lastWords(entries: readonly Pick<DailyEntry, 'date' | 'painWords'>[], today: string): string[] {
  const from = shiftISO(today, -USUAL_WINDOW)
  let last: Pick<DailyEntry, 'date' | 'painWords'> | undefined
  for (const e of entries) if (e.date >= from && e.date < today && e.painWords?.length && (!last || e.date > last.date)) last = e
  return last ? [...last.painWords!] : []
}

/** What the card offers in one tap: the usual words once there are enough days, the last day's words before that, nothing on the very first time. */
export function wordsToOffer(entries: readonly Pick<DailyEntry, 'date' | 'painWords'>[], today: string): { words: string[]; kind: 'usual' | 'last' } | null {
  const usual = usualWords(entries, today)
  if (usual.length) return { words: usual, kind: 'usual' }
  const last = lastWords(entries, today)
  return last.length ? { words: last, kind: 'last' } : null
}
