import { format as formatDate } from 'date-fns'
import type { FlareEpisode } from '../../lib/flares'
import { usePalette } from '../../hooks/usePalette'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/** The flares found in the chosen range, under the pain curve. Trends is
 * where someone looks at their figures on purpose, so the word is used here;
 * the Today page speaks of "harder days" instead. */
export function FlaresCard({ episodes, days }: { episodes: FlareEpisode[]; days: number }) {
  const i18n = useTranslation()
  const t = i18n.trends
  const language = useLanguage()
  const { dateFnsLocale, intlLocale } = useLocale()
  const palette = usePalette()
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale: dateFnsLocale })
  const nf = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 })

  return (
    <Card>
      <SectionTitle>{t.flaresTitle}</SectionTitle>
      {episodes.length === 0 ? (
        <p className="text-control" style={{ color: palette.inkMuted }}>
          {t.flaresNone}
        </p>
      ) : (
        <>
          <p className="text-control mb-1">{format(t.flaresSummary, { n: episodes.length, days }, language)}</p>
          <ul className="flex flex-col">
            {[...episodes].reverse().map((e, i) => (
              <li key={e.start} className="py-2.5" style={i > 0 ? { borderTop: `1px solid ${palette.hairline}` } : undefined}>
                <p className="text-control font-medium">
                  {format(t.flareRange, { start: day(e.start), end: day(e.end) }, language)}
                </p>
                <p className="text-caption" style={{ color: palette.inkMuted }}>
                  {[
                    format(t.flareDetails, { days: e.days, peak: e.peak, usual: nf.format(e.baseline) }, language),
                    e.ongoing ? t.flareOngoing : e.recoveryDays !== null ? format(t.flareBack, { n: e.recoveryDays }, language) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-caption mt-2" style={{ color: palette.inkMuted }}>
        {t.flaresHelper}
      </p>
    </Card>
  )
}
