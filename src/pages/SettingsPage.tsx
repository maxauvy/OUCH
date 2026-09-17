import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { updateSettings } from '../db'
import { ALL_FACTORS, CHILD_ILLNESSES, type ChildIllness, type FactorKey, type ParentGender, type ThemePref } from '../db/types'
import { Card, SectionTitle } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { Footer } from '../components/layout/Footer'
import { BackupSection } from '../components/settings/BackupSection'
import { canNotify, requestNotificationPermission } from '../lib/reminder'
import { reverseGeocode, getCurrentPosition } from '../lib/weather'
import { getIllnessLabel } from '../lib/childView'
import { format, LANGUAGES, useLanguage, useTranslation } from '../i18n'

export function SettingsPage({ onOpenChildView }: { onOpenChildView: () => void }) {
  const settings = useSettings()
  const t = useTranslation()
  const language = useLanguage()
  const [locating, setLocating] = useState(false)

  const PARENT_OPTIONS: { value: ParentGender; label: string }[] = [
    { value: 'maman', label: t.settings.parentGenderMaman },
    { value: 'papa', label: t.settings.parentGenderPapa },
  ]

  const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
    { value: 'system', label: t.settings.themeAuto },
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
  ]

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
      const label = await reverseGeocode(lat, lon, settings.language)
      await updateSettings({ autoWeatherEnabled: true, autoWeatherLat: lat, autoWeatherLon: lon, autoWeatherLabel: label })
    } catch {
      // silently ignore — the entry form's own button will surface the error when actually needed
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-[22px] font-semibold px-1">{t.settings.title}</h1>

      <Card>
        <SectionTitle>{t.settings.firstNameTitle}</SectionTitle>
        <p className="text-[13px] mb-2" style={{ color: 'var(--color-ink-muted)' }}>
          {format(t.settings.firstNameHelper, { name: settings.displayName || '…' })}
        </p>
        <input
          key={settings.displayName}
          defaultValue={settings.displayName}
          onBlur={(e) => updateSettings({ displayName: e.target.value.trim() })}
          placeholder={t.settings.firstNamePlaceholder}
          className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
        />
      </Card>

      <Card>
        <SectionTitle>{t.settings.languageTitle}</SectionTitle>
        <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.settings.languageHelper}
        </p>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => updateSettings({ language: lang.code })}
              className="flex-1 rounded-full py-2 text-[14px] font-semibold"
              style={{
                background: settings.language === lang.code ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                color: settings.language === lang.code ? 'white' : 'var(--color-brand)',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>{t.settings.parentGenderTitle}</SectionTitle>
        <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.settings.parentGenderHelper}
        </p>
        <div className="flex gap-2">
          {PARENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSettings({ parentGender: opt.value })}
              className="flex-1 rounded-full py-2 text-[14px] font-semibold"
              style={{
                background: settings.parentGender === opt.value ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                color: settings.parentGender === opt.value ? 'white' : 'var(--color-brand)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>{t.settings.childIllnessTitle}</SectionTitle>
        <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.settings.childIllnessHelper}
        </p>
        <div className="flex flex-wrap gap-2">
          {CHILD_ILLNESSES.map((illness: ChildIllness) => (
            <button
              key={illness}
              onClick={() => updateSettings({ childIllness: illness })}
              className="rounded-full px-3.5 py-2 text-[13px] font-semibold"
              style={{
                background: settings.childIllness === illness ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                color: settings.childIllness === illness ? 'white' : 'var(--color-brand)',
              }}
            >
              {getIllnessLabel(language, illness)}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium">{t.settings.childViewEntryTitle}</p>
          <p className="text-[12px]" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.childViewEntryHelper}
          </p>
        </div>
        <button
          onClick={onOpenChildView}
          className="rounded-full px-4 py-2 text-[13px] font-semibold shrink-0"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
        >
          {t.settings.childViewEntryButton}
        </button>
      </Card>

      <Card>
        <SectionTitle>{t.settings.factorsTitle}</SectionTitle>
        <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.settings.factorsHelper}
        </p>
        <div className="flex flex-col gap-3.5">
          {ALL_FACTORS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium">{t.factors[key].label}</p>
                <p className="text-[12px]" style={{ color: 'var(--color-ink-muted)' }}>
                  {t.factors[key].helper}
                </p>
              </div>
              <Toggle checked={settings.enabledFactors.includes(key)} onChange={() => toggleFactor(key)} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-medium">{t.settings.cycleTracking}</p>
          <p className="text-[12px]" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.cycleTrackingHelper}
          </p>
        </div>
        <Toggle checked={settings.cycleTrackingEnabled} onChange={(v) => updateSettings({ cycleTrackingEnabled: v })} />
      </Card>

      {settings.enabledFactors.includes('weather') && (
        <Card>
          <SectionTitle>{t.settings.weatherLocationTitle}</SectionTitle>
          <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            {settings.autoWeatherLabel
              ? format(t.settings.weatherLocationSet, { label: settings.autoWeatherLabel })
              : t.settings.weatherLocationUnset}
          </p>
          <button
            onClick={handleSetLocation}
            disabled={locating}
            className="rounded-full px-4 py-2 text-[13px] font-semibold"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          >
            {locating ? t.settings.locating : t.settings.updateLocation}
          </button>
        </Card>
      )}

      <Card>
        <SectionTitle>{t.settings.reminderTitle}</SectionTitle>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px]" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.reminderHelper}
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
          {t.settings.reminderNote}
        </p>
      </Card>

      <Card>
        <SectionTitle>{t.settings.appearanceTitle}</SectionTitle>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSettings({ theme: opt.value })}
              className="flex-1 rounded-full py-2 text-[14px] font-semibold"
              style={{
                background: settings.theme === opt.value ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                color: settings.theme === opt.value ? 'white' : 'var(--color-brand)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>{t.settings.backupTitle}</SectionTitle>
        <BackupSection />
      </Card>

      <Card>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
          {t.settings.privacyNote}
        </p>
      </Card>

      <Footer />
    </div>
  )
}
