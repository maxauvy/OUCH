import { WeatherIcon } from '../ui/WeatherIcon'
import type { WeekdayProfile, WeekdayStat } from '../../lib/weekdays'
import { painWeatherByLevel } from '../../lib/painWeather'
import { usePalette } from '../../hooks/usePalette'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/**
 * The easiest and the hardest day of the week, as two tiles with the number of
 * days behind each. Shown only once every weekday has four days (see
 * `lib/weekdays.ts`), and only as a pair of tiles when at least one of them
 * leaves the band that chance can fill: otherwise it says that the days look
 * alike, rather than promoting a "best day" that is mostly noise.
 */
export function WeekdayCard({ profile }: { profile: WeekdayProfile }) {
  const t = useTranslation().trends
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const palette = usePalette()
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const { best, worst } = profile
  const stands = profile.bestStandsOut || profile.worstStandsOut

  return (
    <Card>
      <SectionTitle>{t.weekdayTitle}</SectionTitle>
      {best && worst && stands ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Tile stat={best} label={t.weekdayBest} icon="cloud-sun" tint={palette.brandSoft} ink={palette.brand} nf={nf} />
            <Tile stat={worst} label={t.weekdayWorst} icon="cloud-rain" tint={painWeatherByLevel(5).soft} ink={painWeatherByLevel(5).ink} nf={nf} />
          </div>
          <p className="text-caption leading-snug mt-3" style={{ color: palette.inkMuted }}>
            {format(
              t.weekdayNote,
              { gap: nf.format(worst.mean - best.mean), n: worst.mean - best.mean, mean: nf.format(profile.overall) },
              language
            )}
          </p>
        </>
      ) : (
        <p className="text-control leading-snug" style={{ color: palette.inkMuted }}>
          {format(t.weekdayCalm, { n: profile.total }, language)}
        </p>
      )}
    </Card>
  )
}

function Tile({
  stat,
  label,
  icon,
  tint,
  ink,
  nf,
}: {
  stat: WeekdayStat
  label: string
  icon: 'cloud-sun' | 'cloud-rain'
  tint: string
  ink: string
  nf: Intl.NumberFormat
}) {
  const i18n = useTranslation()
  const t = i18n.trends
  const language = useLanguage()
  const day = i18n.weekdaysFull[stat.jsDay as 0 | 1 | 2 | 3 | 4 | 5 | 6]
  // "sur 12 samedis": the weekday in the plural, lowercase in French only.
  const plural = `${language === 'fr' ? day.toLowerCase() : day}s`
  return (
    <div className="rounded-xl px-2.5 py-3 text-center" style={{ background: tint, color: ink }}>
      <WeatherIcon name={icon} size={30} className="mx-auto" />
      {/* Two lines high, so the two tiles line up whichever label wraps. */}
      <p className="text-caption mt-1 flex min-h-[2.6em] items-center justify-center" style={{ color: 'var(--color-ink)' }}>
        {label}
      </p>
      <p className="text-heading font-bold leading-tight" style={{ color: 'var(--color-ink)' }}>
        {day}
      </p>
      <p className="text-title font-bold mt-1.5">{format(t.weekdayValue, { v: nf.format(stat.mean) }, language)}</p>
      <p className="text-caption" style={{ color: 'var(--color-ink)' }}>
        {format(t.weekdayBasis, { n: stat.n, days: plural }, language)}
      </p>
    </div>
  )
}
