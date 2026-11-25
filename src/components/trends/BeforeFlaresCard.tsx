import { useMemo } from 'react'
import type { LoggedEntry } from '../../db/types'
import { beforeFlares, type BeforeFlaresRow } from '../../lib/beforeFlares'
import type { FlareEpisode } from '../../lib/flares'
import { format, useLanguage, useTranslation } from '../../i18n'
import { ChanceReadingCard, type ChanceLine } from './ChanceReadingCard'

/**
 * What the three days before the flares looked like, set against what chance gives: a sentence first (what stands out, or that nothing does), and every measure behind
 * "see all the measures", the ones that do not stand out included. Never a flag on one flare, never a cause. Nothing until there are four flares to look at.
 */
export function BeforeFlaresCard({ entries, episodes }: { entries: LoggedEntry[]; episodes: FlareEpisode[] }) {
  const t = useTranslation().beforeFlares
  const language = useLanguage()
  const reading = useMemo(() => beforeFlares(entries, episodes), [entries, episodes])
  if (!reading) return null
  const line = (r: BeforeFlaresRow): ChanceLine => ({ ...r, label: t.measures[r.key].row, what: t.measures[r.key].what })
  return (
    <ChanceReadingCard
      title={t.title}
      lines={reading.rows.map(line)}
      above={reading.above.map(line)}
      nothing={format(t.nothing, { n: reading.flares }, language)}
      found={t.found}
      foundNone={t.foundNone}
      notCause={t.notCause}
    />
  )
}
