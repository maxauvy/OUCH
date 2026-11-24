import { IconMessageCircle } from '@tabler/icons-react'
import type { DailyEntry } from '../../db/types'
import { isPaletteWord, summarizePainWords } from '../../lib/painWords'
import { MARKER } from '../today/cardStyles'
import { format, useLanguage, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/** At most this many words in the card: the most chosen. */
const MAX_SHOWN = 6

/** The words the person chose over the range, counted in days, with the share of flare days in apricot.
 * The sentence under it only gives counts, never a comparison or a verdict. Nothing when no day has words. */
export function PainWordsCard({ entries, flareDays }: { entries: DailyEntry[]; flareDays: ReadonlySet<string> | null }) {
  const t = useTranslation().painWords
  const language = useLanguage()
  const summary = summarizePainWords(entries, flareDays ?? new Set())
  if (summary.noted === 0) return null
  const shown = summary.words.slice(0, MAX_SHOWN)
  const max = shown[0]!.days
  const label = (w: string) => (isPaletteWord(w) ? t.words[w] : w)
  // The words mostly found on flare days, said with their counts: at least three days, most of them in a flare.
  const flareWords = flareDays ? shown.filter((w) => w.days >= 3 && w.flareDays * 2 > w.days).slice(0, 2) : []

  return (
    <Card>
      <SectionTitle icon={IconMessageCircle}>{t.trendsTitle}</SectionTitle>
      <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
        {format(flareDays ? t.trendsIntro : t.trendsIntroNoFlare, { n: summary.noted }, language)}
      </p>
      <ul className="flex flex-col gap-2.5">
        {shown.map((w) => (
          <li key={w.word}>
            <div className="flex justify-between gap-2 text-body">
              <span className="min-w-0">{label(w.word)}</span>
              <span className="font-semibold tabular-nums shrink-0">{format(t.days, { n: w.days }, language)}</span>
            </div>
            <div className="flex h-2 mt-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-raised)' }} aria-hidden>
              {flareDays && <span style={{ width: `${(w.flareDays / max) * 100}%`, background: 'var(--marker)' }} />}
              <span style={{ width: `${((w.days - (flareDays ? w.flareDays : 0)) / max) * 100}%`, background: 'color-mix(in srgb, var(--color-brand) 30%, transparent)' }} />
            </div>
          </li>
        ))}
      </ul>
      {flareWords.length > 0 && (
        <p className="text-body mt-3">
          {flareWords.map((w, i) => {
            const [before, after] = t.trendsFlare.split('{{word}}')
            return (
              <span key={w.word}>
                {i > 0 && ' '}
                {before}
                <mark className="font-bold px-0.5" style={{ color: 'inherit', background: MARKER }}>
                  {label(w.word)}
                </mark>
                {format(after ?? '', { f: w.flareDays, n: w.days }, language)}
              </span>
            )
          })}
        </p>
      )}
    </Card>
  )
}
