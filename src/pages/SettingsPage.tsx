import { useState } from 'react'
import { IconBell, IconHeartbeat, IconInfoCircle, IconShieldLock, IconUser } from '@tabler/icons-react'
import { useSettings } from '../hooks/useSettings'
import { updateSettings } from '../db'
import { ALL_FACTORS, type FactorKey, type ParentGender, type ThemePref } from '../db/types'
import { Card, SectionTitle } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { Footer } from '../components/layout/Footer'
import { AboutCard } from '../components/about/AboutCard'
import { SourcesCard } from '../components/about/SourcesCard'
import { BackupSection } from '../components/settings/BackupSection'
import { DeleteDataCard } from '../components/settings/DeleteDataCard'
import { MedicationsSection } from '../components/settings/MedicationsSection'
import { IllnessPicker } from '../components/settings/IllnessPicker'
import { SettingsGroup } from '../components/settings/SettingsGroup'
import { canNotify, requestNotificationPermission } from '../lib/reminder'
import { formatCoordinates } from '../lib/weather'
import { saveCurrentLocation } from '../lib/weatherLocation'
import { format, LANGUAGES, useLocale, useTranslation } from '../i18n'
import { radioGroupProps, radioProps } from '../lib/a11y'

/** `openBackup`: arrive from the backup reminder, with the data group already open. */
export function SettingsPage({ openBackup = false }: { openBackup?: boolean }) {
  const settings = useSettings()
  const t = useTranslation()
  const { intlLocale } = useLocale()
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

  // One line per group, so the values can be read without opening it.
  const parentLabel = PARENT_OPTIONS.find((o) => o.value === settings.parentGender)?.label
  const profileSummary = [settings.displayName, parentLabel].filter(Boolean).join(' · ')

  const factorCount = settings.enabledFactors.length
  const hasLocation = settings.autoWeatherLat !== undefined && settings.autoWeatherLon !== undefined
  const trackingSummary = [
    format(factorCount === 1 ? t.settings.factorsCountOne : t.settings.factorsCountOther, { n: factorCount }),
    settings.enabledFactors.includes('weather') && hasLocation
      ? (settings.autoWeatherLabel ?? formatCoordinates(settings.autoWeatherLat!, settings.autoWeatherLon!))
      : undefined,
  ]
    .filter(Boolean)
    .join(' · ')

  const displaySummary = [
    settings.reminderEnabled ? format(t.settings.summaryReminderOn, { time: settings.reminderTime }) : t.settings.summaryReminderOff,
    THEME_OPTIONS.find((o) => o.value === settings.theme)?.label,
    LANGUAGES.find((l) => l.code === settings.language)?.label,
  ]
    .filter(Boolean)
    .join(' · ')

  const dataSummary =
    settings.lastBackupAt === undefined
      ? t.backup.neverBackedUp
      : format(t.backup.lastBackup, {
          date: new Date(settings.lastBackupAt).toLocaleDateString(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }),
        })

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
      await saveCurrentLocation(settings.language)
    } catch {
      // silently ignore — the entry form's own button will surface the error when actually needed
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-title font-semibold px-1">{t.settings.title}</h1>

      <SettingsGroup icon={IconUser} title={t.settings.groups.profile} summary={profileSummary}>
        <Card>
          <SectionTitle>{t.settings.firstNameTitle}</SectionTitle>
          <p className="text-caption mb-2" style={{ color: 'var(--color-ink-muted)' }}>
            {format(t.settings.firstNameHelper, { name: settings.displayName || '…' })}
          </p>
          <input
            key={settings.displayName}
            defaultValue={settings.displayName}
            onBlur={(e) => updateSettings({ displayName: e.target.value.trim() })}
            placeholder={t.settings.firstNamePlaceholder}
            aria-label={t.settings.firstNameTitle}
            className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
            style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
          />
        </Card>

        <Card>
          <SectionTitle>{t.settings.parentGenderTitle}</SectionTitle>
          <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.parentGenderHelper}
          </p>
          <div className="flex gap-2" {...radioGroupProps(t.settings.parentGenderTitle)}>
            {PARENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                {...radioProps(settings.parentGender === opt.value)}
                onClick={() => updateSettings({ parentGender: opt.value })}
                className="flex-1 rounded-[var(--radius-control)] py-2 text-control font-semibold"
                style={{
                  background: settings.parentGender === opt.value ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                  color: settings.parentGender === opt.value ? 'var(--color-on-brand)' : 'var(--color-brand)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>{t.settings.illnessesTitle}</SectionTitle>
          <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.illnessesHelper}
          </p>
          <IllnessPicker />
        </Card>
      </SettingsGroup>

      <SettingsGroup icon={IconHeartbeat} title={t.settings.groups.tracking} summary={trackingSummary}>
        <Card>
          <SectionTitle>{t.settings.factorsTitle}</SectionTitle>
          <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.factorsHelper}
          </p>
          <div className="flex flex-col gap-3.5">
            {ALL_FACTORS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-control font-medium">{t.factors[key].label}</p>
                  <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                    {t.factors[key].helper}
                  </p>
                </div>
                <Toggle
                  checked={settings.enabledFactors.includes(key)}
                  onChange={() => toggleFactor(key)}
                  label={t.factors[key].label}
                />
              </div>
            ))}
          </div>
        </Card>

        {settings.enabledFactors.includes('medications') && (
          <Card>
            <SectionTitle>{t.medications.title}</SectionTitle>
            <MedicationsSection />
          </Card>
        )}

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-control font-medium">{t.settings.cycleTracking}</p>
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {t.settings.cycleTrackingHelper}
            </p>
          </div>
          <Toggle
            checked={settings.cycleTrackingEnabled}
            onChange={(v) => updateSettings({ cycleTrackingEnabled: v })}
            label={t.settings.cycleTracking}
          />
        </Card>

        {settings.enabledFactors.includes('weather') && (
          <Card>
            <SectionTitle>{t.settings.weatherLocationTitle}</SectionTitle>
            <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
              {settings.autoWeatherLat === undefined || settings.autoWeatherLon === undefined
                ? t.settings.weatherLocationUnset
                : format(t.settings.weatherLocationSet, {
                    label: settings.autoWeatherLabel ?? formatCoordinates(settings.autoWeatherLat, settings.autoWeatherLon),
                  })}
            </p>
            <button
              onClick={handleSetLocation}
              disabled={locating}
              className="rounded-[var(--radius-control)] px-4 py-2 text-caption font-semibold"
              style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
            >
              {locating ? t.settings.locating : t.settings.updateLocation}
            </button>
            <p className="text-caption mt-3" style={{ color: 'var(--color-ink-muted)' }}>
              {t.settings.weatherLocationCredit}
            </p>
          </Card>
        )}

        <Card>
          <SectionTitle>{t.settings.hardDaysTitle}</SectionTitle>
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {t.settings.hardDaysHelper}
            </p>
            <Toggle
              checked={settings.hardDaysCardEnabled}
              onChange={(v) => updateSettings({ hardDaysCardEnabled: v })}
              label={t.settings.hardDaysTitle}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle>{t.settings.lightFormTitle}</SectionTitle>
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {t.settings.lightFormHelper}
            </p>
            <Toggle
              checked={settings.lightFormEnabled}
              onChange={(v) => updateSettings({ lightFormEnabled: v })}
              label={t.settings.lightFormTitle}
            />
          </div>
        </Card>
      </SettingsGroup>

      <SettingsGroup icon={IconBell} title={t.settings.groups.display} summary={displaySummary}>
        <Card>
          <SectionTitle>{t.settings.reminderTitle}</SectionTitle>
          <div className="flex items-center justify-between mb-3">
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {t.settings.reminderHelper}
            </p>
            <Toggle checked={settings.reminderEnabled} onChange={handleReminderToggle} label={t.settings.reminderTitle} />
          </div>
          {settings.reminderEnabled && (
            <input
              type="time"
              aria-label={t.settings.reminderTitle}
              value={settings.reminderTime}
              onChange={(e) => updateSettings({ reminderTime: e.target.value })}
              className="rounded-xl px-3.5 py-2.5 text-body outline-none"
              style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
            />
          )}
          <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.reminderNote}
          </p>
        </Card>

        <Card>
          <SectionTitle>{t.settings.languageTitle}</SectionTitle>
          <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.languageHelper}
          </p>
          <div className="flex gap-2" {...radioGroupProps(t.settings.languageTitle)}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                {...radioProps(settings.language === lang.code)}
                onClick={() => updateSettings({ language: lang.code })}
                className="flex-1 rounded-[var(--radius-control)] py-2 text-control font-semibold"
                style={{
                  background: settings.language === lang.code ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                  color: settings.language === lang.code ? 'var(--color-on-brand)' : 'var(--color-brand)',
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>{t.settings.appearanceTitle}</SectionTitle>
          <div className="flex gap-2" {...radioGroupProps(t.settings.themeTitle)}>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                {...radioProps(settings.theme === opt.value)}
                onClick={() => updateSettings({ theme: opt.value })}
                className="flex-1 rounded-[var(--radius-control)] py-2 text-control font-semibold"
                style={{
                  background: settings.theme === opt.value ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                  color: settings.theme === opt.value ? 'var(--color-on-brand)' : 'var(--color-brand)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>
      </SettingsGroup>

      <SettingsGroup id="backup" icon={IconShieldLock} title={t.settings.groups.data} summary={dataSummary} defaultOpen={openBackup}>
        <Card>
          <SectionTitle>{t.settings.backupTitle}</SectionTitle>
          <BackupSection />
        </Card>

        <Card>
          <SectionTitle>{t.setup.rerunTitle}</SectionTitle>
          <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            {t.setup.rerunHelper}
          </p>
          <button
            onClick={() => updateSettings({ onboardingDone: false })}
            className="rounded-[var(--radius-control)] px-4 py-2 text-caption font-semibold"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          >
            {t.setup.rerunButton}
          </button>
        </Card>

        <DeleteDataCard />
      </SettingsGroup>

      <SettingsGroup icon={IconInfoCircle} title={t.settings.groups.about}>
        <AboutCard withHeader />

        <SourcesCard />

        <Card>
          <p className="text-caption leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.privacyNote}
          </p>
        </Card>
      </SettingsGroup>

      <Footer />
    </div>
  )
}
