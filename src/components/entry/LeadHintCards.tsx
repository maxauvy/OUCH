import { useEffect } from 'react'
import { IconNotebook, IconSparkles, IconX } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { Lead, LeadChoices } from '../../lib/leads'
import { actionInSentence, choiceFor } from '../../lib/leads'
import { continueTrial, trialStatus, type LeadTrial } from '../../lib/leadTrial'
import { remember } from '../../lib/leadHints'
import type { LoggedEntry } from '../../db/types'
import type { WeeklyFinding } from '../../lib/weeklySentence'
import { updateLeadsSeen } from '../../lib/leadsSeenStore'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { leadSentence, capitalise } from '../trends/leadTexts'

const PRIMARY = { background: 'var(--color-brand)', color: 'var(--color-on-brand)' }
const SECONDARY = { boxShadow: 'inset 0 0 0 1px var(--color-hairline)', color: 'var(--color-ink)', background: 'var(--color-surface)' }
const BUTTON = 'rounded-[var(--radius-control)] px-3.5 min-h-11 text-control font-medium'

function Closer({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute top-0.5 right-0.5 w-10 h-10 rounded-full flex items-center justify-center"
      style={{ color: 'var(--color-ink-muted)' }}
    >
      <IconX size={16} aria-hidden />
    </button>
  )
}

/** A soft word on the day's page, once, when the notes show a lead the person has not met yet. */
export function LeadPromptCard({
  lead,
  date,
  onSee,
}: {
  lead: Lead
  date: string
  /** Goes to Trends */
  onSee: () => void
}) {
  const t = useTranslation()
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  // Said once: remember it was shown, so the next day brings another one or none.
  useEffect(() => {
    void updateLeadsSeen((seen) =>
      seen.today?.date === date && seen.today.key === lead.key
        ? seen
        : { ...seen, prompted: remember(seen.prompted, [lead.key]), today: { date, key: lead.key, dismissed: false } }
    )
  }, [date, lead.key])

  const close = () => updateLeadsSeen((seen) => ({ ...seen, today: { date, key: lead.key, dismissed: true } }))

  return (
    <section
      aria-label={t.leadHints.promptLabel}
      className="relative flex gap-3 rounded-[var(--radius-card)] py-3.5 pl-3.5 pr-12"
      style={{ background: 'var(--color-brand-soft)' }}
    >
      <span
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center"
        style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }}
        aria-hidden
      >
        <IconSparkles size={20} stroke={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold">{t.leadHints.promptLabel}</p>
        <p className="text-body mt-0.5">{leadSentence(lead, t.trends, nf, language)}</p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <button
            type="button"
            className={BUTTON}
            style={PRIMARY}
            onClick={() => {
              void close()
              onSee()
            }}
          >
            {t.leadHints.promptSee}
          </button>
          <button type="button" className={BUTTON} style={SECONDARY} onClick={() => void close()}>
            {t.leadHints.promptLater}
          </button>
        </div>
      </div>
      <Closer label={t.leadHints.close} onClick={() => void close()} />
    </section>
  )
}

/** "Your week in one sentence", on Sundays, when the gentlest days of the week have something in common. */
export function WeeklyCard({ finding, date, onSee }: { finding: WeeklyFinding; date: string; onSee: () => void }) {
  const t = useTranslation().leadHints
  const sentence =
    finding.kind === 'sleep' ? t.weeklySleep : format(t.weeklyAction, { action: actionInSentence(finding.action) })
  const close = () => void updateLeadsSeen((seen) => ({ ...seen, weekly: { date, dismissed: true } }))
  return (
    <section
      aria-label={t.weeklyLabel}
      className="relative rounded-[var(--radius-card)] py-3.5 pl-4 pr-12"
      style={{ background: 'var(--color-brand-soft)' }}
    >
      <p className="text-caption font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--color-brand)' }}>
        {t.weeklyLabel}
      </p>
      <p className="text-body font-medium mt-1">{sentence}</p>
      <button type="button" className={`${BUTTON} mt-2.5`} style={SECONDARY} onClick={onSee}>
        {t.weeklySee}
      </button>
      <Closer label={t.close} onClick={close} />
    </section>
  )
}

/** During a flare the trial asks for nothing: one calm line says it is still there. */
export function TrialPausedCard({ trial }: { trial: LeadTrial }) {
  const lh = useTranslation().leadHints
  return (
    <section aria-label={lh.trialLabel} className="rounded-[var(--radius-card)] px-4 py-3" style={{ background: 'var(--color-brand-soft)' }}>
      <p className="text-caption font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--color-brand)' }}>
        {lh.trialLabel} · {capitalise(trial.action)}
      </p>
      <p className="text-body mt-1">{lh.trialPaused}</p>
    </section>
  )
}

/** The one-week trial, on the day's page: where the week is while it runs, and what it showed once it is over. */
export function TrialCard({
  trial,
  entries,
  today,
  lead,
  choices,
}: {
  trial: LeadTrial
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
  const clear = () => void updateSettings({ leadTrial: undefined })

  if (!status.over) {
    return (
      <section aria-label={lh.trialLabel} className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-brand-soft)' }}>
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
    <section aria-label={lh.trialDoneLabel} className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-brand-soft)' }}>
      <p className="text-caption font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--color-brand)' }}>
        {lh.trialDoneLabel}
      </p>
      <p className="text-body font-semibold mt-1">{title}</p>
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
        <button type="button" className={BUTTON} style={keepable ? SECONDARY : PRIMARY} onClick={() => void updateSettings({ leadTrial: continueTrial(trial, today) })}>
          {lh.trialContinue}
        </button>
        <button type="button" className={BUTTON} style={SECONDARY} onClick={clear}>
          {lh.trialEnd}
        </button>
      </div>
    </section>
  )
}
