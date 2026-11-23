import type { CSSProperties } from 'react'
import { IconCheck, IconDice, IconNotebook } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { Lead, LeadChoices } from '../../lib/leads'
import { actionInSentence, actionKey, choiceFor } from '../../lib/leads'
import { archiveTrial, restartTrial, trialStatus, type LeadTrial, type TrialArm } from '../../lib/leadTrial'
import type { LoggedEntry } from '../../db/types'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { useEntry } from '../../hooks/useEntries'
import { RESCUE, WITH, WITHOUT, setHelped, trialCellStyle } from './trialStrip'
import { capitalise } from '../trends/leadTexts'
import { BUTTON, MARKER, PRIMARY, SECONDARY } from '../today/cardStyles'

type TrialCardProps = {
  trial: LeadTrial
  /** The trials closed before */
  history: LeadTrial[] | undefined
  entries: LoggedEntry[]
  today: string
  /** The lead as the notes read today, when it still is one */
  lead: Lead | undefined
  choices: LeadChoices | undefined
}

/** The trial, on the day's page: where it is while it runs, and what it showed once it is over. */
export function TrialCard(props: TrialCardProps) {
  return props.trial.plan ? <DrawnTrialCard {...props} /> : <WeekTrialCard {...props} />
}

const CARD: CSSProperties = { background: 'var(--color-brand-soft)', boxShadow: 'var(--tint-edge, none)' }
/** A trial on days drawn at random: tomorrow's day once today is logged, a way out on a day without, then the two sorts of days side by side. */
function DrawnTrialCard({ trial, history, entries, today, lead, choices }: TrialCardProps) {
  const t = useTranslation()
  const lh = t.leadHints
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const todayEntry = useEntry(today)
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const status = trialStatus(trial, entries, today)
  const action = actionInSentence(trial.action)
  const kept = choices?.[trial.key]?.choice === 'kept'
  const arm = (a: TrialArm) => format(a === 'with' ? lh.trialArmWith : lh.trialArmWithout, { action })
  const clear = () => void updateSettings({ leadTrial: undefined })
  const finish = () => void updateSettings({ leadTrial: undefined, leadTrialHistory: archiveTrial(history, trial) })
  const again = () => void updateSettings({ leadTrial: restartTrial(trial, today), leadTrialHistory: archiveTrial(history, trial) })

  const strip = (
    <div className="flex gap-1 mt-1 items-start" aria-hidden>
      {status.days.map((d) => (
        <span key={d.date} className={`flex-1 rounded-full ${d.date === today ? 'h-3.5 -mt-0.5' : 'h-2.5'}`} style={trialCellStyle(d)} />
      ))}
    </div>
  )
  const legend = (rescue: boolean) => (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption" style={{ color: 'var(--color-ink-muted)' }} aria-hidden>
      {(
        [
          [WITH, lh.trialLegendWith],
          [WITHOUT, lh.trialLegendWithout],
          ...(rescue ? [[RESCUE, lh.trialLegendRescue]] : []),
        ] as [string, string][]
      ).map(([bg, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="w-3.5 h-2 rounded-full" style={{ background: bg }} />
          {label}
        </span>
      ))}
    </div>
  )

  if (!status.over) {
    const i = status.day - 1
    const todayDay = i >= 0 ? status.days[i] : undefined
    const next = status.days[i + 1]
    const logged = entries.some((e) => e.date === today)
    // The rescue shows as soon as the action is in today's list, before the day's pain is logged.
    const notedToday = (todayEntry?.positiveActions ?? []).some((a) => actionKey(a) === actionKey(trial.action))
    const neededToday = todayDay?.arm === 'without' && notedToday
    // On a day with, the action can be noted from the card itself: the form may be in its light version, and a new action is not among its suggestions yet.
    const canDo = todayDay?.arm === 'with' && !notedToday
    const doneToday = todayDay?.arm === 'with' && notedToday
    const announce = (lead: string, a: TrialArm) => (
      <p className="text-body font-semibold mt-1" style={{ fontSize: '1.15rem', lineHeight: 1.3 }}>
        {lead}{' '}
        <span style={{ background: MARKER }}>{arm(a)}</span>.
      </p>
    )
    let body
    if (!todayDay && next) {
      body = (
        <>
          <div className="flex items-center gap-3">
            <IconDice size={34} stroke={1.6} aria-hidden style={{ color: 'var(--color-brand)', flex: 'none' }} />
            {announce(lh.trialTomorrowIs, next.arm!)}
          </div>
          <p className="text-caption leading-snug" style={{ color: 'var(--color-ink-muted)' }}>
            {lh.trialDrawnHow}
          </p>
        </>
      )
    } else if (todayDay && neededToday) {
      body = (
        <>
          <p className="text-body font-semibold mt-1" style={{ fontSize: '1.15rem', lineHeight: 1.3 }}>
            {lh.trialRescueTitle}
          </p>
          <p className="text-body leading-snug">{format(lh.trialRescueBody, { action })}</p>
          {logged && next && announce(lh.trialTomorrowIs, next.arm!)}
        </>
      )
    } else if (todayDay && logged) {
      body = next ? (
        <>
          <div className="flex items-center gap-3">
            <IconDice size={34} stroke={1.6} aria-hidden style={{ color: 'var(--color-brand)', flex: 'none' }} />
            {announce(lh.trialTomorrowIs, next.arm!)}
          </div>
          <p className="text-caption leading-snug" style={{ color: 'var(--color-ink-muted)' }}>
            {format(lh.trialWas, { arm: arm(todayDay.arm!) })} {lh.trialDrawnHow}
          </p>
        </>
      ) : (
        <p className="text-body font-semibold mt-1">{lh.trialLastDone}</p>
      )
    } else if (todayDay) {
      body = (
        <>
          {announce(lh.trialTodayIs, todayDay.arm!)}
          <p className="text-caption leading-snug" style={{ color: 'var(--color-ink-muted)' }}>
            {todayDay.arm === 'with' ? format(lh.trialWithHint, { action, where: t.entryForm.positiveActionsTitle }) : lh.trialWithoutHint}
          </p>
        </>
      )
    }
    const canNeed = todayDay?.arm === 'without' && !neededToday
    return (
      <section aria-label={lh.trialLabel} className="rounded-[var(--radius-card)] p-4 flex flex-col gap-2.5" style={CARD}>
        <p className="text-caption font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--color-brand)' }}>
          {todayDay ? format(lh.trialDrawnDay, { day: status.day, n: status.length }, language) : lh.trialStartsTomorrow}
        </p>
        {body}
        {strip}
        {legend(status.days.some((d) => d.rescue) || !!neededToday)}
        {doneToday && (
          <p className="flex items-center gap-1.5 text-caption" style={{ color: 'var(--color-brand)' }}>
            <IconCheck size={16} aria-hidden />
            {format(lh.trialDidItNoted, { where: t.entryForm.positiveActionsTitle })}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {canDo && (
            <button type="button" className={BUTTON} style={SECONDARY} onClick={() => void setHelped(today, todayEntry?.positiveActions, trial.action, true)}>
              {lh.trialDidIt}
            </button>
          )}
          {canNeed && (
            <button type="button" className={BUTTON} style={SECONDARY} onClick={() => void setHelped(today, todayEntry?.positiveActions, trial.action, true)}>
              {lh.trialNeedIt}
            </button>
          )}
          {neededToday && (
            <button type="button" className={BUTTON} style={SECONDARY} onClick={() => void setHelped(today, todayEntry?.positiveActions, trial.action, false)}>
              {lh.trialRescueUndo}
            </button>
          )}
          <button type="button" className={BUTTON} style={{ color: 'var(--color-ink-muted)' }} onClick={clear}>
            {lh.trialStop}
          </button>
        </div>
      </section>
    )
  }

  const r = status.result
  const withSide = r && { mean: r.with.mean, label: format(t.trends.leadActionHigh, { action }) }
  const withoutSide = r && { mean: r.without.mean, label: arm('without') }
  // The softer days on the left, as on the lead's card.
  const [soft, hard] = r && withSide && withoutSide ? (r.gap <= 0 ? [withSide, withoutSide] : [withoutSide, withSide]) : [null, null]
  const keepable = !kept && lead
  return (
    <section aria-label={lh.trialDoneLabel} className="rounded-[var(--radius-card)] p-4 flex flex-col gap-2.5" style={CARD}>
      <p className="text-caption font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--color-brand)' }}>
        {lh.trialDoneLabel}
      </p>
      <p className="text-body font-semibold">{format(lh.trialDrawnTitle, { action: capitalise(trial.action), n: status.length }, language)}</p>
      {r && soft && hard ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
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
          {r.next && (
            <div className="rounded-xl px-3.5 py-3" style={{ background: 'var(--color-surface)' }}>
              <p className="text-caption font-semibold">{lh.trialNextTitle}</p>
              <p className="text-body leading-snug">{format(lh.trialNextLine, { a: nf.format(r.next.with.mean), b: nf.format(r.next.without.mean) }, language)}</p>
            </div>
          )}
          <p className="text-caption leading-snug" style={{ color: 'var(--color-ink-muted)' }}>
            {lh.trialDrawnFair}
            {!!r.rescues && ` ${format(lh.trialRescues, { n: r.rescues }, language)}`} {format(lh.trialDrawnSmall, { n: status.length }, language)}
          </p>
        </>
      ) : (
        <p className="text-caption leading-snug" style={{ color: 'var(--color-ink-muted)' }}>
          {lh.trialDrawnFew}
        </p>
      )}
      {kept && (
        <p className="flex items-center gap-1.5 text-caption" style={{ color: 'var(--color-brand)' }}>
          <IconNotebook size={16} aria-hidden />
          {lh.trialKept}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {keepable && r && (
          <button
            type="button"
            className={BUTTON}
            style={PRIMARY}
            onClick={() => void updateSettings({ leadChoices: { ...choices, [trial.key]: choiceFor(lead, 'kept', Date.now()) }, leadTrial: undefined, leadTrialHistory: archiveTrial(history, trial) })}
          >
            {lh.trialKeep}
          </button>
        )}
        <button type="button" className={BUTTON} style={keepable && r ? SECONDARY : PRIMARY} onClick={again}>
          {format(lh.trialAgain, { n: status.length }, language)}
        </button>
        <button type="button" className={BUTTON} style={SECONDARY} onClick={finish}>
          {lh.trialEnd}
        </button>
      </div>
    </section>
  )
}

/** A week started before the draw came in: the days with the action are the ones the person noted it on. */
function WeekTrialCard({
  trial,
  history,
  entries,
  today,
  lead,
  choices,
}: TrialCardProps) {
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
        <button type="button" className={BUTTON} style={keepable ? SECONDARY : PRIMARY} onClick={() => void updateSettings({ leadTrial: restartTrial(trial, today), leadTrialHistory: archiveTrial(history, trial) })}>
          {format(lh.trialAgain, { n: 10 }, language)}
        </button>
        <button type="button" className={BUTTON} style={SECONDARY} onClick={finish}>
          {lh.trialEnd}
        </button>
      </div>
    </section>
  )
}
