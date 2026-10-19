import { useState } from 'react'
import { format as formatDate } from 'date-fns'
import type { BodyZone } from '../../db/types'
import { DRAW_ORDER, OUTLINES, pieces, type View } from '../../lib/bodyOutlines'
import { zoneSummary } from '../../lib/bodyZones'
import { compareFlareZones, MIN_FLARE_DAYS, MIN_OTHER_DAYS, zoneStrips } from '../../lib/zoneTrends'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { usePalette } from '../../hooks/usePalette'
import { Card, SectionTitle } from '../ui/Card'
import { Chip } from '../ui/Chip'

interface DayZones {
  date: string
  painLocations?: BodyZone[]
}

const FLARE_INK = 'var(--color-weather-5-text)'
const FLARE_SOFT = 'color-mix(in srgb, var(--color-weather-5) 14%, var(--color-surface))'

/** The silhouette tinted by how often each zone is reported: the more often, the stronger the soft red (the one of the "Where does it hurt?" input). */
function HeatSilhouette({ view, share, label }: { view: View; share: (zone: BodyZone) => number; label: string }) {
  return (
    <svg viewBox="0 0 200 392" role="img" aria-label={label} className="mx-auto block h-auto w-full max-w-[230px]">
      {DRAW_ORDER.flatMap((region) =>
        pieces(region, view).map(({ zone, mirror }) => {
          const s = share(zone)
          return (
            <path
              key={zone}
              d={OUTLINES[region].d}
              transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}
              strokeLinejoin="round"
              style={{
                fill: s > 0 ? 'var(--zone-pain)' : 'color-mix(in srgb, var(--color-ink) 9%, var(--color-surface))',
                fillOpacity: s > 0 ? 0.3 + 0.7 * s : 1,
                stroke: 'color-mix(in srgb, var(--color-ink) 22%, var(--color-surface))',
                strokeWidth: 1.5,
                filter: s > 0.5 ? 'drop-shadow(0 0 5px var(--zone-pain-glow))' : undefined,
              }}
            />
          )
        })
      )}
      <g fill="none" strokeLinecap="round" pointerEvents="none" style={{ stroke: 'color-mix(in srgb, var(--color-ink) 28%, var(--color-surface))', strokeWidth: 1.5 }}>
        {view === 'front' ? (
          <>
            <circle cx="94" cy="26" r="1.8" style={{ fill: 'color-mix(in srgb, var(--color-ink) 28%, var(--color-surface))', stroke: 'none' }} />
            <circle cx="106" cy="26" r="1.8" style={{ fill: 'color-mix(in srgb, var(--color-ink) 28%, var(--color-surface))', stroke: 'none' }} />
            <path d="M96,36 Q100,39 104,36" />
          </>
        ) : (
          <path d="M100,70 L100,160" strokeDasharray="2 4" />
        )}
      </g>
    </svg>
  )
}

function ViewCaption({ view }: { view: View }) {
  const t = useTranslation().bodyMap
  return (
    <div className="mx-auto mt-1 flex max-w-[230px] items-center justify-between text-caption" style={{ color: 'var(--color-ink-muted)' }}>
      <span>← {view === 'front' ? t.yourRight : t.yourLeft}</span>
      <b className="font-semibold" style={{ color: 'var(--color-ink)' }}>
        {view === 'front' ? t.viewFront : t.viewBack}
      </b>
      <span>{view === 'front' ? t.yourLeft : t.yourRight} →</span>
    </div>
  )
}

/** Where it hurts over the chosen range: the silhouette and the most reported zones, with the days behind each. A plain count, so it has nothing to be silent about. */
export function ZonesMapCard({ entries }: { entries: DayZones[] }) {
  const i18n = useTranslation()
  const t = i18n.trends
  const language = useLanguage()
  const palette = usePalette()
  const [view, setView] = useState<View>('front')
  const summary = zoneSummary(entries)
  if (!summary.shares.length) return null
  const share = new Map(summary.shares)
  return (
    <Card>
      <SectionTitle>{t.zonesTitle}</SectionTitle>
      <div className="mb-3 flex gap-2" role="group" aria-label={i18n.bodyMap.mapLabel}>
        <div className="flex-1 [&>button]:w-full">
          <Chip label={i18n.bodyMap.front} selected={view === 'front'} onClick={() => setView('front')} tone="fog" />
        </div>
        <div className="flex-1 [&>button]:w-full">
          <Chip label={i18n.bodyMap.back} selected={view === 'back'} onClick={() => setView('back')} tone="fog" />
        </div>
      </div>
      <HeatSilhouette view={view} share={(z) => share.get(z) ?? 0} label={view === 'front' ? i18n.bodyMap.viewFront : i18n.bodyMap.viewBack} />
      <ViewCaption view={view} />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-caption" style={{ color: palette.inkMuted }} aria-hidden>
        <span>{t.zonesLess}</span>
        {[0.3, 0.65, 1].map((o) => (
          <span key={o} className="inline-block h-2.5 w-3.5 rounded-sm" style={{ background: 'var(--zone-pain)', opacity: o }} />
        ))}
        <span>{t.zonesMore}</span>
      </div>
      <ul className="mt-3">
        {summary.shares.slice(0, 6).map(([zone, s], i) => (
          <li key={zone} className="grid grid-cols-[1fr_88px_72px] items-center gap-2 py-1.5 text-control" style={i > 0 ? { borderTop: `1px solid ${palette.hairline}` } : undefined}>
            <span>{i18n.bodyZones[zone]}</span>
            <span className="h-2 overflow-hidden rounded-full" style={{ background: palette.hairline }} aria-hidden>
              <span className="block h-full" style={{ width: `${s * 100}%`, background: 'var(--zone-pain)' }} />
            </span>
            <span className="text-right text-caption tabular-nums" style={{ color: palette.inkMuted }}>
              {format(t.zonesDaysOf, { k: Math.round(s * summary.days), n: summary.days }, language)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-caption" style={{ color: palette.inkMuted }}>
        {t.zonesNote}
      </p>
    </Card>
  )
}

/** The zones of flare days against the others. Named only with enough days on both sides and a large gap (see `lib/zoneTrends.ts`); a flare is never presented as caused by a zone. */
export function ZonesFlaresCard({ entries, flareDays }: { entries: DayZones[]; flareDays: ReadonlySet<string> }) {
  const i18n = useTranslation()
  const t = i18n.trends
  const language = useLanguage()
  const palette = usePalette()
  const cmp = compareFlareZones(entries, flareDays)
  if (cmp.flareDays === 0) return null
  return (
    <Card>
      <SectionTitle>{t.zonesFlareTitle}</SectionTitle>
      {!cmp.enough ? (
        <p className="text-control leading-snug" style={{ color: palette.inkMuted }}>
          {format(t.zonesFlareWaiting, { flare: MIN_FLARE_DAYS, other: MIN_OTHER_DAYS }, language)}
        </p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl px-3 py-2" style={{ background: FLARE_SOFT, color: FLARE_INK }}>
              <b className="block text-heading" style={{ color: 'var(--color-ink)' }}>
                {format(t.zonesFlareDays, { n: cmp.flareDays }, language)}
              </b>
              <span className="text-caption">{t.zonesFlareDaysLabel}</span>
            </div>
            <div className="rounded-xl px-3 py-2" style={{ background: 'var(--color-surface-raised)', color: palette.inkMuted }}>
              <b className="block text-heading" style={{ color: 'var(--color-ink)' }}>
                {format(t.zonesFlareDays, { n: cmp.otherDays }, language)}
              </b>
              <span className="text-caption">{t.zonesOtherDaysLabel}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <HeatSilhouette view="front" share={(z) => cmp.flareShares.get(z) ?? 0} label={i18n.bodyMap.viewFront} />
              <p className="text-center text-caption" style={{ color: palette.inkMuted }}>
                {i18n.bodyMap.front}
              </p>
            </div>
            <div>
              <HeatSilhouette view="back" share={(z) => cmp.flareShares.get(z) ?? 0} label={i18n.bodyMap.viewBack} />
              <p className="text-center text-caption" style={{ color: palette.inkMuted }}>
                {i18n.bodyMap.back}
              </p>
            </div>
          </div>
          <p className="mt-3 text-control leading-snug">{cmp.rows.length ? t.zonesFlareIntro : t.zonesFlareNone}</p>
          {cmp.rows.length > 0 && (
            <table className="mt-1 w-full text-control">
              <thead>
                <tr className="text-caption" style={{ color: palette.inkMuted }}>
                  <td />
                  <th scope="col" className="w-[88px] font-normal">
                    {t.zonesFlareColFlare}
                  </th>
                  <th scope="col" className="w-[88px] font-normal">
                    {t.zonesFlareColOther}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cmp.rows.map((r) => (
                  <tr key={r.zone} style={{ borderTop: `1px solid ${palette.hairline}` }}>
                    <th scope="row" className="py-1.5 text-left font-normal">
                      {i18n.bodyZones[r.zone]}
                    </th>
                    <td className="px-1 py-1 text-center tabular-nums">
                      <span className="block rounded-lg px-1" style={{ background: FLARE_SOFT }}>
                        {format(t.zonesFlareCell, { k: r.flareDays, n: cmp.flareDays }, language)}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-center tabular-nums" style={{ color: palette.inkMuted }}>
                      {format(t.zonesFlareCell, { k: r.otherDays, n: cmp.otherDays }, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-caption" style={{ color: palette.inkMuted }}>
            {t.zonesFlareNote}
          </p>
        </>
      )}
    </Card>
  )
}

/** One row per zone, one box per week, the flare weeks marked above: what is always there, what comes and goes, what appears or fades. No threshold and no sentence, so nothing to over-read. */
export function ZonesWeeksCard({ entries, today, flareDays }: { entries: DayZones[]; today: string; flareDays: ReadonlySet<string> }) {
  const i18n = useTranslation()
  const t = i18n.trends
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const palette = usePalette()
  const strips = zoneStrips(entries, today, flareDays)
  if (!strips) return null
  const dayLabel = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale: dateFnsLocale })
  return (
    <Card>
      <SectionTitle>{t.zonesWeeksTitle}</SectionTitle>
      <p className="mb-3 text-control leading-snug">{t.zonesWeeksIntro}</p>
      <table className="w-full border-separate" style={{ borderSpacing: '2px 4px' }}>
        <tbody>
          <tr>
            <th scope="row" className="w-[124px] text-left text-caption font-normal" style={{ color: FLARE_INK }}>
              {t.zonesWeeksFlareRow}
            </th>
            {strips.weeks.map((w) => (
              <td key={w.start} className="p-0">
                <span className="block h-1 rounded-full" style={{ background: w.flare ? 'var(--color-weather-5)' : 'transparent' }} aria-hidden />
                <span className="sr-only">{w.flare ? `${dayLabel(w.start)} : ${t.zonesWeeksFlareRow}` : ''}</span>
              </td>
            ))}
          </tr>
          {strips.rows.map((row) => (
            <tr key={row.zone}>
              <th scope="row" className="truncate text-left text-caption font-normal" style={{ maxWidth: 124 }}>
                {i18n.bodyZones[row.zone]}
              </th>
              {row.cells.map((c, w) => (
                <td key={strips.weeks[w].start} className="p-0">
                  <span
                    className="block h-4 rounded-[3px]"
                    aria-hidden
                    style={
                      c.logged === 0
                        ? { border: `1px dashed ${palette.hairline}` }
                        : c.days === 0
                          ? { background: palette.hairline }
                          : { background: 'var(--zone-pain)', opacity: 0.3 + 0.7 * (c.days / c.logged) }
                    }
                  />
                  <span className="sr-only">
                    {format(t.zonesWeeksCell, { date: dayLabel(strips.weeks[w].start), k: c.days, n: c.logged }, language)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-caption" style={{ color: palette.inkMuted }} aria-hidden>
        <span className="inline-block h-2.5 w-3.5 rounded-sm" style={{ background: palette.hairline }} />
        <span>{t.zonesWeeksNone}</span>
        <span className="inline-block h-2.5 w-3.5 rounded-sm" style={{ background: 'var(--zone-pain)' }} />
        <span>{t.zonesWeeksAll}</span>
        <span className="inline-block h-2.5 w-3.5 rounded-sm" style={{ border: `1px dashed ${palette.hairline}` }} />
        <span>{t.zonesWeeksUnlogged}</span>
      </div>
      <p className="mt-2 text-caption" style={{ color: palette.inkMuted }}>
        {t.zonesWeeksNote}
      </p>
    </Card>
  )
}
