import { useMemo } from 'react'
import type { LoggedEntry } from '../../db/types'
import { pacingReading } from '../../lib/pacing'
import { usePalette } from '../../hooks/usePalette'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/** How the days after the busiest ones went, set against what chance gives: a count, the band chance leaves, and the line that this is not a cause. Nothing until the diary is long enough. */
export function PacingCard({ entries }: { entries: LoggedEntry[] }) {
  const t = useTranslation().pacing
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const palette = usePalette()
  const reading = useMemo(() => pacingReading(entries), [entries])
  if (!reading) return null
  const nf = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 })
  const { k, observed, expected, low, high, verdict } = reading
  const x = (v: number) => (v / k) * 300
  const vars = { k, x: observed, e: nf.format(expected), lo: low, hi: high }
  return (
    <Card>
      <SectionTitle>{t.title}</SectionTitle>
      <p className="text-body">{format(t[verdict], vars, language)}</p>
      <svg viewBox="0 0 300 44" width="100%" role="img" aria-label={format(t.chartLabel, vars, language)} className="mt-2">
        <rect x={0} y={10} width={300} height={14} rx={7} fill={palette.hairline} />
        <rect x={x(low)} y={10} width={Math.max(x(high) - x(low), 8)} height={14} rx={7} fill={palette.brand} opacity={0.25} />
        <circle cx={Math.min(Math.max(x(observed), 7), 293)} cy={17} r={7} fill={palette.brand} />
        <text x={Math.min(x(low), 250)} y={40} fontSize={11} fill={palette.inkMuted}>
          {t.chance}
        </text>
        <text x={Math.min(Math.max(x(observed) - 6, 0), 270)} y={40} fontSize={11} fill={palette.inkMuted}>
          {t.you}
        </text>
      </svg>
      <p className="text-caption mt-1" style={{ color: palette.inkMuted }}>
        {t.note}
      </p>
    </Card>
  )
}
