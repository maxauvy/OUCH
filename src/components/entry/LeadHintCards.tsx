import { IconNotebook } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { Lead, LeadChoices } from '../../lib/leads'
import { actionInSentence, choiceFor } from '../../lib/leads'
import { archiveTrial, continueTrial, trialStatus, type LeadTrial } from '../../lib/leadTrial'
import type { LoggedEntry } from '../../db/types'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { capitalise } from '../trends/leadTexts'
import { BUTTON, PRIMARY, SECONDARY } from '../today/cardStyles'

/** The one-week trial, on the day's page: where the week is while it runs, and what it showed once it is over. */
export function TrialCard({
  trial,
  history,
  entries,
  today,
  lead,
  choices,
}: {
  trial: LeadTrial
  /** The weeks closed before */
  history: LeadTrial[] | undefined
  entries: LoggedEntry[]
  today: string
  /** The lead as the notes read today, when it still is one */
  lead: Lead | undefined
  choices: LeadChoices | undefined
}) {
  const t = useTranslation()
  const lh = t.leadHints
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const kept = choices?.[trial.key]?.choice === 'kept'
  const status = trialStatus(trial, entries, today, choices?.[trial.key]?.gap ?? lead?.gap)
  const action = actionInSentence(trial.action)
  const title = format(lh.trialTitle, { action: capitalise(trial.action), n: status.withDays }, language)
  // Stopping a week half way leaves nothing to say; finishing or carrying on a week that ran its course keeps it for the report.
  const clear = () => void updateSettings({ leadTrial: undefined })
  const finish = () => void updateSettings({ leadTrial: undefined, leadTrialHistory: archiveTrial(history, trial) })

  if (!status.over) {
    return (
      <section aria-label={lh.trialLabel} className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-brand-soft)', boxShadow: 'var(--tint-edge, none)' }}>
        <p className="text-caption font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--color-brand)' }}>
          {lh.trialLabel}
        </p>
        <p className="text-body font-semibold mt-1">{title}</p>
        <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {format(lh.trialDay, { day: status.day }, language)}
        </p>
        <div className="flex gap-1 mt-2.5" aria-hidden>
          {status.days.map((d) => (
            <span
              key={d.date}
              className="flex-1 h-2 rounded-full"
              style={{
                background:
                  d.state === 'with' ? 'var(--color-brand)' : d.state === 'without' ? 'color-mix(in srgb, var(--color-brand) 30%, transparent)' : 'var(--color-hairline)',
              }}
            />
          ))}
        </div>
        <p className="text-caption leading-snug mt-2" style={{ color: 'var(--color-ink-muted)' }}>
          {format(lh.trialNote, { action, where: t.entryForm.positiveActionsTitle })}
        </p>
        <button type="button" className={`${BUTTON} mt-2`} style={SECONDARY} onClick={clear}>
          {lh.trialStop}
        </button>
      </section>
    )
  }

  const r = status.result
  // The softer days on the left, as on the lead's card.
  const withLabel = format(t.trends.leadActionHigh, { action })
  const withSide = r && { mean: r.with.mean, label: withLabel }
  const withoutSide = r && { mean: r.without.mean, label: t.trends.leadActionLow }
  const [soft, hard] = r && withSide && withoutSide ? (r.gap <= 0 ? [withSide, withoutSide] : [withoutSide, withSide]) : [null, null]
  const keepable = !kept && lead
  return (
    <section aria-label={lh.trialDoneLabel} className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-brand-soft)', boxShadow: 'var(--tint-edge, none)' }}>
      <p className="text-caption font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--color-brand)' }}>
        {lh.trialDoneLabel}
      </p>
      <p className="text-body font-semibold mt-1">{title}</p>
      {status.withDays > 0 && <p className="text-body mt-1">{lh.trialWords}</p>}
      {r && soft && hard ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            {[soft, hard].map((g, i) => (
              <div
                key={i}
                className="rounded-xl px-2.5 py-3 text-center"
                style={{ background: i === 0 ? 'var(--color-surface)' : 'var(--color-surface-raised)', color: i === 0 ? 'var(--color-brand)' : 'var(--color-ink)' }}
              >
                <p className="text-display font-bold leading-none">{nf.format(g.mean)}</p>
                <p className="text-caption mt-1.5 leading-snug" style={{ color: 'var(--color-ink)' }}>
                  {capitalise(g.label)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-caption leading-snug mt-2.5" style={{ color: 'var(--color-ink-muted)' }}>
            {lh.trialSmall}
            {r.sameDirection === true && ` ${lh.trialSame}`}
            {r.sameDirection === false && ` ${lh.trialOther}`}
            {r.gap > 0 && ` ${lh.trialHarder}`}
          </p>
        </>
      ) : (
        <p className="text-caption leading-snug mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
          {lh.trialFew}
        </p>
      )}
      {kept && (
        <p className="flex items-center gap-1.5 text-caption mt-2" style={{ color: 'var(--color-brand)' }}>
          <IconNotebook size={16} aria-hidden />
          {lh.trialKept}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-2.5">
        {keepable && (
          <button
            type="button"
            className={BUTTON}
            style={PRIMARY}
            onClick={() => void updateSettings({ leadChoices: { ...choices, [trial.key]: choiceFor(lead, 'kept', Date.now()) } })}
          >
            {lh.trialKeep}
          </button>
        )}
        <button type="button" className={BUTTON} style={keepable ? SECONDARY : PRIMARY} onClick={() => void updateSettings({ leadTrial: continueTrial(trial, today), leadTrialHistory: archiveTrial(history, trial) })}>
          {lh.trialContinue}
        </button>
        <button type="button" className={BUTTON} style={SECONDARY} onClick={finish}>
          {lh.trialEnd}
        </button>
      </div>
    </section>
  )
}
