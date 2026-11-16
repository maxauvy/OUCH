import { useId, useMemo, useState } from 'react'
import type { LoggedEntry } from '../../db/types'
import { beforeFlares, type BeforeFlaresRow } from '../../lib/beforeFlares'
import type { FlareEpisode } from '../../lib/flares'
import { usePalette } from '../../hooks/usePalette'
import { format, useLanguage, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/**
 * What the three days before the flares looked like, set against what chance gives: a sentence first (what stands out, or that nothing does), and every measure behind
 * "see all the measures", the ones that do not stand out included. Never a flag on one flare, never a cause. Nothing until there are four flares to look at.
 */
export function BeforeFlaresCard({ entries, episodes }: { entries: LoggedEntry[]; episodes: FlareEpisode[] }) {
  const t = useTranslation().beforeFlares
  const language = useLanguage()
  const palette = usePalette()
  const reading = useMemo(() => beforeFlares(entries, episodes), [entries, episodes])
  const [open, setOpen] = useState(false)
  const detailId = useId()
  if (!reading) return null

  const chanceOf = (r: BeforeFlaresRow) => (r.high === 0 ? t.chanceNone : format(r.low === r.high ? t.chanceOne : t.chanceRange, { lo: r.low, hi: r.high }, language))
  const shown = reading.above.slice(0, 3)

  return (
    <Card>
      <SectionTitle>{t.title}</SectionTitle>
      {shown.length === 0 ? (
        <p className="text-body">{format(t.nothing, { n: reading.flares }, language)}</p>
      ) : (
        shown.map((r) => (
          <p key={r.key} className="text-body mb-1">
            {format(r.high === 0 ? t.foundNone : t.found, { k: r.observed, n: r.n, what: t.measures[r.key].what, chance: chanceOf(r) }, language)}
          </p>
        ))
      )}
      <p className="text-caption mt-1" style={{ color: palette.inkMuted }}>
        {shown.length > 0 ? `${t.notCause} ` : ''}
        {t.several}
      </p>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={detailId}
        className="mt-2 min-h-11 text-control font-semibold underline underline-offset-2"
        style={{ color: palette.brand }}
      >
        {open ? t.hideAll : t.showAll}
      </button>
      {open && (
        <ul id={detailId} className="mt-1">
          {reading.rows.map((r) => {
            const x = (v: number) => (v / r.n) * 300
            const vars = { what: t.measures[r.key].row, k: r.observed, n: r.n, chance: chanceOf(r) }
            return (
              <li key={r.key} className="py-2" style={{ borderTop: `1px solid ${palette.hairline}` }}>
                <div className="flex justify-between gap-2 text-control">
                  <span>{t.measures[r.key].row}</span>
                  <span className="tabular-nums">{format(t.count, { k: r.observed, n: r.n }, language)}</span>
                </div>
                <svg viewBox="0 0 300 26" width="100%" role="img" aria-label={format(t.chartLabel, vars, language)} className="mt-1">
                  <rect x={0} y={6} width={300} height={12} rx={6} fill={palette.hairline} />
                  <rect x={x(r.low)} y={6} width={Math.max(x(r.high) - x(r.low), 8)} height={12} rx={6} fill={palette.brand} opacity={0.25} />
                  <circle cx={Math.min(Math.max(x(r.observed), 6), 294)} cy={12} r={6} fill={r.verdict === 'above' ? palette.brand : palette.surface} stroke={palette.brand} strokeWidth={2} />
                </svg>
              </li>
            )
          })}
          <li className="pt-1 text-caption" style={{ color: palette.inkMuted, borderTop: `1px solid ${palette.hairline}` }}>
            <span aria-hidden>● {t.you} · </span>
            <span aria-hidden>▬ {t.chance}</span>
          </li>
        </ul>
      )}
    </Card>
  )
}
