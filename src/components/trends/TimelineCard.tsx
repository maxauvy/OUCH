import { format as formatDate } from 'date-fns'
import type { TimelineItem } from '../../lib/trendsTimeline'
import { formatPosology } from '../../lib/medicationFormat'
import { usePalette } from '../../hooks/usePalette'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/** What happened in the chosen range, newest first, under the pain curve: the flares, the changes of treatment
 * and the one-week trials. A dated list, nothing counted and nothing concluded. */
export function TimelineCard({ items }: { items: TimelineItem[] }) {
  const i18n = useTranslation()
  const t = i18n.trends
  const language = useLanguage()
  const { dateFnsLocale, intlLocale } = useLocale()
  const palette = usePalette()
  const nf = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 })
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale: dateFnsLocale })
  const range = (start: string, end: string) => format(t.flareRange, { start: day(start), end: day(end) }, language)

  function describe(item: TimelineItem): { dot: string; text: string; note: string } {
    switch (item.kind) {
      case 'flare': {
        const e = item.episode
        return {
          dot: palette.weather[5].color,
          text: format(t.timelineFlare, { n: e.days }, language),
          note: [
            range(e.start, e.end),
            format(t.timelineFlarePeak, { peak: e.peak, usual: nf.format(e.baseline) }, language),
            e.ongoing ? t.flareOngoing : e.recoveryDays !== null ? format(t.flareBack, { n: e.recoveryDays }, language) : null,
          ]
            .filter(Boolean)
            .join(' · '),
        }
      }
      case 'treatment': {
        const { med, kind, period } = item.event
        const name = med.name
        return {
          dot: palette.brand,
          text:
            kind === 'started'
              ? format(t.timelineStarted, { name }, language)
              : kind === 'stopped'
                ? format(t.timelineStopped, { name }, language)
                : format(t.timelineDose, { name, dose: formatPosology(i18n, med.regimen, period, intlLocale) }, language),
          note: day(item.date),
        }
      }
      case 'trial':
        return {
          dot: palette.weather[2].color,
          text: format(t.timelineTrial, { action: item.trial.action }, language),
          note: `${range(item.trial.start, item.trial.end)} · ${item.running ? t.timelineTrialRunning : t.timelineTrialDone}`,
        }
    }
  }

  return (
    <Card>
      <SectionTitle>{t.timelineTitle}</SectionTitle>
      <ul>
        {items.map((item, i) => {
          const { dot, text, note } = describe(item)
          return (
            <li key={`${item.kind}-${item.date}-${i}`} className="relative grid grid-cols-[18px_1fr] gap-2.5 py-2">
              {i < items.length - 1 && <span className="absolute left-[6px] top-7 -bottom-2 w-0.5" style={{ background: palette.hairline }} aria-hidden />}
              <span className="w-3.5 h-3.5 rounded-full mt-1" style={{ background: dot }} aria-hidden />
              <div className="min-w-0">
                <p className="text-body">{text}</p>
                <p className="text-caption" style={{ color: palette.inkMuted }}>
                  {note}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      {items.some((i) => i.kind === 'flare') && (
        <p className="text-caption mt-2" style={{ color: palette.inkMuted }}>
          {t.flaresHelper}
        </p>
      )}
    </Card>
  )
}
