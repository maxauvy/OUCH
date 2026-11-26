import { useEffect, useRef } from 'react'
import { format as formatDate } from 'date-fns'
import { IconArrowLeft, IconChevronRight } from '@tabler/icons-react'
import { useAllEntries, useLoggedEntries } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { format, useLanguage, useLocale, useTranslation } from '../i18n'
import { shiftISO, todayISO } from '../lib/dates'
import { colorForPainValue } from '../lib/painWeather'
import { aroundSessions, countExercises, medianPain, runningExercises, sessionDates, sinceLastSession } from '../lib/physio'
import { Card, SectionTitle } from '../components/ui/Card'
import { kindOf } from '../lib/consultation'

const EMPTY = 'var(--chip-bg, var(--color-surface-raised))'

/** A day's pain in a square of its weather colour, the figure inside; the session day is ringed. */
function Cell({ v, size = 32, ring = false }: { v?: number; size?: number; ring?: boolean }) {
  return (
    <span
      className="rounded-[9px] flex items-center justify-center text-caption font-bold tabular-nums shrink-0"
      style={{
        width: size,
        height: size,
        background: v === undefined ? EMPTY : colorForPainValue(v),
        // The light weathers take dark figures, the dark ones light figures, in both themes (the squares keep their colours).
        color: v !== undefined && v >= 6 ? '#ffffff' : v === undefined ? 'var(--color-ink-muted)' : '#1f1d44',
        boxShadow: ring ? '0 0 0 2px var(--color-surface), 0 0 0 3.5px var(--color-ink)' : undefined,
      }}
    >
      {v ?? '–'}
    </span>
  )
}

/**
 * « Pour ton kiné »: a screen to show at the start of a session. Since the session before: the pain day by day, the exercises done against
 * those planned, the pain around the last sessions, and what the person wants to say. Nothing is sent, nothing is read into the figures.
 */
export function PhysioPage({ onBack }: { onBack: () => void }) {
  const i18n = useTranslation()
  const t = i18n.physio
  const language = useLanguage()
  const { dateFnsLocale, intlLocale } = useLocale()
  const settings = useSettings()
  const all = useAllEntries() ?? []
  const logged = useLoggedEntries() ?? []
  const today = todayISO()
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  const day = (iso: string, f: string) => formatDate(new Date(iso + 'T00:00:00'), f, { locale: dateFnsLocale })
  const nf = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 })
  const sessions = sessionDates(all, settings.pastConsultations, today)
  const { from, session } = sinceLastSession(sessions, today)
  const days = Array.from({ length: Math.round((Date.parse(today) - Date.parse(from)) / 86_400_000) + 1 }, (_, i) => shiftISO(from, i)).slice(-8)
  const pain = new Map(logged.map((e) => [e.date, e.painLevel]))
  const median = medianPain(logged, from, today)
  const running = runningExercises(settings.pastConsultations, today)
  const exFrom = running ? (running.date >= from ? shiftISO(running.date, 1) : from) : from
  const count = running && exFrom <= today ? countExercises(all, exFrom, today, undefined) : null
  // Planned over the days covered, from the times a week (rounded to the day).
  const planned = running?.decision.perWeek && count ? Math.round((running.decision.perWeek * (Math.round((Date.parse(today) - Date.parse(exFrom)) / 86_400_000) + 1)) / 7) : null
  const around = aroundSessions(all, sessions, today)
  const c = settings.consultation
  const questions = c && kindOf(c) === 'kine' ? c.questions : []

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <div className="flex items-center gap-2 -ml-2">
        <button type="button" onClick={onBack} aria-label={i18n.mdph.back} className="w-11 h-11 rounded-[var(--radius-control)] flex items-center justify-center shrink-0" style={{ color: 'var(--color-brand)' }}>
          <IconArrowLeft size={22} aria-hidden />
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="text-title font-semibold outline-none">
          {t.screenButton}
        </h1>
      </div>
      <p className="text-body px-1 -mt-2" style={{ color: 'var(--color-ink-muted)' }}>
        {session ? format(t.screenSince, { date: day(session, 'EEEE d MMMM') }, language) : t.screenSinceDays}
      </p>

      <Card className="!p-4">
        <SectionTitle>{t.painTitle}</SectionTitle>
        <ul className="grid grid-cols-8 gap-1 justify-items-center">
          {days.map((d) => (
            <li key={d} className="flex flex-col items-center gap-1" aria-label={`${day(d, 'EEEE d MMMM')} : ${pain.get(d) ?? '–'}`}>
              <Cell v={pain.get(d)} ring={d === session} />
              <span className="text-[11px]" style={{ color: 'var(--color-ink-muted)' }} aria-hidden>
                {d === session ? t.sessionMark : day(d, 'EEEEE')}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-caption mt-3" style={{ color: 'var(--color-ink-muted)' }}>
          {[session && pain.get(shiftISO(session, 1)) !== undefined ? format(t.painNextDay, { v: pain.get(shiftISO(session, 1))! }, language) : '', median !== null ? format(t.painMedian, { v: nf.format(median) }, language) : '']
            .filter(Boolean)
            .join(' ')}
        </p>
      </Card>

      <Card className="!p-4">
        <SectionTitle>{t.exercisesTitle}</SectionTitle>
        {running && count ? (
          <>
            <p className="text-body -mt-1">
              <b>{planned ? format(t.exercisesDone, { done: nf.format(count.done), planned }, language) : format(t.exercisesDoneNoPlan, { done: nf.format(count.done) }, language)}</b>
              {count.part ? format(t.exercisesPart, { n: count.part }, language) : ''}
            </p>
            <p className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {format(t.exercisesGiven, { text: running.decision.text, date: day(running.date, 'd MMMM') }, language)}
            </p>
          </>
        ) : (
          <p className="text-control -mt-1" style={{ color: 'var(--color-ink-muted)' }}>
            {t.exercisesNone}
          </p>
        )}
      </Card>

      <Card className="!p-4">
        <SectionTitle>{t.aroundTitle}</SectionTitle>
        {around.length ? (
          <table className="w-auto border-separate" style={{ borderSpacing: '8px 8px', margin: '-8px' }}>
            <thead>
              <tr>
                <th scope="col" className="sr-only">
                  {t.sessionMark}
                </th>
                {t.aroundCols.map((col, i) => (
                  <th key={col} scope="col" className={`text-[11px] whitespace-nowrap text-center ${i === 1 ? 'font-bold' : 'font-normal'}`} style={{ color: 'var(--color-ink-muted)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {around.map((s) => (
                <tr key={s.date}>
                  <th scope="row" className="text-control font-medium text-left pr-2 whitespace-nowrap">
                    {day(s.date, 'd MMM').replace('.', '')}
                  </th>
                  {s.pain.map((v, i) => (
                    <td key={i}>
                      <Cell v={v} ring={i === 1} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-control -mt-1" style={{ color: 'var(--color-ink-muted)' }}>
            {t.aroundNone}
          </p>
        )}
        <p className="text-caption mt-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.aroundHint}
        </p>
      </Card>

      {questions.length > 0 && (
        <Card className="!p-4">
          <SectionTitle>{t.questionsTitle}</SectionTitle>
          <ul className="flex flex-col gap-2">
            {questions.map((q) => (
              <li key={q} className="text-body flex gap-2">
                <IconChevronRight size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} aria-hidden />
                {q}
              </li>
            ))}
            {c?.goal && <li className="text-body flex gap-2"><IconChevronRight size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} aria-hidden />{c.goal}</li>}
          </ul>
        </Card>
      )}
    </div>
  )
}
