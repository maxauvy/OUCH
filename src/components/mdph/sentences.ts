// The sentences offered for the boxes of the request form: each part is said
// only when the journal holds it, in the person's own voice, to be pasted and
// changed. Kept out of the components so the page and tests share them.

import type { Translations } from '../../i18n/types'
import { format } from '../../i18n/format'
import { enough, type MdphData, type MdphMonth } from '../../lib/mdph'

/** For part B3, « Autres renseignements importants ». */
export function b3Sentence(data: MdphData, t: Translations['mdph'], language: string, from: string): string {
  const s = t.s
  const parts = [format(s.journal, { from, logged: data.logged, span: data.span }, language)]
  const lengths = data.flares.map((f) => f.days)
  if (lengths.length === 1) parts.push(format(s.flaresOne, { days: lengths[0]! }, language))
  if (lengths.length > 1) parts.push(format(s.flaresMany, { n: lengths.length, min: Math.min(...lengths), max: Math.max(...lengths), total: data.flareDayCount }, language))
  if (data.strong.days > 0) parts.push(format(s.strong, { n: data.strong.days }, language))
  if (enough(data.interference) && data.interference.days > 0) parts.push(format(s.interference, { n: data.interference.days }, language))
  if (enough(data.nights) && data.nights.days > 0) parts.push(format(s.nights, { n: data.nights.days }, language))
  if (enough(data.stiffness) && data.stiffness.days > 0) parts.push(format(s.stiffness, { n: data.stiffness.days }, language))
  if (data.restDays > 0) parts.push(format(s.rest, { n: data.restDays }, language))
  return parts.join(' ')
}

/** For part D1, « Quelles sont les difficultés liées à votre handicap ? »: what the journal knows, and a place for what it cannot. */
export function d1Sentence(data: MdphData, t: Translations['mdph'], language: string): string {
  const s = t.s
  const first = data.flares.length
    ? format(s.d1Flares, { total: data.flareDayCount, max: Math.max(...data.flares.map((f) => f.days)) }, language)
    : format(s.d1Strong, { n: data.strong.days, logged: data.logged }, language)
  return `${first} ${s.d1Todo}`
}

/** « Jan. », with the year when the months shown run over two years. */
export function monthLabeller(months: readonly MdphMonth[], intl: string) {
  const twoYears = months.length > 0 && months[0]!.month.slice(0, 4) !== months.at(-1)!.month.slice(0, 4)
  return (m: MdphMonth) => new Date(`${m.month}-15T12:00:00`).toLocaleDateString(intl, { month: 'short', ...(twoYears ? { year: '2-digit' } : {}) })
}

