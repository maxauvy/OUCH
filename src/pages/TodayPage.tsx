import { useState } from 'react'
import { DailyEntryForm } from '../components/entry/DailyEntryForm'
import { Footer } from '../components/layout/Footer'
import { ShareSheet } from '../components/weather/ShareSheet'
import { hasPain } from '../lib/loggedEntries'
import { useTodayEntry } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { todayISO } from '../db'
import { useTranslation } from '../i18n'
import { IconShare } from '@tabler/icons-react'
import { BackupReminderCard } from '../components/backup/BackupReminderCard'

export function TodayPage({ onGoToBackup }: { onGoToBackup: () => void }) {
  const entry = useTodayEntry()
  const settings = useSettings()
  const t = useTranslation()
  const [sharing, setSharing] = useState(false)
  const date = todayISO()

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <BackupReminderCard onBackup={onGoToBackup} />
      <DailyEntryForm date={date} />
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
