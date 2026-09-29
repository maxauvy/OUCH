import { useEffect, useState } from 'react'
import { TabBar, type Tab } from './components/layout/TabBar'
import { TodayPage } from './pages/TodayPage'
import { JournalPage } from './pages/JournalPage'
import { TrendsPage } from './pages/TrendsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChildViewPage } from './pages/ChildViewPage'
import { SetupWizard } from './components/setup/SetupWizard'
import { useSettings, useSettingsLoaded } from './hooks/useSettings'
import { DesignContext } from './hooks/useDesign'
import { useTodayEntry } from './hooks/useEntries'
import { updateSettings, todayISO } from './db'
import { maybeShowReminder } from './lib/reminder'
import { requestStorageProtection } from './lib/storage'
import { getTranslations, I18nProvider } from './i18n'
import type { Language } from './i18n'
import type { DesignStyle } from './db/types'

function useAppliedTheme(theme: 'system' | 'light' | 'dark') {
  useEffect(() => {
    if (theme === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])
}

// index.html ships data-design="health" so the default design paints on the
// first frame; this keeps the attribute (and the browser chrome color) in
// sync with the setting afterwards.
function useAppliedDesign(design: DesignStyle) {
  useEffect(() => {
    document.documentElement.dataset.design = design
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', design === 'health' ? '#f3f6f8' : '#6c5f9c')
  }, [design])
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

  useEffect(() => {
    if (!settings.reminderEnabled) return
    const check = () => maybeShowReminder(settings.reminderTime, !!todayEntry, todayISO(), settings.language)
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

  // Wait for the stored settings, or the setup would flash on every launch.
  if (!settingsLoaded) return null

  // The setup covers the whole screen; the app behind it is not rendered, so
  // neither focus nor a screen reader can wander into it.
  if (!settings.onboardingDone) {
    return (
      <SetupWizard
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
        {tab === 'today' && <TodayPage />}
        {tab === 'journal' && <JournalPage />}
        {tab === 'trends' && <TrendsPage />}
        {tab === 'kids' && <ChildViewPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </>
  )
}

export default function App() {
  const settings = useSettings()
  useAppliedLanguage(settings.language)
  useAppliedDesign(settings.design)

  return (
    <I18nProvider language={settings.language}>
      <DesignContext.Provider value={settings.design}>
        <AppShell />
      </DesignContext.Provider>
    </I18nProvider>
  )
}
