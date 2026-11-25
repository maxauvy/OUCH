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
    const done = format(t.habitDone, { done: f.done, action: f.decision.action ?? f.decision.text }, language) + (f.planned ? format(t.habitPlanned, { planned: f.planned }, language) : '') + '.'
    const pain = f.withMean !== null && f.withoutMean !== null ? [format(t.habitPain, { with: num(f.withMean), without: num(f.withoutMean) }, language)] : []
    return [done, ...pain]
  }
  return []
}
