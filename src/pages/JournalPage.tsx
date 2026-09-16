import { useState } from 'react'
import { CalendarHeatmap } from '../components/journal/CalendarHeatmap'
import { Card } from '../components/ui/Card'
import { DailyEntryForm } from '../components/entry/DailyEntryForm'
import { ShareSheet } from '../components/weather/ShareSheet'
import { useAllEntries, useEntry, deleteEntry } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { todayISO } from '../db'

export function JournalPage() {
  const entries = useAllEntries()
  const settings = useSettings()
  const [selected, setSelected] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const selectedEntry = useEntry(selected ?? '__none__')

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-[22px] font-semibold px-1">Journal</h1>

      <Card>
        <CalendarHeatmap entries={entries ?? []} onSelectDate={setSelected} selectedDate={selected ?? undefined} />
      </Card>

      {entries && entries.length === 0 && (
        <p className="text-[14px] text-center mt-2" style={{ color: 'var(--color-ink-muted)' }}>
          Aucune entrée pour l'instant. Ta première météo du jour apparaîtra ici.
        </p>
      )}

      {selected && (
        <div className="flex flex-col gap-3">
          <DailyEntryForm date={selected} />
          <div className="flex gap-3">
            {selectedEntry && (
              <button
                onClick={() => setSharing(true)}
                className="flex-1 rounded-full py-3 text-[15px] font-semibold"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
              >
                Partager ce jour
              </button>
            )}
            {selectedEntry?.id && selected !== todayISO() && (
              <button
                onClick={async () => {
                  if (confirm("Supprimer l'entrée de ce jour ?")) {
                    await deleteEntry(selectedEntry.id!)
                    setSelected(null)
                  }
                }}
                className="rounded-full py-3 px-5 text-[15px] font-semibold"
                style={{ background: 'transparent', color: 'var(--color-weather-5, #574a7a)', border: '1px solid var(--color-hairline)' }}
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}

      {sharing && selectedEntry && (
        <ShareSheet entry={selectedEntry} displayName={settings.displayName || undefined} onClose={() => setSharing(false)} />
      )}
    </div>
  )
}
