import { format as formatDate } from 'date-fns'
import type { LoggedEntry } from '../../db/types'
import { actionInSentence } from '../../lib/leads'
import { trialStatus, type LeadTrial } from '../../lib/leadTrial'
import { usePalette } from '../../hooks/usePalette'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { capitalise } from '../trends/leadTexts'

/** In Soulager, under « Est-ce que ça t'aide vraiment ? », the one home of the trials: those the person closed, newest first,
 * so a result is not lost once the card on Today is gone, and a trial can be done again. */
export function TrialHistory({
  history,
  entries,
  today,
  running,
  onAgain,
}: {
  history: LeadTrial[]
  entries: LoggedEntry[]
  today: string
  /** A trial is under way: one at a time */
  running: boolean
  onAgain: (trial: LeadTrial) => void
}) {
  const t = useTranslation().trends
  const language = useLanguage()
  const { dateFnsLocale, intlLocale } = useLocale()
  const palette = usePalette()
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale: dateFnsLocale })
  const weeks = [...history].sort((a, b) => b.end.localeCompare(a.end))

  return (
    <div className="flex flex-col mt-2">
      <p className="text-body font-semibold">{t.trialsTitle}</p>
      <p className="text-caption" style={{ color: palette.inkMuted }}>
        {t.trialsCaption}
      </p>
      <ul className="flex flex-col mt-1">
        {weeks.map((trial, i) => {
          const { result, drawn } = trialStatus(trial, entries, today)
          const action = actionInSentence(trial.action)
          return (
            <li key={`${trial.key}@${trial.start}`} className="py-2.5" style={i > 0 ? { borderTop: `1px solid ${palette.hairline}` } : undefined}>
              <p className="text-control font-medium">
                {capitalise(trial.action)} · {format(t.trialsRange, { start: day(trial.start), end: day(trial.end) }, language)}
              </p>
              <p className="text-caption leading-snug" style={{ color: palette.inkMuted }}>
                {result
                  ? [
                      format(t.trialsWith, { action, mean: nf.format(result.with.mean), n: result.with.n }, language),
                      format(t.trialsWithout, { mean: nf.format(result.without.mean), n: result.without.n }, language),
                    ].join(' · ')
                  : t.trialsFew}
              </p>
              {result && drawn && (
                <p className="text-caption leading-snug" style={{ color: palette.inkMuted }}>
                  {t.trialsDrawn}
                  {result.next && ` ${format(t.trialsNext, { a: nf.format(result.next.with.mean), b: nf.format(result.next.without.mean) }, language)}`}
                </p>
              )}
              {result && !drawn && result.gap > 0 && (
                <p className="text-caption leading-snug" style={{ color: palette.inkMuted }}>
                  {t.trialsHarder}
                </p>
              )}
              {!running && (
                <button
                  type="button"
                  onClick={() => onAgain(trial)}
                  className="rounded-[var(--radius-control)] px-3.5 min-h-11 mt-1.5 text-control font-medium"
                  style={{ boxShadow: 'inset 0 0 0 1px var(--color-hairline)', color: 'var(--color-ink)', background: 'var(--color-surface)' }}
                >
                  {t.trialsAgain}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
