import { useEffect, useRef, useState } from 'react'
import type { BodyZone, DailyEntry } from '../../db/types'
import { BODY_ZONES } from '../../db/types'
import { useAllEntries, useEntry, upsertEntry } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { Slider } from '../ui/Slider'
import { Card, SectionTitle } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { TagInput } from './TagInput'
import { WeatherField } from './WeatherField'
import { computePainWeather } from '../../lib/painWeather'
import { WeatherIcon } from '../ui/WeatherIcon'
import { Toggle } from '../ui/Toggle'
import { useLocale, useTranslation } from '../../i18n'

function formatDateHeading(date: string, intlLocale: string): string {
  const d = new Date(date + 'T00:00:00')
  const label = d.toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function DailyEntryForm({ date }: { date: string }) {
  const dbEntry = useEntry(date)
  const settings = useSettings()
  const allEntries = useAllEntries()
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const [local, setLocal] = useState<Partial<DailyEntry>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dirtyRef = useRef(false)
  const pendingRef = useRef({ date, local })

  useEffect(() => {
    setLocal(dbEntry ?? {})
  }, [date, dbEntry?.id, dbEntry?.updatedAt])

  useEffect(() => {
    pendingRef.current = { date, local }
    const t = setTimeout(() => {
      if (!dirtyRef.current) return
      dirtyRef.current = false
      setSaveState('saving')
      upsertEntry(date, local)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('idle'))
    }, 350)
    return () => clearTimeout(t)
  }, [local, date])

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

  const has = (key: string) => settings.enabledFactors.includes(key as never)
  const painLevel = local.painLevel ?? 0
  const preview = computePainWeather({ painLevel, fatigueLevel: local.fatigueLevel, brainFog: local.brainFog })

  const knownMedications = Array.from(
    new Set((allEntries ?? []).flatMap((e) => e.medications ?? []))
  )
  const knownPositiveActions = Array.from(
    new Set([
      ...(allEntries ?? []).flatMap((e) => e.positiveActions ?? []),
      ...t.entryForm.positiveActionsSuggestions,
    ])
  )

  const zones = local.painLocations ?? []
  function toggleZone(z: BodyZone) {
    setField('painLocations', zones.includes(z) ? zones.filter((x) => x !== z) : [...zones, z])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[19px] font-semibold capitalize" style={{ color: 'var(--color-ink)' }}>
          {formatDateHeading(date, intlLocale)}
        </h1>
        <span className="text-[12px]" style={{ color: 'var(--color-ink-muted)' }}>
          {saveState === 'saving' ? t.entryForm.saving : saveState === 'saved' ? t.entryForm.saved : ' '}
        </span>
      </div>

      <Card className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: preview.soft, color: preview.color }}
        >
          <WeatherIcon name={preview.icon as never} size={36} />
        </div>
        <div>
          <p className="text-[13px]" style={{ color: 'var(--color-ink-muted)' }}>
            {t.entryForm.weatherOfDay}
          </p>
          <p className="text-[17px] font-semibold" style={{ color: preview.color }}>
            {t.painWeatherLevels[preview.level]}
          </p>
        </div>
      </Card>

      <Card>
        <Slider
          label={t.entryForm.pain}
          helper={t.entryForm.painHelper}
          value={local.painLevel}
          onChange={(v) => setField('painLevel', v)}
          endLabels={[t.entryForm.painEndNone, t.entryForm.painEndExtreme]}
          accent="var(--color-weather-5)"
        />
      </Card>

      {has('painLocations') && (
        <Card>
          <SectionTitle>{t.entryForm.whereHurts}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {BODY_ZONES.map((z) => (
              <Chip key={z} label={t.bodyZones[z]} selected={zones.includes(z)} onClick={() => toggleZone(z)} />
            ))}
          </div>
        </Card>
      )}

      {(has('fatigue') || has('sleep') || has('stress') || has('brainFog') || has('mood') || has('activity')) && (
        <Card className="flex flex-col gap-5">
          <SectionTitle>{t.entryForm.generalFeeling}</SectionTitle>
          {has('fatigue') && (
            <Slider
              label={t.factors.fatigue.label}
              value={local.fatigueLevel}
              onChange={(v) => setField('fatigueLevel', v)}
              endLabels={[t.entryForm.fatigueEndFine, t.entryForm.fatigueEndExhausted]}
            />
          )}
          {has('sleep') && (
            <>
              <Slider
                label={t.entryForm.sleepQuality}
                value={local.sleepQuality}
                onChange={(v) => setField('sleepQuality', v)}
                endLabels={[t.entryForm.sleepEndBad, t.entryForm.sleepEndExcellent]}
              />
              <Slider
                label={t.entryForm.sleepDuration}
                value={local.sleepHours}
                onChange={(v) => setField('sleepHours', v)}
                min={0}
                max={12}
                step={0.5}
                format={(v) => `${v}h`}
                endLabels={['0h', '12h']}
              />
            </>
          )}
          {has('stress') && (
            <Slider
              label={t.factors.stress.label}
              value={local.stressLevel}
              onChange={(v) => setField('stressLevel', v)}
              endLabels={[t.entryForm.stressEndCalm, t.entryForm.stressEndTense]}
            />
          )}
          {has('brainFog') && (
            <Slider
              label={t.factors.brainFog.label}
              value={local.brainFog}
              onChange={(v) => setField('brainFog', v)}
              endLabels={[t.entryForm.brainFogEndClear, t.entryForm.brainFogEndConfused]}
            />
          )}
          {has('mood') && (
            <Slider
              label={t.factors.mood.label}
              value={local.moodLevel}
              onChange={(v) => setField('moodLevel', v)}
              endLabels={[t.entryForm.moodEndHard, t.entryForm.moodEndGreat]}
            />
          )}
          {has('activity') && (
            <Slider
              label={t.factors.activity.label}
              value={local.activityLevel}
              onChange={(v) => setField('activityLevel', v)}
              endLabels={[t.entryForm.activityEndRest, t.entryForm.activityEndIntense]}
            />
          )}
        </Card>
      )}

      {has('weather') && (
        <Card>
          <WeatherField value={local.weather} onChange={(w) => setField('weather', w)} settings={settings} />
        </Card>
      )}

      {has('medications') && (
        <Card>
          <SectionTitle>{t.entryForm.medicationsTaken}</SectionTitle>
          <TagInput
            values={local.medications ?? []}
            onChange={(v) => setField('medications', v)}
            placeholder={t.entryForm.addMedicationPlaceholder}
            suggestions={knownMedications}
          />
        </Card>
      )}

      {has('positiveActions') && (
        <Card>
          <SectionTitle>{t.entryForm.positiveActionsTitle}</SectionTitle>
          <TagInput
            values={local.positiveActions ?? []}
            onChange={(v) => setField('positiveActions', v)}
            placeholder={t.entryForm.addPositiveActionPlaceholder}
            suggestions={knownPositiveActions}
          />
        </Card>
      )}

      {settings.cycleTrackingEnabled && (
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[15px]">{t.entryForm.periodToday}</p>
            <p className="text-[13px]" style={{ color: 'var(--color-ink-muted)' }}>
              {t.entryForm.periodHelper}
            </p>
          </div>
          <Toggle checked={!!local.periodDay} onChange={(v) => setField('periodDay', v)} />
        </Card>
      )}

      {has('notes') && (
        <Card>
          <SectionTitle>{t.entryForm.notes}</SectionTitle>
          <textarea
            value={local.notes ?? ''}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder={t.entryForm.notesPlaceholder}
            rows={3}
            className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none resize-none"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
          />
        </Card>
      )}
    </div>
  )
}
