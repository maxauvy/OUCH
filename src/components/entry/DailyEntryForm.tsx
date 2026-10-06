import { useEffect, useMemo, useRef, useState } from 'react'
import type { DailyEntry } from '../../db/types'
import { useAllEntries, useEntry, upsertEntry } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { useMedications } from '../../hooks/useMedications'
import { defaultIntakes } from '../../lib/medications'
import { useTranslation } from '../../i18n'
import { HealthEntryLayout } from './HealthEntryLayout'

export function DailyEntryForm({ date }: { date: string }) {
  const dbEntry = useEntry(date)
  const settings = useSettings()
  const allEntries = useAllEntries()
  const medications = useMedications()
  const t = useTranslation()
  const [local, setLocal] = useState<Partial<DailyEntry>>(() => dbEntry ?? {})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dirtyRef = useRef(false)
  const pendingRef = useRef({ date, local })

  // Reload the draft when another day is shown or the stored entry changes
  // (first load, a save, an import). Done during render rather than in an
  // effect, so the form never paints a frame with the previous day's values.
  const syncKey = `${date}|${dbEntry?.id}|${dbEntry?.updatedAt}`
  const [syncedKey, setSyncedKey] = useState(syncKey)
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey)
    setLocal(dbEntry ?? {})
  }

  // A brand-new day starts with its ongoing treatments ticked as taken, so
  // only a missed dose needs a tap. Never applied to a day already saved:
  // that would rewrite history for days logged before a treatment existed.
  const medicationsEnabled = settings.enabledFactors.includes('medications')
  const draft = useMemo<Partial<DailyEntry>>(
    () =>
      !dbEntry && local.intakes === undefined && medications && medicationsEnabled
        ? { ...local, intakes: defaultIntakes(medications, date) }
        : local,
    [dbEntry, local, medications, medicationsEnabled, date]
  )

  useEffect(() => {
    pendingRef.current = { date, local: draft }
    const t = setTimeout(() => {
      if (!dirtyRef.current) return
      dirtyRef.current = false
      setSaveState('saving')
      upsertEntry(date, draft)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('idle'))
    }, 350)
    return () => clearTimeout(t)
  }, [draft, date])

  // Flushes a still-pending edit when the user navigates to another day or
  // away from this form before the debounce above fires — otherwise it's
  // silently discarded (clearTimeout with no save) instead of ever written.
  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return
      dirtyRef.current = false
      const { date: pendingDate, local: pendingLocal } = pendingRef.current
      upsertEntry(pendingDate, pendingLocal).catch(() => {})
    }
  }, [date])

  function setField<K extends keyof DailyEntry>(key: K, value: DailyEntry[K]) {
    dirtyRef.current = true
    setLocal((prev) => ({ ...prev, [key]: value }))
  }

  const knownPositiveActions = Array.from(
    new Set([
      ...(allEntries ?? []).flatMap((e) => e.positiveActions ?? []),
      ...t.entryForm.positiveActionsSuggestions,
    ])
  )

  return (
    <HealthEntryLayout
      date={date}
      local={draft}
      setField={setField}
      settings={settings}
      saveState={saveState}
      allEntries={allEntries ?? []}
      entriesLoaded={allEntries !== undefined}
      medications={medications ?? []}
      knownPositiveActions={knownPositiveActions}
    />
  )
}
