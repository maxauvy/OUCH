import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { updateSettings } from '../db'
import { ALL_FACTORS, type FactorKey, type ThemePref } from '../db/types'
import { Card, SectionTitle } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { BackupSection } from '../components/settings/BackupSection'
import { canNotify, requestNotificationPermission } from '../lib/reminder'
import { reverseGeocode, getCurrentPosition } from '../lib/weather'

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
]

export function SettingsPage() {
  const settings = useSettings()
  const [locating, setLocating] = useState(false)

  function toggleFactor(key: FactorKey) {
    const enabled = settings.enabledFactors.includes(key)
    updateSettings({
      enabledFactors: enabled ? settings.enabledFactors.filter((k) => k !== key) : [...settings.enabledFactors, key],
    })
  }

  async function handleReminderToggle(v: boolean) {
    if (v && canNotify()) {
      const perm = await requestNotificationPermission()
      if (perm !== 'granted') {
        await updateSettings({ reminderEnabled: false })
        return
      }
    }
    await updateSettings({ reminderEnabled: v })
  }

  async function handleSetLocation() {
    setLocating(true)
    try {
      const { lat, lon } = await getCurrentPosition()
      const label = await reverseGeocode(lat, lon)
      await updateSettings({ autoWeatherEnabled: true, autoWeatherLat: lat, autoWeatherLon: lon, autoWeatherLabel: label })
    } catch {
      // silently ignore — the entry form's own button will surface the error when actually needed
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-[22px] font-semibold px-1">Réglages</h1>

      <Card>
        <SectionTitle>Ton prénom</SectionTitle>
        <p className="text-[13px] mb-2" style={{ color: 'var(--color-ink-muted)' }}>
          Utilisé sur la carte météo que tu partages ("Météo de {settings.displayName || '…'}")
        </p>
        <input
          key={settings.displayName}
          defaultValue={settings.displayName}
          onBlur={(e) => updateSettings({ displayName: e.target.value.trim() })}
          placeholder="Ton prénom"
          className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
        />
      </Card>

      <Card>
        <SectionTitle>Facteurs suivis</SectionTitle>
        <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          Choisis ce qui apparaît dans ta saisie quotidienne. Tu peux changer d'avis à tout moment.
        </p>
        <div className="flex flex-col gap-3.5">
          {ALL_FACTORS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium">{f.label}</p>
                <p className="text-[12px]" style={{ color: 'var(--color-ink-muted)' }}>
                  {f.helper}
                </p>
              </div>
              <Toggle checked={settings.enabledFactors.includes(f.key)} onChange={() => toggleFactor(f.key)} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-medium">Suivi du cycle menstruel</p>
          <p className="text-[12px]" style={{ color: 'var(--color-ink-muted)' }}>
            Ajoute une case "règles" à la saisie du jour
          </p>
        </div>
        <Toggle checked={settings.cycleTrackingEnabled} onChange={(v) => updateSettings({ cycleTrackingEnabled: v })} />
      </Card>

      {settings.enabledFactors.includes('weather') && (
        <Card>
          <SectionTitle>Localisation météo</SectionTitle>
          <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            {settings.autoWeatherLabel
              ? `Position enregistrée : ${settings.autoWeatherLabel}. Utilisée pour remplir la météo automatiquement.`
              : "Pas encore de position enregistrée — tu peux toujours la définir depuis le bouton dans la saisie du jour."}
          </p>
          <button
            onClick={handleSetLocation}
            disabled={locating}
            className="rounded-full px-4 py-2 text-[13px] font-semibold"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          >
            {locating ? 'Localisation…' : 'Mettre à jour ma position'}
          </button>
        </Card>
      )}

      <Card>
        <SectionTitle>Rappel quotidien</SectionTitle>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px]" style={{ color: 'var(--color-ink-muted)' }}>
            Une notification si tu n'as pas encore rempli ta météo
          </p>
          <Toggle checked={settings.reminderEnabled} onChange={handleReminderToggle} />
        </div>
        {settings.reminderEnabled && (
          <input
            type="time"
            value={settings.reminderTime}
            onChange={(e) => updateSettings({ reminderTime: e.target.value })}
            className="rounded-xl px-3.5 py-2.5 text-[15px] outline-none"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
          />
        )}
        <p className="text-[12px] mt-2" style={{ color: 'var(--color-ink-muted)' }}>
          Ce rappel fonctionne quand l'app est ouverte ou récemment utilisée. Sans serveur (par choix, pour
          rester 100% local), il ne peut pas se déclencher app totalement fermée.
        </p>
      </Card>

      <Card>
        <SectionTitle>Apparence</SectionTitle>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => updateSettings({ theme: t.value })}
              className="flex-1 rounded-full py-2 text-[14px] font-semibold"
              style={{
                background: settings.theme === t.value ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                color: settings.theme === t.value ? 'white' : 'var(--color-brand)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Sauvegarde &amp; synchro</SectionTitle>
        <BackupSection />
      </Card>

      <Card>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
          Accalmie garde toutes tes données sur cet appareil, dans son stockage local. Rien n'est envoyé à un
          serveur — le partage de ta météo et les sauvegardes sont toujours une action volontaire de ta part.
        </p>
      </Card>
    </div>
  )
}
