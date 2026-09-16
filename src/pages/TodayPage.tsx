import { useState } from 'react'
import { DailyEntryForm } from '../components/entry/DailyEntryForm'
import { ShareSheet } from '../components/weather/ShareSheet'
import { useTodayEntry } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { todayISO } from '../db'

export function TodayPage() {
  const entry = useTodayEntry()
  const settings = useSettings()
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
          Partager ma météo du jour
        </button>
      )}
      {sharing && entry && (
        <ShareSheet entry={entry} displayName={settings.displayName || undefined} onClose={() => setSharing(false)} />
      )}
    </div>
  )
}
