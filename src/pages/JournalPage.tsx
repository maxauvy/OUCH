import { useMemo, useState } from 'react'
import { LazyShareSheet } from '../components/weather/LazyShareSheet'
import { CalendarHeatmap } from '../components/journal/CalendarHeatmap'
import { Card } from '../components/ui/Card'
import { DailyEntryForm } from '../components/entry/DailyEntryForm'
import { Footer } from '../components/layout/Footer'
import { useAllEntries, useEntry, deleteEntry } from '../hooks/useEntries'
import { hasPain } from '../lib/loggedEntries'
import { useSettings } from '../hooks/useSettings'
import { useFlares } from '../hooks/useFlares'
import { flareDaySet } from '../lib/flares'
import { markedDaySet } from '../lib/markedFlares'
import { todayISO } from '../lib/dates'
import { useTranslation } from '../i18n'
import { useRichLook } from '../lib/look'
import { PageSky } from '../components/entry/TodaySky'

/** `openDate`: a day to open at once (the offer to write yesterday). */
export function JournalPage({ openDate }: { openDate?: string | null }) {
  const entries = useAllEntries()
  const settings = useSettings()
  const t = useTranslation()
  // The weather look shows the month as a mosaic, straight on the page.
  const mosaic = useRichLook()
  const [selected, setSelected] = useState<string | null>(openDate ?? null)
  const [sharing, setSharing] = useState(false)
  const selectedEntry = useEntry(selected ?? '__none__')
  const flares = useFlares()
  const flareDays = useMemo(() => flareDaySet(flares?.episodes ?? []), [flares])
  const markedDays = useMemo(() => markedDaySet(settings.markedFlares, todayISO()), [settings.markedFlares])

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <PageSky />
      {/* The weather look: the page's name is a small line, and the month below it is the big title. */}
      <h1 className={mosaic ? 'kicker text-control font-medium px-1 -mb-3' : 'text-title font-semibold px-1'} style={mosaic ? { color: 'var(--color-ink-muted)' } : undefined}>
        {t.journal.title}
      </h1>

      {mosaic ? (
        <CalendarHeatmap mosaic entries={entries ?? []} onSelectDate={setSelected} selectedDate={selected ?? undefined} flareDays={flareDays} markedDays={markedDays} />
      ) : (
        <Card>
          <CalendarHeatmap entries={entries ?? []} onSelectDate={setSelected} selectedDate={selected ?? undefined} flareDays={flareDays} markedDays={markedDays} />
        </Card>
      )}

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
                className="btn-secondary flex-1"
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
        <LazyShareSheet entry={selectedEntry} displayName={settings.displayName || undefined} onClose={() => setSharing(false)} />
      )}
      <Footer />
    </div>
  )
}
