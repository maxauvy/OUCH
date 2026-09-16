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

function useAppliedTheme(theme: 'system' | 'light' | 'dark') {
  useEffect(() => {
    if (theme === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])
}

function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'var(--color-paper)' }}>
      <div className="max-w-sm flex flex-col gap-4 text-center">
        <div className="text-[44px]">🌤️</div>
        <h1 className="text-[22px] font-semibold">Bienvenue sur Accalmie</h1>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
          Note ta douleur et ce qui l'entoure en quelques secondes par jour, repère ce qui l'influence, et
          partage ta météo du jour avec tes proches quand tu le souhaites. Tout reste sur cet appareil.
        </p>
        <button
          onClick={onDone}
          className="rounded-full py-3.5 text-[15px] font-semibold text-white mt-2"
          style={{ background: 'var(--color-brand)' }}
        >
          Commencer
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const settings = useSettings()
  const todayEntry = useTodayEntry()
  useAppliedTheme(settings.theme)

  useEffect(() => {
    if (!settings.reminderEnabled) return
    const check = () => maybeShowReminder(settings.reminderTime, !!todayEntry, todayISO())
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [settings.reminderEnabled, settings.reminderTime, todayEntry])

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
