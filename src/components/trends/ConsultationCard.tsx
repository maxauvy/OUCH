import type { ReactNode } from 'react'
import { format as formatDate } from 'date-fns'
import type { LoggedEntry } from '../../db/types'
import { flareDayCount, type FlareEpisode } from '../../lib/flares'
import type { TreatmentEvent } from '../../lib/treatmentEvents'
import { daysBetween } from '../../lib/dates'
import { zoneSummary } from '../../lib/bodyZones'
import { usePalette } from '../../hooks/usePalette'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'

/** Fewest logged days before a zone is named as the most reported. */
const MIN_ZONE_DAYS = 3

const DRAWING = 'block w-full h-6 mt-1.5'

function Fact({ label, value, note, children }: { label: string; value: string; note?: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl py-2.5 px-3 min-w-0" style={{ background: 'var(--color-surface)' }}>
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </p>
      <p className="text-body font-semibold">{value}</p>
      {note && (
        <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {note}
        </p>
      )}
      {children}
    </div>
  )
}

/** The block at the top of Trends: what a doctor reads first over the chosen range, each figure with its small
 * drawing, and the way into the report. A fact that has nothing behind it (no flare reading, zones or treatment
 * followed, or too few days) is left out rather than shown empty. */
export function ConsultationCard({
  entries,
  from,
  to,
  episodes,
  flaresApply,
  zonesTracked,
  lastTreatment,
  action,
}: {
  /** The logged days of the range, newest first. */
  entries: LoggedEntry[]
  /** First and last day of the range (ISO dates). */
  from: string
  to: string
  /** The flares that touch the range. */
  episodes: FlareEpisode[]
  /** Whether a flare can be found at all (enough days, and an illness the reading fits). */
  flaresApply: boolean
  zonesTracked: boolean
  lastTreatment: TreatmentEvent | undefined
  /** The way into the report. */
  action: ReactNode
}) {
  const t = useTranslation().trends
  const i18n = useTranslation()
  const language = useLanguage()
  const { dateFnsLocale, intlLocale } = useLocale()
  const palette = usePalette()
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale: dateFnsLocale })

  const span = Math.max(daysBetween(from, to), 1)
  const at = (iso: string) => (Math.min(Math.max(daysBetween(from, iso), 0), span) / span) * 120
  const asc = [...entries].reverse()
  const mean = entries.length ? entries.reduce((s, e) => s + e.painLevel, 0) / entries.length : null

  const flareDays = flareDayCount(episodes, from, to)
  const zones = zonesTracked && entries.length >= MIN_ZONE_DAYS ? zoneSummary(entries).shares.filter(([z]) => z !== 'generalized') : []
  const topZone = zones[0]
  const treatmentInRange = lastTreatment && lastTreatment.date >= from && lastTreatment.date <= to

  return (
    <section className="rounded-[var(--radius-card)] p-4 flex flex-col gap-3" style={{ background: 'var(--color-brand-soft)', boxShadow: 'var(--tint-edge, none)' }}>
      <div>
        <h2 className="text-caption font-semibold uppercase tracking-[0.06em]" style={{ color: palette.brand }}>
          {t.consultTitle}
        </h2>
        {mean !== null && <p className="text-body mt-1">{t.consultIntro}</p>}
      </div>
      {mean !== null && (
        <div className="grid grid-cols-2 gap-2">
          <Fact label={t.factPain} value={format(t.factPainValue, { v: nf.format(mean) }, language)}>
            {asc.length > 1 && (
              <svg viewBox="0 0 120 26" preserveAspectRatio="none" className={DRAWING} aria-hidden>
                <polyline
                  points={asc.map((e, i) => `${((i * 120) / (asc.length - 1)).toFixed(1)},${(24 - e.painLevel * 2.2).toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke={palette.brand}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </Fact>
          {flaresApply && (
            <Fact label={t.factFlares} value={episodes.length ? format(t.factFlaresValue, { n: episodes.length, days: flareDays }, language) : t.factFlaresNone}>
              <svg viewBox="0 0 120 26" preserveAspectRatio="none" className={DRAWING} aria-hidden>
                <line x1={0} x2={120} y1={20} y2={20} stroke={palette.hairline} strokeWidth={2} />
                {episodes.map((e) => (
                  <rect key={e.start} x={at(e.start)} y={12} width={Math.max(at(e.end) - at(e.start), 3)} height={12} rx={3} fill={palette.weather[5].color} opacity={0.7} />
                ))}
              </svg>
            </Fact>
          )}
          {topZone && (
            <Fact label={t.factZone} value={i18n.bodyZones[topZone[0]]} note={format(t.factZoneDays, { k: Math.round(topZone[1] * entries.length), n: entries.length }, language)}>
              <svg viewBox="0 0 120 26" preserveAspectRatio="none" className={DRAWING} aria-hidden>
                {zones.slice(0, 3).map(([z, share], k) => (
                  <rect key={z} x={0} y={k * 9} width={share * 120} height={6} rx={3} fill="var(--zone-pain)" opacity={1 - k * 0.25} />
                ))}
              </svg>
            </Fact>
          )}
          {lastTreatment && (
            <Fact label={t.factTreatment} value={day(lastTreatment.date)}>
              <svg viewBox="0 0 120 26" preserveAspectRatio="none" className={DRAWING} aria-hidden>
                <line x1={0} x2={120} y1={16} y2={16} stroke={palette.hairline} strokeWidth={2} />
                {treatmentInRange && <circle cx={at(lastTreatment.date)} cy={16} r={5} fill={palette.brand} />}
              </svg>
            </Fact>
          )}
        </div>
      )}
      {action}
    </section>
  )
}
