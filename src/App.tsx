import { useEffect, useState } from 'react'
import { TabBar, type Tab } from './components/layout/TabBar'
import { TodayPage } from './pages/TodayPage'
import { JournalPage } from './pages/JournalPage'
import { TrendsPage } from './pages/TrendsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useSettings } from './hooks/useSettings'
import { useTodayEntry } from './hooks/useEntries'
import { updateSettings, todayISO } from './db'
import { maybeShowReminder } from './lib/reminder'
import { getTranslations, I18nProvider, LANGUAGES, useLocale, useTranslation } from './i18n'
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

function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  const t = useTranslation()
  const { language } = useLocale()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'var(--color-paper)' }}>
      <div className="max-w-sm flex flex-col gap-4 text-center">
        <div className="flex justify-center gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => updateSettings({ language: lang.code })}
              className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
              style={{
                background: language === lang.code ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                color: language === lang.code ? 'white' : 'var(--color-brand)',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <div className="text-[44px]">🌤️</div>
        <h1 className="text-[22px] font-semibold">{t.welcome.title}</h1>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
          {t.welcome.body}
        </p>
        <button
          onClick={onDone}
          className="rounded-full py-3.5 text-[15px] font-semibold text-white mt-2"
          style={{ background: 'var(--color-brand)' }}
        >
          {t.welcome.start}
        </button>
      </div>
    </div>
  )
}

function AppShell() {
  const [tab, setTab] = useState<Tab>('today')
  const settings = useSettings()
  const todayEntry = useTodayEntry()
  useAppliedTheme(settings.theme)

  useEffect(() => {
    if (!settings.reminderEnabled) return
    const check = () => maybeShowReminder(settings.reminderTime, !!todayEntry, todayISO(), settings.language)
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [settings.reminderEnabled, settings.reminderTime, settings.language, todayEntry])

  return (
    <>
      <main className="flex-1">
        {tab === 'today' && <TodayPage />}
        {tab === 'journal' && <JournalPage />}
        {tab === 'trends' && <TrendsPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <TabBar active={tab} onChange={setTab} />
      {!settings.onboardingDone && <WelcomeOverlay onDone={() => updateSettings({ onboardingDone: true })} />}
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
