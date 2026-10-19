import { useMemo, useState } from 'react'
import { IS_DEMO } from '../lib/demoMode'
import { DailyEntryForm } from '../components/entry/DailyEntryForm'
import { Footer } from '../components/layout/Footer'
import { ShareSheet } from '../components/weather/ShareSheet'
import { hasPain } from '../lib/loggedEntries'
import { useLoggedEntries, useTodayEntry } from '../hooks/useEntries'
import { useLeadList } from '../hooks/useLeadList'
import { flareUnderWay } from '../lib/hardDays'
import { leadToBring, weeklyVisible } from '../lib/leadHints'
import { triedKeys } from '../lib/leadTrial'
import { weeklyFinding } from '../lib/weeklySentence'
import { LeadPromptCard, TrialCard, TrialPausedCard, WeeklyCard } from '../components/entry/LeadHintCards'
import type { Tab } from '../components/layout/TabBar'
import { useSettings } from '../hooks/useSettings'
import { todayISO } from '../db'
import { useTranslation } from '../i18n'
import { IconShare } from '@tabler/icons-react'
import { BackupReminderCard } from '../components/backup/BackupReminderCard'

export function TodayPage({ onGoToBackup, onGoToTab }: { onGoToBackup: () => void; onGoToTab: (tab: Tab) => void }) {
  const entry = useTodayEntry()
  const settings = useSettings()
  const t = useTranslation()
  const [sharing, setSharing] = useState(false)
  const date = todayISO()

  // The leads reach the day's page softly: never in a flare, and the one after
  // the entry only once today's pain is logged. Until the diary is read, nothing.
  const logged = useLoggedEntries()
  const leadList = useLeadList()
  const flare = logged ? flareUnderWay(logged, date) : true
  const painLogged = !!entry && hasPain(entry)
  // Where the card goes: at the top when the page opens with the pain already
  // logged (nothing moves under the fingers), below the form when it is logged
  // during this visit (the form does not shift while it is being filled in).
  const [loggedAtOpen, setLoggedAtOpen] = useState<boolean | null>(null)
  if (loggedAtOpen === null && logged) setLoggedAtOpen(logged.some((e) => e.date === date))
  const bring = leadList
    ? leadToBring({
        shown: leadList.shown,
        choices: settings.leadChoices,
        seen: settings.leadsSeen,
        today: date,
        enabled: settings.leadPromptEnabled,
        quiet: flare || !painLogged,
        tried: triedKeys(settings.leadTrial, settings.leadTrialHistory),
      })
    : null
  const weekly = useMemo(
    () => (logged && settings.weeklySentenceEnabled ? weeklyFinding(logged, date, flare) : null),
    [logged, settings.weeklySentenceEnabled, date, flare]
  )
  const trial = settings.leadTrial
  const trialLead = trial && leadList ? [...leadList.shown, ...leadList.dismissed].find((l) => l.key === trial.key) : undefined

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      {!IS_DEMO && <BackupReminderCard onBackup={onGoToBackup} />}
      {trial && logged && (flare ? <TrialPausedCard trial={trial} /> : <TrialCard trial={trial} history={settings.leadTrialHistory} entries={logged} today={date} lead={trialLead} choices={settings.leadChoices} />)}
      {weekly && weeklyVisible(settings.leadsSeen, date) && <WeeklyCard finding={weekly} date={date} onSee={() => onGoToTab('journal')} />}
      {bring && loggedAtOpen && <LeadPromptCard lead={bring} date={date} onSee={() => onGoToTab('trends')} />}
      <DailyEntryForm date={date} onGoToBackup={IS_DEMO ? undefined : onGoToBackup} />
      {bring && loggedAtOpen === false && <LeadPromptCard lead={bring} date={date} onSee={() => onGoToTab('trends')} />}
      {entry && hasPain(entry) && (
        <button
          onClick={() => setSharing(true)}
          className="rounded-[var(--radius-control)] py-3.5 text-body font-semibold text-[var(--color-on-brand)] flex items-center justify-center gap-2"
          style={{ background: 'var(--color-brand)' }}
        >
          <IconShare size={18} aria-hidden />
          {t.today.share}
        </button>
      )}
      {sharing && entry && hasPain(entry) && (
        <ShareSheet entry={entry} displayName={settings.displayName || undefined} onClose={() => setSharing(false)} />
      )}
      <Footer />
    </div>
  )
}
