import { useMemo, useState } from 'react'
import { CalendarHeatmap } from '../components/journal/CalendarHeatmap'
import { Card } from '../components/ui/Card'
import { DailyEntryForm } from '../components/entry/DailyEntryForm'
import { Footer } from '../components/layout/Footer'
import { ShareSheet } from '../components/weather/ShareSheet'
import { useAllEntries, useEntry, deleteEntry } from '../hooks/useEntries'
import { hasPain } from '../lib/loggedEntries'
import { useSettings } from '../hooks/useSettings'
import { useFlares } from '../hooks/useFlares'
import { flareDaySet } from '../lib/flares'
import { todayISO } from '../db'
import { useTranslation } from '../i18n'

export function JournalPage() {
  const entries = useAllEntries()
  const settings = useSettings()
  const t = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const selectedEntry = useEntry(selected ?? '__none__')
  const flares = useFlares()
  const flareDays = useMemo(() => flareDaySet(flares?.episodes ?? []), [flares])

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-title font-semibold px-1">{t.journal.title}</h1>

      <Card>
        <CalendarHeatmap entries={entries ?? []} onSelectDate={setSelected} selectedDate={selected ?? undefined} flareDays={flareDays} />
      </Card>

      {entries && entries.length === 0 && (
        <p className="text-control text-center mt-2" style={{ color: 'var(--color-ink-muted)' }}>
          {t.journal.empty}
        </p>
      )}

      {selected && (
        <div className="flex flex-col gap-3">
          <DailyEntryForm date={selected} />
          <div className="flex gap-3">
            {selectedEntry && hasPain(selectedEntry) && (
              <button
                onClick={() => setSharing(true)}
                className="flex-1 rounded-[var(--radius-control)] py-3 text-body font-semibold"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
              >
                {t.journal.share}
              </button>
            )}
            {selectedEntry?.id && selected !== todayISO() && (
              <button
                onClick={async () => {
                  if (confirm(t.journal.deleteConfirm)) {
                    await deleteEntry(selectedEntry.id!)
                    setSelected(null)
                  }
                }}
                className="rounded-[var(--radius-control)] py-3 px-5 text-body font-semibold"
                style={{ background: 'transparent', color: 'var(--color-weather-5-text)', border: '1px solid var(--color-hairline)' }}
              >
                {t.journal.delete}
              </button>
            )}
          </div>
        </div>
      )}

      {sharing && selectedEntry && hasPain(selectedEntry) && (
        <ShareSheet entry={selectedEntry} displayName={settings.displayName || undefined} onClose={() => setSharing(false)} />
      )}
      <Footer />
    </div>
  )
}
