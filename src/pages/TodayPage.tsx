import { useState } from 'react'
import { LazyShareSheet } from '../components/weather/LazyShareSheet'
import { IS_DEMO } from '../lib/demoMode'
import { DailyEntryForm } from '../components/entry/DailyEntryForm'
import { Footer } from '../components/layout/Footer'
import { hasPain } from '../lib/loggedEntries'
import { useLoggedEntries, useTodayEntry } from '../hooks/useEntries'
import { useTodayMessages } from '../hooks/useTodayMessages'
import type { Tab } from '../components/layout/TabBar'
import { useSettings } from '../hooks/useSettings'
import { useTranslation } from '../i18n'
import { IconShare } from '@tabler/icons-react'
import { BackupReminderCard } from '../components/backup/BackupReminderCard'
import { TodayList } from '../components/today/TodayList'
import { useEarlyAccess } from '../lib/earlyAccess'
import { todayISO } from '../lib/dates'

export function TodayPage({ onGoToBackup, onGoToTab }: { onGoToBackup: () => void; onGoToTab: (tab: Tab) => void }) {
  const entry = useTodayEntry()
  const settings = useSettings()
  const t = useTranslation()
  const [sharing, setSharing] = useState(false)
  const date = todayISO()
  const earlyAccess = useEarlyAccess()

  // What waits for the person is one quiet line under the title, which opens a
  // list (never during a flare: the soft word of the hard days stands alone).
  // The backup reminder keeps its own card: losing the journal is the worst case.
  const logged = useLoggedEntries()
  const messages = useTodayMessages()

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      {!IS_DEMO && <BackupReminderCard onBackup={onGoToBackup} />}
      <DailyEntryForm
        date={date}
        onGoToBackup={IS_DEMO ? undefined : onGoToBackup}
        afterHeader={
          messages && logged ? <TodayList messages={messages} settings={settings} entries={logged} today={date} earlyAccess={earlyAccess} onGoToTab={onGoToTab} /> : undefined
        }
      />
      {entry && hasPain(entry) && (
        <button
          onClick={() => setSharing(true)}
          className="rounded-[var(--radius-control)] py-3.5 text-body font-semibold text-[var(--color-on-brand)] flex items-center justify-center gap-2"
          style={{ background: 'var(--cta-bg, var(--color-brand))' }}
        >
          <IconShare size={18} aria-hidden />
          {t.today.share}
        </button>
      )}
      {sharing && entry && hasPain(entry) && (
        <LazyShareSheet entry={entry} displayName={settings.displayName || undefined} onClose={() => setSharing(false)} />
      )}
      <Footer />
    </div>
  )
}
