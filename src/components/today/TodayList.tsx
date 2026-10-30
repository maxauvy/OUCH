import { useState, type ReactNode } from 'react'
import { IconAdjustmentsHorizontal, IconCalendarWeek, IconRepeat, IconSparkles, type Icon } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { LoggedEntry, Settings } from '../../db/types'
import { useLeadList } from '../../hooks/useLeadList'
import { daysBetween } from '../../lib/dates'
import { formatIllnessList } from '../../lib/childView'
import { snoozeInvite } from '../../lib/indicatorInvite'
import { actionInSentence } from '../../lib/leads'
import { restartTrial } from '../../lib/leadTrial'
import { updateLeadsSeen } from '../../lib/leadsSeenStore'
import { markDone, postpone, type TodayMessage, type TodayMessages } from '../../lib/todayMessages'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { TrialCard } from '../entry/LeadHintCards'
import { BUTTON, PRIMARY, SECONDARY } from './cardStyles'
import { InviteSheet } from '../home/InviteSheet'
import { leadDayNote, leadSentence } from '../trends/leadTexts'
import { ModalSheet } from '../ui/ModalSheet'
import type { Tab } from '../layout/TabBar'

interface CardAction {
  label: string
  onClick: () => void
  primary?: boolean
}

/** A message of the list: the soft tinted card of the day's page, without a cross (the list has "later"). */
function ListCard({ icon: I, label, actions, children }: { icon: Icon; label: string; actions: CardAction[]; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex gap-3 rounded-[var(--radius-card)] py-3.5 px-3.5" style={{ background: 'var(--color-brand-soft)', boxShadow: 'var(--tint-edge, none)' }}>
      <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }} aria-hidden>
        <I size={20} stroke={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold">{label}</p>
        {children}
        <div className="flex flex-wrap gap-2 mt-2.5">
          {actions.map((a) => (
            <button key={a.label} type="button" className={BUTTON} style={a.primary ? PRIMARY : SECONDARY} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

const setLater = (change: (later: ReturnType<typeof postpone> | undefined) => ReturnType<typeof postpone>) =>
  void updateLeadsSeen((seen) => ({ ...seen, later: change(seen.later) }))

/** The quiet line under the title of the day's page ("3 small things for you") and the sheet it opens. Looking
 * at the sheet changes nothing: a message leaves it when it is acted on, or set aside with "later". */
export function TodayList({
  messages,
  settings,
  entries,
  today,
  earlyAccess,
  onGoToTab,
}: {
  messages: TodayMessages
  settings: Settings
  entries: LoggedEntry[]
  today: string
  earlyAccess: boolean
  onGoToTab: (tab: Tab) => void
}) {
  const t = useTranslation()
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const leadList = useLeadList()
  const [open, setOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const lh = t.leadHints

  const later = (key: string) => setLater((m) => postpone(m, key, today))
  const done = (key: string) => setLater((m) => markDone(m, key))

  function card(m: TodayMessage): ReactNode {
    switch (m.kind) {
      case 'lead': {
        const note = leadDayNote(m.lead, t.trends)
        return (
          <ListCard
            key={m.key}
            icon={IconSparkles}
            label={lh.promptLabel}
            actions={[
              {
                label: lh.promptSee,
                primary: true,
                onClick: () => {
                  done(m.key)
                  setOpen(false)
                  onGoToTab('trends')
                },
              },
              { label: lh.promptLater, onClick: () => later(m.key) },
            ]}
          >
            <p className="text-body mt-0.5">{leadSentence(m.lead, t.trends, nf, language, 'day')}</p>
            {note && (
              <p className="text-body mt-1" style={{ color: 'var(--color-ink-muted)' }}>
                {note}
              </p>
            )}
          </ListCard>
        )
      }
      case 'weekly':
        return (
          <ListCard
            key={m.key}
            icon={IconCalendarWeek}
            label={lh.weeklyLabel}
            actions={[
              {
                label: lh.weeklySee,
                primary: true,
                onClick: () => {
                  done(m.key)
                  setOpen(false)
                  onGoToTab('journal')
                },
              },
              { label: lh.promptLater, onClick: () => later(m.key) },
            ]}
          >
            <p className="text-body font-medium mt-0.5">
              {m.finding.kind === 'sleep' ? lh.weeklySleep : format(lh.weeklyAction, { action: actionInSentence(m.finding.action) })}
            </p>
          </ListCard>
        )
      case 'repeat': {
        const weeks = Math.round(daysBetween(m.trial.end, today) / 7)
        return (
          <ListCard
            key={m.key}
            icon={IconRepeat}
            label={lh.repeatLabel}
            actions={[
              {
                label: t.trends.leadTrialStart,
                primary: true,
                onClick: () => {
                  done(m.key)
                  void updateLeadsSeen((seen) => ({ ...seen, repeatShown: { ...seen.repeatShown, [m.trial.key]: today } }))
                  void updateSettings({ leadTrial: restartTrial(m.trial, today) })
                },
              },
              { label: t.trends.leadTrialLater, onClick: () => later(m.key) },
            ]}
          >
            <p className="text-body mt-0.5">{format(lh.repeatBody, { action: actionInSentence(m.trial.action), n: weeks }, language)}</p>
          </ListCard>
        )
      }
      case 'invite':
        return (
          <ListCard
            key={m.key}
            icon={IconAdjustmentsHorizontal}
            label={t.indicatorInvite.region}
            actions={[
              {
                label: t.indicatorInvite.see,
                primary: true,
                onClick: () => {
                  setOpen(false)
                  setInviteOpen(true)
                },
              },
              { label: t.indicatorInvite.later, onClick: () => void updateSettings(snoozeInvite(settings, today)) },
            ]}
          >
            <p className="text-body mt-0.5">{format(t.indicatorInvite.banner, { list: formatIllnessList(language, settings.illnesses) })}</p>
          </ListCard>
        )
      case 'trial': {
        const lead = leadList ? [...leadList.shown, ...leadList.dismissed].find((l) => l.key === m.trial.key) : undefined
        return <TrialCard key={m.key} trial={m.trial} history={settings.leadTrialHistory} entries={entries} today={today} lead={lead} choices={settings.leadChoices} />
      }
    }
  }

  return (
    <>
      {messages.items.length > 0 && (
        <div className="px-1 flex items-center gap-2 text-control" style={{ color: 'var(--color-ink-muted)' }}>
          <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-brand)' }} />
          <p className="flex-1">{messages.count > 0 ? format(t.todayList.line, { n: messages.count }, language) : t.todayList.trialLine}</p>
          <button type="button" onClick={() => setOpen(true)} className="font-semibold underline underline-offset-2 min-h-11 px-1" style={{ color: 'var(--color-brand)' }}>
            {t.todayList.see}
          </button>
        </div>
      )}
      {open && messages.items.length > 0 && (
        <ModalSheet title={t.todayList.sheetTitle} closeLabel={t.todayList.close} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">{messages.items.map(card)}</div>
        </ModalSheet>
      )}
      {inviteOpen && <InviteSheet settings={settings} earlyAccess={earlyAccess} today={today} onClose={() => setInviteOpen(false)} />}
    </>
  )
}
