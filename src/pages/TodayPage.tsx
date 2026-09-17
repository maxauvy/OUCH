import { useState } from 'react'
import { DailyEntryForm } from '../components/entry/DailyEntryForm'
import { Footer } from '../components/layout/Footer'
import { ShareSheet } from '../components/weather/ShareSheet'
import { useTodayEntry } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { todayISO } from '../db'
import { useTranslation } from '../i18n'

export function TodayPage() {
  const entry = useTodayEntry()
  const settings = useSettings()
  const t = useTranslation()
  const [sharing, setSharing] = useState(false)
  const date = todayISO()

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <DailyEntryForm date={date} />
      {entry && (
        <button
          onClick={() => setSharing(true)}
          className="rounded-full py-3.5 text-[15px] font-semibold text-white shadow-sm"
          style={{ background: 'var(--color-brand)' }}
        >
          {t.today.share}
        </button>
      )}
      {sharing && entry && (
        <ShareSheet entry={entry} displayName={settings.displayName || undefined} onClose={() => setSharing(false)} />
      )}
      <Footer />
    </div>
  )
}
