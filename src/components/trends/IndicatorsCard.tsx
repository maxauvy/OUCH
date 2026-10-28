import type { DailyEntry } from '../../db/types'
import { withoutUnoffered } from '../../lib/indicatorCatalog'
import { nightWakingLines, otherIndicatorLines, stiffnessLines } from '../../lib/indicatorLines'
import { useEarlyAccess } from '../../lib/earlyAccess'
import { format, useLocale, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/** What else the person noted over the range, described in the same words as the doctor report: days noted,
 * days with a yes, the most frequent answers. Nothing when no day carries one of the newer indicators. */
export function IndicatorsCard({ entries }: { entries: DailyEntry[] }) {
  const t = useTranslation()
  const { language, intlLocale } = useLocale()
  const earlyAccess = useEarlyAccess()
  const shown = entries.map((e) => withoutUnoffered(e, earlyAccess))
  const f = (template: string, vars: Record<string, string | number>) => format(template, vars, language)
  const nf = (v: number) => new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 }).format(v)
  // In the report each has a heading; here the line itself says which indicator it is about.
  const named = (label: string, lines: string[]) => lines.map((line) => `${label} : ${line}`)
  const lines = [
    ...named(t.factors.morningStiffness.label, stiffnessLines(shown, t.report, f, nf)),
    ...named(t.factors.nightWaking.label, nightWakingLines(shown, t.report, f, nf)),
    ...otherIndicatorLines(shown, t.report, f),
  ]
  if (lines.length === 0) return null

  return (
    <Card>
      <SectionTitle>{t.trends.indicatorsTitle}</SectionTitle>
      <ul className="flex flex-col gap-2 text-control">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-caption mt-3" style={{ color: 'var(--color-ink-muted)' }}>
        {t.report.indicators.note}
      </p>
    </Card>
  )
}
