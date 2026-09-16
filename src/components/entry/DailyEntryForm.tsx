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

function formatDateHeading(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function DailyEntryForm({ date }: { date: string }) {
  const dbEntry = useEntry(date)
  const settings = useSettings()
  const allEntries = useAllEntries()
  const [local, setLocal] = useState<Partial<DailyEntry>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dirtyRef = useRef(false)

  useEffect(() => {
    setLocal(dbEntry ?? {})
  }, [date, dbEntry?.id, dbEntry?.updatedAt])

  useEffect(() => {
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

  const zones = local.painLocations ?? []
  function toggleZone(z: BodyZone) {
    setField('painLocations', zones.includes(z) ? zones.filter((x) => x !== z) : [...zones, z])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[19px] font-semibold capitalize" style={{ color: 'var(--color-ink)' }}>
          {formatDateHeading(date)}
        </h1>
        <span className="text-[12px]" style={{ color: 'var(--color-ink-muted)' }}>
          {saveState === 'saving' ? 'Enregistrement…' : saveState === 'saved' ? 'Enregistré' : ' '}
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
            Météo du jour
          </p>
          <p className="text-[17px] font-semibold" style={{ color: preview.color }}>
            {preview.label}
          </p>
        </div>
      </Card>

      <Card>
        <Slider
          label="Douleur"
          helper="Intensité globale de la douleur aujourd'hui"
          value={local.painLevel}
          onChange={(v) => setField('painLevel', v)}
          endLabels={['Aucune', 'Insupportable']}
          accent="var(--color-weather-5)"
        />
      </Card>

      {has('painLocations') && (
        <Card>
          <SectionTitle>Où as-tu mal ?</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {BODY_ZONES.map((z) => (
              <Chip key={z} label={z} selected={zones.includes(z)} onClick={() => toggleZone(z)} />
            ))}
          </div>
        </Card>
      )}

      {(has('fatigue') || has('sleep') || has('stress') || has('brainFog') || has('mood') || has('activity')) && (
        <Card className="flex flex-col gap-5">
          <SectionTitle>Ressenti général</SectionTitle>
          {has('fatigue') && (
            <Slider label="Fatigue" value={local.fatigueLevel} onChange={(v) => setField('fatigueLevel', v)} endLabels={['En forme', 'Épuisée']} />
          )}
          {has('sleep') && (
            <>
              <Slider
                label="Qualité du sommeil"
                value={local.sleepQuality}
                onChange={(v) => setField('sleepQuality', v)}
                endLabels={['Très mauvaise', 'Excellente']}
              />
              <Slider
                label="Durée de sommeil"
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
            <Slider label="Stress" value={local.stressLevel} onChange={(v) => setField('stressLevel', v)} endLabels={['Détendue', 'Très tendue']} />
          )}
          {has('brainFog') && (
            <Slider
              label="Brouillard mental"
              value={local.brainFog}
              onChange={(v) => setField('brainFog', v)}
              endLabels={['Esprit clair', 'Très confus']}
            />
          )}
          {has('mood') && (
            <Slider label="Humeur" value={local.moodLevel} onChange={(v) => setField('moodLevel', v)} endLabels={['Difficile', 'Très bonne']} />
          )}
          {has('activity') && (
            <Slider
              label="Activité physique"
              value={local.activityLevel}
              onChange={(v) => setField('activityLevel', v)}
              endLabels={['Repos total', 'Intense']}
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
          <SectionTitle>Médicaments pris</SectionTitle>
          <TagInput
            values={local.medications ?? []}
            onChange={(v) => setField('medications', v)}
            placeholder="Ajouter un médicament…"
            suggestions={knownMedications}
          />
        </Card>
      )}

      {settings.cycleTrackingEnabled && (
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[15px]">Règles aujourd'hui</p>
            <p className="text-[13px]" style={{ color: 'var(--color-ink-muted)' }}>
              Pour croiser douleur et cycle
            </p>
          </div>
          <Toggle checked={!!local.periodDay} onChange={(v) => setField('periodDay', v)} />
        </Card>
      )}

      {has('notes') && (
        <Card>
          <SectionTitle>Notes</SectionTitle>
          <textarea
            value={local.notes ?? ''}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Un événement particulier, une observation…"
            rows={3}
            className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none resize-none"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
          />
        </Card>
      )}
    </div>
  )
}
