import { format as formatDate } from 'date-fns'
import type { DailyEntry, PhysioExercisesAnswer, Settings } from '../../db/types'
import { PHYSIO_EXERCISES_ANSWERS } from '../../db/types'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { shiftISO } from '../../lib/dates'
import { exercisesDone, exercisesPart, isExercisesLabel, runningExercises } from '../../lib/physio'
import { Card, SectionTitle } from '../ui/Card'
import { Chip } from '../ui/Chip'

const EMPTY = 'var(--chip-bg, var(--color-surface-raised))'

/**
 * « Tes exercices du kiné », in the day's form while exercises given by the physio run: done, in part, or not today. Done and in part also put
 * the exercises among the day's actions (what the follow-up counts); taking the answer back takes them off. The week is shown in soft cells,
 * with no streak and no colour for a day without.
 */
export function PhysioExercisesCard({ date, local, setField, settings, allEntries }: { date: string; local: Partial<DailyEntry>; setField: <K extends keyof DailyEntry>(key: K, value: DailyEntry[K]) => void; settings: Settings; allEntries: readonly DailyEntry[] }) {
  const t = useTranslation().physio
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const running = runningExercises(settings.pastConsultations, date)
  if (!running || running.date >= date) return null
  const label = running.decision.action!
  const actions = local.positiveActions ?? []
  const answer: PhysioExercisesAnswer | undefined = local.physioExercises ?? (exercisesDone(local) ? 'done' : undefined)

  const choose = (v: PhysioExercisesAnswer) => {
    const next = answer === v ? undefined : v
    const without = actions.filter((a) => !isExercisesLabel(a))
    setField('physioExercises', next)
    setField('positiveActions', next === 'done' || next === 'part' ? [...without, label] : without)
  }

  // The week of the day, Monday to Sunday.
  const dow = (new Date(date + 'T00:00:00').getDay() + 6) % 7
  const week = Array.from({ length: 7 }, (_, i) => shiftISO(date, i - dow))
  const byDate = new Map(allEntries.map((e) => [e.date, e]))
  const state = (d: string): 'on' | 'half' | 'none' | 'future' => {
    if (d > date) return 'future'
    const e = d === date ? { ...byDate.get(d), ...local, positiveActions: actions } : byDate.get(d)
    if (!e || !exercisesDone(e)) return 'none'
    return exercisesPart(e) ? 'half' : 'on'
  }
  const states = week.map(state)
  const full = states.filter((s) => s === 'on').length
  const half = states.filter((s) => s === 'half').length

  return (
    <Card className="!p-4">
      <SectionTitle>{t.cardTitle}</SectionTitle>
      <p className="text-caption -mt-2 mb-3" style={{ color: 'var(--color-ink-muted)' }}>
        {running.decision.perWeek ? format(t.cardPlan, { text: running.decision.text, n: running.decision.perWeek }, language) : running.decision.text}
      </p>
      <div role="group" aria-label={t.cardTitle} className="flex flex-wrap gap-2">
        {PHYSIO_EXERCISES_ANSWERS.map((v) => (
          <Chip key={v} label={t.answers[v]} selected={answer === v} onClick={() => choose(v)} />
        ))}
      </div>
      <div className="flex gap-1.5 mt-3" aria-hidden>
        {week.map((d, i) => {
          const s = states[i]
          return (
            <span key={d} className="flex-1 flex flex-col items-center gap-1">
              <span
                className="w-full h-6 rounded-[8px]"
                style={{
                  background: s === 'on' ? 'var(--color-brand)' : s === 'half' ? `linear-gradient(90deg, var(--color-brand) 50%, ${EMPTY} 50%)` : s === 'future' ? 'transparent' : EMPTY,
                  boxShadow: s === 'future' ? 'inset 0 0 0 1.5px var(--color-hairline)' : undefined,
                }}
              />
              <span className="text-[11px]" style={{ color: 'var(--color-ink-muted)', fontWeight: d === date ? 700 : 400 }}>
                {formatDate(new Date(d + 'T00:00:00'), 'EEEEE', { locale: dateFnsLocale })}
              </span>
            </span>
          )
        })}
      </div>
      <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
        {format(t.cardWeek, { done: full }, language)}
        {half ? format(t.cardWeekPart, { n: half }, language) : ''}. {t.cardNote}
      </p>
    </Card>
  )
}
