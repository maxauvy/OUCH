import { useLockState } from './lib/appLock'
import { useLuminous } from './lib/look'
import { useIsDark } from './hooks/useIsDark'
import { AppLockGate } from './components/lock/AppLockGate'
import { handleProviderReturn } from './lib/autoBackupRuntime'
import { useAutoBackup } from './hooks/useAutoBackup'
import { useEffect, useMemo, useState } from 'react'
import { TabBar, type Tab } from './components/layout/TabBar'
import { DemoPill } from './components/demo/DemoPill'
import { DemoTour } from './components/demo/DemoTour'
import { IS_DEMO } from './lib/demoMode'
import { finishTour, tourPending } from './lib/demoSession'
import { TodayPage } from './pages/TodayPage'
import { JournalPage } from './pages/JournalPage'
import { TrendsPage } from './pages/TrendsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChildViewPage } from './pages/ChildViewPage'
import { SetupWizard } from './components/setup/SetupWizard'
import { useSettings, useSettingsLoaded } from './hooks/useSettings'
import { hasPain } from './lib/loggedEntries'
import { useAllEntries, useTodayEntry } from './hooks/useEntries'
import { oldZonesUsed } from './lib/bodyZones'
import { ZonesNotice } from './components/about/ZonesNotice'
import { useLeadList } from './hooks/useLeadList'
import { trendsDot } from './lib/leadHints'
import { updateSettings, todayISO } from './db'
import { maybeShowReminder } from './lib/reminder'
import { clearWipedNotice, wipedNotice } from './lib/wipe'
import { requestStorageProtection } from './lib/storage'
import { getTranslations, I18nProvider } from './i18n'
import type { Language } from './i18n'

function useAppliedTheme(theme: 'system' | 'light' | 'dark') {
  useEffect(() => {
    if (theme === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])
}

/** The look itself is stamped on the page by lib/look.ts; here, the status bar colour that goes with it. */
function useAppliedLook(theme: 'system' | 'light' | 'dark') {
  const luminous = useLuminous()
  const dark = useIsDark(theme)
  // The system tints the status bar area with this colour (the notch and the
  // dynamic island on a phone): it follows the gradient's first colour.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const usual = meta.getAttribute('content') ?? ''
    meta.setAttribute('content', luminous ? (dark ? '#12283c' : '#d6e9fa') : usual)
    return () => meta.setAttribute('content', usual)
  }, [luminous, dark])
}

function useAppliedLanguage(language: Language) {
  useEffect(() => {
    document.documentElement.lang = language
    const t = getTranslations(language)
    document.title = t.meta.htmlTitle
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.metaDescription)
  }, [language])
}

function AppShell() {
  const [tab, setTab] = useState<Tab>('today')
  const [tourOpen, setTourOpen] = useState(() => IS_DEMO && tourPending())
  const settings = useSettings()
  const settingsLoaded = useSettingsLoaded()
  const todayEntry = useTodayEntry()
  const leadList = useLeadList()
  const allEntries = useAllEntries()
  // A journal that holds zones of the first versions is told about the new ones, once per device.
  const oldZones = useMemo(() => oldZonesUsed(allEntries ?? []), [allEntries])
  useAppliedTheme(settings.theme)
  useAppliedLook(settings.theme)
  useAutoBackup()
  // Set when the data was just deleted from Settings: said once at the start.
  const [wiped] = useState(wipedNotice)
  useEffect(() => {
    if (wiped) clearWipedNotice()
  }, [wiped])

  useEffect(() => {
    if (!settings.reminderEnabled) return
    const check = () => maybeShowReminder(settings.reminderTime, !!todayEntry && hasPain(todayEntry), todayISO(), settings.language)
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [settings.reminderEnabled, settings.reminderTime, settings.language, todayEntry])

  // Once there is a first entry to lose, ask the browser to keep the data
  // (silent in most browsers; Firefox asks, which makes sense after a save).
  const hasEntry = !!todayEntry
  useEffect(() => {
    if (settings.onboardingDone && hasEntry) void requestStorageProtection()
  }, [settings.onboardingDone, hasEntry])

  // From the backup reminder: open the settings on the backup card.
  const [backupRequested, setBackupRequested] = useState(false)
  // Back from a provider's page (Dropbox): finish the link, then show the Settings, which say how it went.
  useEffect(() => {
    void handleProviderReturn().then((notice) => {
      if (notice) {
        setTab('settings')
        setBackupRequested(true)
      }
    })
  }, [])
  function goToBackup() {
    setBackupRequested(true)
    setTab('settings')
    requestAnimationFrame(() => document.getElementById('backup')?.scrollIntoView({ block: 'start' }))
  }

  // Wait for the stored settings, or the setup would flash on every launch.
  if (!settingsLoaded) return null

  // The setup covers the whole screen; the app behind it is not rendered, so
  // neither focus nor a screen reader can wander into it.
  if (!settings.onboardingDone) {
    return (
      <SetupWizard
        wiped={wiped}
        onDone={() => {
          setTab('today')
          updateSettings({ onboardingDone: true })
        }}
      />
    )
  }

  return (
    <>
      <main className="flex-1">
        {tab === 'today' && (
          <TodayPage
            onGoToBackup={goToBackup}
            onGoToTab={(next) => {
              setBackupRequested(false)
              setTab(next)
            }}
          />
        )}
        {tab === 'journal' && <JournalPage />}
        {tab === 'trends' && <TrendsPage />}
        {tab === 'kids' && settings.kidsTabEnabled && <ChildViewPage />}
        {tab === 'settings' && <SettingsPage openBackup={backupRequested} onReplayTour={() => setTourOpen(true)} />}
      </main>
      <TabBar
        active={tab}
        hidden={settings.kidsTabEnabled ? [] : ['kids']}
        badged={tab !== 'trends' && trendsDot({ shown: leadList?.shown ?? [], seen: settings.leadsSeen, enabled: settings.leadDotEnabled }) ? ['trends'] : []}
        onChange={(next) => {
          setBackupRequested(false)
          setTab(next)
        }}
      />
      {settings.onboardingDone && !settings.zonesNoticeSeen && oldZones.length > 0 && !tourOpen && !IS_DEMO && (
        <ZonesNotice
          oldZones={oldZones}
          onClose={() => void updateSettings({ zonesNoticeSeen: true })}
          onTry={() => {
            void updateSettings({ zonesNoticeSeen: true })
            setBackupRequested(false)
            setTab('today')
          }}
        />
      )}
      {IS_DEMO &&
        (tourOpen ? (
          <DemoTour
            setTab={setTab}
            onClose={() => {
              finishTour()
              setTourOpen(false)
            }}
          />
        ) : (
          <DemoPill />
        ))}
    </>
  )
}

export default function App() {
  const settings = useSettings()
  const loaded = useSettingsLoaded()
  const lock = useLockState()
  useAppliedLanguage(settings.language)

  // The lock is drawn before the settings are read: until they are, it speaks
  // the language it was given, not the default one.
  return (
    <I18nProvider language={loaded ? settings.language : (lock.language ?? settings.language)}>
      <AppLockGate>
        <AppShell />
      </AppLockGate>
    </I18nProvider>
  )
}
