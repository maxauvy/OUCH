import { useMemo } from 'react'
import type { LoggedEntry } from '../../db/types'
import { beforeGoodDays, type BeforeGoodDaysRow } from '../../lib/beforeGoodDays'
import { format, useLanguage, useTranslation } from '../../i18n'
import { ChanceReadingCard, type ChanceLine } from './ChanceReadingCard'

/**
 * The mirror of « Avant tes poussées »: what the eve of the good days looked like, against chance (see lib/beforeGoodDays.ts). Nothing until there are eight
 * rows of good days to look at.
 */
export function BeforeGoodDaysCard({ entries, flareDays }: { entries: LoggedEntry[]; flareDays: ReadonlySet<string> }) {
  const t = useTranslation().beforeGoodDays
  const language = useLanguage()
  const reading = useMemo(() => beforeGoodDays(entries, flareDays), [entries, flareDays])
  if (!reading) return null
  const line = (r: BeforeGoodDaysRow): ChanceLine => ({ ...r, label: t.measures[r.key].row, what: t.measures[r.key].what })
  return (
    <ChanceReadingCard
      title={t.title}
      lines={reading.lines.map(line)}
      above={reading.above.map(line)}
      nothing={format(t.nothing, { n: reading.rows }, language)}
      found={t.found}
      foundNone={t.foundNone}
      notCause={t.notCause}
      intro={t.whatIsGood}
    />
  )
}
