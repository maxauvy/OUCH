import { useState, type ReactNode } from 'react'
import { format as formatDate } from 'date-fns'
import { IconAdjustmentsHorizontal, IconBell, IconCalendarEvent, IconCloudRain, IconCalendarMonth, IconCalendarWeek, IconBarbell, IconLeaf, IconPill, IconSparkles, IconSun, type Icon } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { LoggedEntry, Settings } from '../../db/types'
import { useLeadList } from '../../hooks/useLeadList'
import { formatIllnessList } from '../../lib/illnessNames'
import { snoozeInvite } from '../../lib/indicatorInvite'
import { frenchOfMonth } from '../../lib/monthName'
import { actionInSentence } from '../../lib/leads'
import type { ActivityIllness } from '../../lib/activityEvidence'
import { updateLeadsSeen } from '../../lib/leadsSeenStore'
import { DROP_HPA } from '../../lib/forecast'
import { markDone, postpone, type TodayMessage, type TodayMessages } from '../../lib/todayMessages'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { TrialCard } from '../entry/LeadHintCards'
import { BUTTON, PRIMARY, SECONDARY } from './cardStyles'
import { InviteSheet } from '../home/InviteSheet'
import { leadDayNote, leadSentence } from '../trends/leadTexts'
import { ModalSheet } from '../ui/ModalSheet'
import { ReminderSettings } from '../settings/ReminderSettings'
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
  /** `date` opens that day in the journal. */
  onGoToTab: (tab: Tab, date?: string) => void
}) {
  const t = useTranslation()
  const language = useLanguage()
  const { intlLocale, dateFnsLocale } = useLocale()
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const leadList = useLeadList()
  const [open, setOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const lh = t.leadHints

  const later = (key: string) => setLater((m) => postpone(m, key, today))
  const done = (key: string) => setLater((m) => markDone(m, key))

  function card(m: TodayMessage): ReactNode {
    switch (m.kind) {
      case 'reminder':
        // Offered once instead of at the first opening; it goes away by itself once a reminder is set (`reminderOfferDue`).
        return (
          <ListCard
            key={m.key}
            icon={IconBell}
            label={t.reminderOffer.label}
            actions={[
              {
                label: t.reminderOffer.choose,
                primary: true,
                onClick: () => {
                  setOpen(false)
                  setReminderOpen(true)
                },
              },
              { label: t.reminderOffer.later, onClick: () => later(m.key) },
            ]}
          >
            <p className="text-body mt-0.5">{t.reminderOffer.body}</p>
          </ListCard>
        )
      case 'yesterday':
        return (
          <ListCard
            key={m.key}
            icon={IconCalendarEvent}
            label={t.todayList.yesterdayLabel}
            actions={[
              {
                label: t.todayList.yesterdayDo,
                primary: true,
                onClick: () => {
                  done(m.key)
                  setOpen(false)
                  onGoToTab('journal', m.date)
                },
              },
              { label: t.todayList.yesterdaySkip, onClick: () => done(m.key) },
            ]}
          >
            <p className="text-body mt-0.5">{t.todayList.yesterdayText}</p>
          </ListCard>
        )
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
      case 'rest':
        return (
          <ListCard key={m.key} icon={IconLeaf} label={t.pacing.restLabel} actions={[{ label: t.pacing.restThanks, primary: true, onClick: () => done(m.key) }]}>
            <p className="text-body mt-0.5">{t.pacing.restText}</p>
          </ListCard>
        )
      case 'weather': {
        const r = m.reading
        const band = r.low === r.high ? String(r.low) : format(t.forecast.band, { low: r.low, high: r.high }, language)
        return (
          <ListCard key={m.key} icon={IconCloudRain} label={t.forecast.label} actions={[{ label: t.forecast.thanks, primary: true, onClick: () => done(m.key) }]}>
            <p className="text-body mt-0.5">{format(t.forecast.text, { fall: r.fall, drop: DROP_HPA, observed: r.observed, k: r.k, band }, language)}</p>
          </ListCard>
        )
      }
      case 'activity': {
        return (
          <ListCard
            key={m.key}
            icon={IconBarbell}
            label={t.activity.label}
            actions={[
              { label: t.activity.thanks, primary: true, onClick: () => done(m.key) },
            ]}
          >
            <p className="text-body mt-0.5">{t.activity.intro}</p>
            <ul className="text-body mt-2 flex flex-col gap-1.5">
              {m.illnesses.map((i) => (
                <li key={i}>{t.activity.items[i].short}</li>
              ))}
            </ul>
            <ActivityDetail illnesses={m.illnesses} />
            <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
              {t.activity.pace}
            </p>
          </ListCard>
        )
      }
      case 'goodDay': {
        const g = t.beforeGoodDays
        const r = m.line
        const chance = r.high === 0 ? t.beforeFlares.chanceNone : format(r.low === r.high ? t.beforeFlares.chanceOne : t.beforeFlares.chanceRange, { lo: r.low, hi: r.high }, language)
        return (
          <ListCard
            key={m.key}
            icon={IconSun}
            label={g.hintLabel}
            actions={[
              { label: g.hintThanks, primary: true, onClick: () => done(m.key) },
              {
                label: g.hintSee,
                onClick: () => {
                  done(m.key)
                  setOpen(false)
                  onGoToTab('trends')
                },
              },
            ]}
          >
            <p className="text-body mt-0.5">{format(g.hintText, { what: g.measures[r.key].short, k: r.observed, n: r.n, chance }, language)}</p>
            <p className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {g.hintNote}
            </p>
          </ListCard>
        )
      }
      case 'regularity':
        return (
          <ListCard key={m.key} icon={IconPill} label={t.regularity.label} actions={[{ label: t.regularity.thanks, primary: true, onClick: () => done(m.key) }]}>
            <p className="text-body mt-0.5">{format(t.regularity.text, { missed: m.reading.missed, name: m.reading.name }, language)}</p>
          </ListCard>
        )
      case 'calm': {
        const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale: dateFnsLocale })
        return (
          <ListCard key={m.key} icon={IconLeaf} label={lh.calmLabel} actions={[{ label: lh.calmThanks, primary: true, onClick: () => done(m.key) }]}>
            <p className="text-body mt-0.5">
              {format(lh.calmBody, { start: day(m.episode.start), end: day(m.episode.end), n: m.episode.recoveryDays ?? 1 }, language)}
            </p>
          </ListCard>
        )
      }
      case 'month': {
        const s = m.summary
        const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale: dateFnsLocale })
        const month = formatDate(new Date(s.first + 'T00:00:00'), 'LLLL', { locale: dateFnsLocale })
        return (
          <ListCard key={m.key} icon={IconCalendarMonth} label={format(lh.monthLabel, { month: language === 'fr' ? frenchOfMonth(month) : month }, language)} actions={[{ label: lh.monthThanks, primary: true, onClick: () => done(m.key) }]}>
            <p className="text-body mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
              {lh.monthIntro}
            </p>
            <ul className="text-body mt-1.5 flex flex-col gap-1">
              {s.trials > 0 && <li>{format(lh.monthTrials, { n: s.trials }, language)}</li>}
              {s.softestWeek && (
                <li>{format(lh.monthSoftest, { start: day(s.softestWeek.start), end: day(s.softestWeek.end), mean: nf.format(s.softestWeek.mean) }, language)}</li>
              )}
              {s.back && <li>{format(lh.monthBack, { flares: s.back.flares, days: s.back.days }, language)}</li>}
            </ul>
          </ListCard>
        )
      }
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
      {reminderOpen && (
        <ModalSheet title={t.reminderOffer.title} closeLabel={t.reminderOffer.close} onClose={() => setReminderOpen(false)}>
          <p className="text-body mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            {t.reminderOffer.intro}
          </p>
          <ReminderSettings primary />
        </ModalSheet>
      )}
    </>
  )
}

/** The fuller sentences with their sources, behind one tap: the card stays short. */
function ActivityDetail({ illnesses }: { illnesses: ActivityIllness[] }) {
  const t = useTranslation().activity
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="text-control font-semibold underline underline-offset-2 min-h-11" style={{ color: 'var(--color-brand)' }}>
        {open ? t.hideMore : t.showMore}
      </button>
      {open && (
        <ul className="text-caption flex flex-col gap-2" style={{ color: 'var(--color-ink-muted)' }}>
          {illnesses.map((i) => (
            <li key={i}>{t.items[i].more}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
