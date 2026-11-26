import type { Translations } from '../../i18n/types'
import { format } from '../../i18n/format'
import type { DecisionFollow } from '../../lib/decisions'

/** The sentences that follow a decision, in the app and in the report: counted, never judged. Nothing for a decision with nothing to count. */
export function followLines(f: DecisionFollow, t: Translations['decisions'], language: string, num: (v: number) => string): string[] {
  if (f.kind === 'treatment') {
    const name = f.name ?? f.decision.text
    const main = !f.before
      ? t.treatmentNoBefore
      : !f.after
        ? format(t.treatmentWait, { settle: f.settleDays }, language)
        : format(t.treatment, { name, before: num(f.before.mean), after: num(f.after.mean), n: f.after.n, settle: f.settleDays }, language)
    const effects = f.effectDays ? format(t.effects, { n: f.effectDays, list: f.effects.join(', ').toLocaleLowerCase(language) }, language) : t.noEffects
    return [main, effects]
  }
  if (f.kind === 'habit') {
    // A day of physio exercises done in part counts as half: the figure then has a decimal, and the sentence says how many were in part.
    const done =
      format(t.habitDone, { done: Number.isInteger(f.done) ? f.done : num(f.done), action: f.decision.action ?? f.decision.text }, language) +
      (f.planned ? format(t.habitPlanned, { planned: f.planned }, language) : '') +
      (f.part ? format(t.habitPartial, { n: f.part }, language) : '') +
      '.'
    const pain = f.withMean !== null && f.withoutMean !== null ? [format(t.habitPain, { with: num(f.withMean), without: num(f.withoutMean) }, language)] : []
    return [done, ...pain]
  }
  if (f.kind === 'trial') {
    if (!f.status) return [t.trialNotStarted]
    if (!f.status.over) return [format(t.trialRunning, { day: f.status.day, length: f.status.length }, language)]
    const r = f.status.result
    if (!r) return [t.trialTooFew]
    return [
      format(t.trialResult, { with: num(r.with.mean), nWith: r.with.n, without: num(r.without.mean), nWithout: r.without.n }, language),
      ...(r.next ? [format(t.trialNext, { with: num(r.next.with.mean), without: num(r.next.without.mean) }, language)] : []),
    ]
  }
  return []
}
