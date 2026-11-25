import { useId, useState, type ReactNode } from 'react'
import { usePalette } from '../../hooks/usePalette'
import { format, useLanguage, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/** One measure read against chance: on how many of `n` it was so, and the band chance fills. */
export interface ChanceLine {
  key: string
  /** The measure's name in the list */
  label: string
  /** The sentence's words for it, when it stands out */
  what: string
  n: number
  observed: number
  low: number
  high: number
  verdict: 'above' | 'within' | 'below'
}

/**
 * The shape shared by « Avant tes poussées » and « Avant tes bons jours »: a sentence first (what stands out, or that nothing does), then every measure behind
 * "see all the measures", the ones that do not stand out included, each with its band of chance. Never a flag on one day, never a cause.
 */
export function ChanceReadingCard({
  title,
  lines,
  above,
  nothing,
  found,
  foundNone,
  notCause,
  intro,
}: {
  title: string
  lines: ChanceLine[]
  /** The lines above the band, the largest excess first */
  above: ChanceLine[]
  nothing: string
  /** With `{{k}}`, `{{n}}`, `{{what}}`, `{{chance}}` */
  found: string
  foundNone: string
  notCause: string
  /** A caption under the sentence, before the caveats */
  intro?: ReactNode
}) {
  const t = useTranslation().beforeFlares
  const language = useLanguage()
  const palette = usePalette()
  const [open, setOpen] = useState(false)
  const detailId = useId()

  const chanceOf = (r: ChanceLine) => (r.high === 0 ? t.chanceNone : format(r.low === r.high ? t.chanceOne : t.chanceRange, { lo: r.low, hi: r.high }, language))
  const shown = above.slice(0, 3)

  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      {shown.length === 0 ? (
        <p className="text-body">{nothing}</p>
      ) : (
        shown.map((r) => (
          <p key={r.key} className="text-body mb-1">
            {format(r.high === 0 ? foundNone : found, { k: r.observed, n: r.n, what: r.what, chance: chanceOf(r) }, language)}
          </p>
        ))
      )}
      <p className="text-caption mt-1" style={{ color: palette.inkMuted }}>
        {intro ? <>{intro} </> : null}
        {shown.length > 0 ? `${notCause} ` : ''}
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
          {lines.map((r) => {
            const x = (v: number) => (v / r.n) * 300
            const vars = { what: r.label, k: r.observed, n: r.n, chance: chanceOf(r) }
            return (
              <li key={r.key} className="py-2" style={{ borderTop: `1px solid ${palette.hairline}` }}>
                <div className="flex justify-between gap-2 text-control">
                  <span>{r.label}</span>
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
