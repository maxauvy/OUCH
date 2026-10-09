import { useEffect, useState } from 'react'
import { TabBar, type Tab } from './components/layout/TabBar'
import { TodayPage } from './pages/TodayPage'
import { JournalPage } from './pages/JournalPage'
import { TrendsPage } from './pages/TrendsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChildViewPage } from './pages/ChildViewPage'
import { SetupWizard } from './components/setup/SetupWizard'
import { useSettings, useSettingsLoaded } from './hooks/useSettings'
import { hasPain } from './lib/loggedEntries'
import { useTodayEntry } from './hooks/useEntries'
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
  const settings = useSettings()
  const settingsLoaded = useSettingsLoaded()
  const todayEntry = useTodayEntry()
  useAppliedTheme(settings.theme)
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
        {tab === 'today' && <TodayPage onGoToBackup={goToBackup} />}
        {tab === 'journal' && <JournalPage />}
        {tab === 'trends' && <TrendsPage />}
        {tab === 'kids' && <ChildViewPage />}
        {tab === 'settings' && <SettingsPage openBackup={backupRequested} />}
      </main>
      <TabBar
        active={tab}
        onChange={(next) => {
          setBackupRequested(false)
          setTab(next)
        }}
      />
    </>
  )
}

export default function App() {
  const settings = useSettings()
  useAppliedLanguage(settings.language)

  return (
    <I18nProvider language={settings.language}>
      <AppShell />
    </I18nProvider>
  )
}
