import { format as formatDate } from 'date-fns'
import type { Settings } from '../../db/types'
import { useAllEntries } from '../../hooks/useEntries'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { seriesProgress, sessionDates } from '../../lib/physio'
import { kindOf } from '../../lib/consultation'

const EMPTY = 'var(--chip-bg, var(--color-surface-raised))'

/** On the Consultation page: the series of physio sessions, counted, in plain bars. Nothing without a series. */
export function PhysioSeriesCard({ settings, today, onOpen, showButton }: { settings: Settings; today: string; onOpen: () => void; /** The big button of the next appointment already opens the screen. */ showButton: boolean }) {
  const t = useTranslation().physio
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const entries = useAllEntries()
  const progress = seriesProgress(settings.physioSeries, sessionDates(entries ?? [], settings.pastConsultations, today), today)
  if (!progress) return null
  const c = settings.consultation
  const sessionToday = !!c && kindOf(c) === 'kine' && c.date === today
  const counted = Math.min(progress.done, progress.total)
  const sub = [
    settings.pastConsultations?.filter((p) => p.kind === 'kine' && p.doctor).sort((a, b) => b.date.localeCompare(a.date))[0]?.doctor ?? c?.doctor,
    sessionToday ? t.seriesToday : format(t.seriesSince, { date: formatDate(new Date(progress.start + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale }) }, language),
  ].filter(Boolean)
  return (
    <section aria-labelledby="physio-series" className="rounded-[var(--radius-card)] p-[18px] flex flex-col gap-3" style={{ background: 'var(--color-surface)', border: 'var(--card-border, none)', boxShadow: 'var(--card-shadow)' }}>
      <div>
        <div className="flex items-baseline gap-3">
          <h2 id="physio-series" className="section-title text-heading font-bold flex-1">
            {t.seriesTitle}
          </h2>
          <span className="text-body font-bold tabular-nums">{format(t.seriesCount, { done: progress.done, total: progress.total }, language)}</span>
        </div>
        <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
          {sub.join(' · ')}
        </p>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: progress.total }, (_, i) => (
          <span key={i} className="flex-1 h-2.5 rounded-full" style={{ background: i < counted ? 'var(--color-brand)' : EMPTY }} />
        ))}
      </div>
      {progress.done >= progress.total && (
        <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {t.seriesDone}
        </p>
      )}
      {showButton && (
        <button type="button" onClick={onOpen} className="btn-secondary">
          {t.screenButton}
        </button>
      )}
    </section>
  )
}
