import { format as formatDate } from 'date-fns'
import { updateSettings } from '../../db'
import type { Settings } from '../../db/types'
import { useAllEntries } from '../../hooks/useEntries'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { SERIES_TOTALS, seriesProgress, sessionDates, withSeriesTotal } from '../../lib/physio'
import { Chip } from '../ui/Chip'

/** In the appointment sheet, for a physio appointment: how many sessions the series has. Kept at once; « Je ne sais pas » keeps none. */
export function SessionsField({ settings, today, appointment }: { settings: Settings; today: string; appointment?: string }) {
  const t = useTranslation().physio
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const entries = useAllEntries()
  const series = settings.physioSeries
  const progress = seriesProgress(series, sessionDates(entries ?? [], settings.pastConsultations, today), today)
  const restartDay = appointment && appointment < today ? appointment : today
  return (
    <div role="group" aria-label={t.sessionsTitle}>
      <p className="text-caption font-semibold mb-1.5">{t.sessionsTitle}</p>
      <div className="flex flex-wrap gap-2">
        {SERIES_TOTALS.map((n) => (
          <Chip key={n} label={String(n)} selected={series?.total === n} onClick={() => void updateSettings({ physioSeries: withSeriesTotal(series, n, today, appointment) })} />
        ))}
        <Chip label={t.sessionsUnsure} selected={!series} onClick={() => void updateSettings({ physioSeries: undefined })} />
      </div>
      <p className="text-caption mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
        {t.sessionsHint}
      </p>
      {series && progress && progress.done >= progress.total && series.start < restartDay && (
        <button
          type="button"
          onClick={() => void updateSettings({ physioSeries: { total: series.total, start: restartDay } })}
          className="min-h-11 text-control font-semibold underline underline-offset-4"
          style={{ color: 'var(--color-brand)' }}
        >
          {format(t.seriesRestart, { date: formatDate(new Date(restartDay + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale }) }, language)}
        </button>
      )}
    </div>
  )
}
