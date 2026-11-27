import { useLockState } from './lib/appLock'
import { useLook } from './lib/look'
import { useIsDark } from './hooks/useIsDark'
import { AppLockGate } from './components/lock/AppLockGate'
import { handleProviderReturn } from './lib/autoBackupRuntime'
import { useAutoBackup } from './hooks/useAutoBackup'
import { useAudiencePing } from './hooks/useAudiencePing'
import { WeatherShareSender } from './components/weather/WeatherShareSender'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { TabBar, type Tab } from './components/layout/TabBar'
import { PageBack } from './components/layout/PageBack'
import { ReliefContext } from './components/relief/reliefContext'
import { BackupContext } from './components/settings/backupContext'
import type { SoulagerView } from './pages/SoulagerPage'
import { fromDoctor, launchTarget } from './lib/launchTarget'
import { DemoTag } from './components/demo/DemoTag'
import { UpdatedPill } from './components/layout/UpdatedPill'
import { IS_DEMO } from './lib/demoMode'
import { finishTour, tourPending } from './lib/demoSession'
import { TodayPage } from './pages/TodayPage'
import { JournalPage } from './pages/JournalPage'
import { useSettings, useSettingsLoaded } from './hooks/useSettings'
import { hasPain } from './lib/loggedEntries'
import { useAllEntries, useTodayEntry } from './hooks/useEntries'
import { oldZonesUsed } from './lib/bodyZones'
import { ZonesNotice } from './components/about/ZonesNotice'
import { NewsSheet } from './components/news/NewsSheet'
import { ThanksNote } from './components/news/ThanksNote'
import { DuoNote } from './components/news/DuoNote'
import { daysWithOuch, DUO_CUTOFF, loggedBy, newsItems, newsToOpen, quietDay, thanksEligible, unreadNews, type NewsId, type NewsState } from './lib/news'
import { loggedEntries } from './lib/loggedEntries'
import { useLeadList } from './hooks/useLeadList'
import { useTodayMessages } from './hooks/useTodayMessages'
import { trendsDot } from './lib/leadHints'
import { updateSettings } from './db'
import { maybeShowReminder } from './lib/reminder'
import { clearWipedNotice, wipedNotice } from './lib/wipe'
import { requestStorageProtection } from './lib/storage'
import { getTranslations, I18nProvider } from './i18n'
import type { Language } from './i18n'
import { todayISO } from './lib/dates'
import { withPageFade } from './lib/pageFade'

// The day's page and the journal open the app. The other screens, the first-run
// setup and the demo tour are loaded on demand, so the first paint does not wait
// for the charts and the report; once the app is idle they are fetched anyway
// (and kept offline by the service worker), so opening a tab is not slower.
const loadTrends = () => import('./pages/TrendsPage').then((m) => ({ default: m.TrendsPage }))
const loadSettings = () => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
const loadKids = () => import('./pages/ChildViewPage').then((m) => ({ default: m.ChildViewPage }))
const loadConsultation = () => import('./pages/ConsultationPage').then((m) => ({ default: m.ConsultationPage }))
const loadSoulager = () => import('./pages/SoulagerPage').then((m) => ({ default: m.SoulagerPage }))
const TrendsPage = lazy(loadTrends)
const SettingsPage = lazy(loadSettings)
const ConsultationPage = lazy(loadConsultation)
const ChildViewPage = lazy(loadKids)
const SoulagerPage = lazy(loadSoulager)
const SetupWizard = lazy(() => import('./components/setup/SetupWizard').then((m) => ({ default: m.SetupWizard })))
const DemoTour = lazy(() => import('./components/demo/DemoTour').then((m) => ({ default: m.DemoTour })))

function useAppliedTheme(theme: 'system' | 'light' | 'dark') {
  useEffect(() => {
    if (theme === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])
}

/** The page background of each look, light then dark: mirrors --color-paper in index.css. */
const LOOK_PAPER = { meteo: ['#f8f3fa', '#14121d'], leger: ['#fbf8fa', '#16131b'] } as const

/** The look itself is stamped on the page by lib/look.ts; here, the status bar colour that goes with it. */
function useAppliedLook(theme: 'system' | 'light' | 'dark') {
  const look = useLook()
  const dark = useIsDark(theme)
  // The system tints the status bar area with this colour (the notch and the
  // dynamic island on a phone): the page's own background (--color-paper of
  // each look, in index.css).
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const usual = meta.getAttribute('content') ?? ''
    meta.setAttribute('content', LOOK_PAPER[look][dark ? 1 : 0])
    return () => meta.setAttribute('content', usual)
  }, [look, dark])
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
  // Opened from a shortcut of the icon: the breathing screen, or the day's page (the default).
  const [launch] = useState(() => launchTarget(window.location.search))
  const [byDoctor] = useState(() => fromDoctor(window.location.search))
  const [tab, setTabOnly] = useState<Tab>(launch === 'souffler' ? 'soulager' : 'today')
  // Settings and the kids' page open from the day's page, as pages of their own: the tab bar stays, with Today lit.
  const [screen, setScreen] = useState<'settings' | 'kids' | null>(null)
  // A screen of the Soulager tab asked for from elsewhere (the soft word of a hard day); `key` makes each ask a fresh start.
  const [soulagerRequest, setSoulagerRequest] = useState<{ view: SoulagerView; key: number } | null>(launch === 'souffler' ? { view: 'breath', key: 0 } : null)
  const setTab = (next: Tab) => {
    setScreen(null)
    setTabOnly(next)
  }
  const [tourOpen, setTourOpen] = useState(() => IS_DEMO && tourPending())
  const settings = useSettings()
  const settingsLoaded = useSettingsLoaded()
  const todayEntry = useTodayEntry()
  const leadList = useLeadList()
  const messages = useTodayMessages()
  // The leads the day's list brings, or has had set aside, are not "new" on the Trends tab: the line says it already.
  const announced = [
    ...(messages?.items.flatMap((m) => (m.kind === 'lead' ? [m.lead.key] : [])) ?? []),
    ...Object.keys(settings.leadsSeen?.later ?? {}).flatMap((k) => (k.startsWith('lead:') ? [k.slice(5)] : [])),
  ]
  const allEntries = useAllEntries()
  // A journal that holds zones of the first versions is told about the new ones, once per device.
  const oldZones = useMemo(() => oldZonesUsed(allEntries ?? []), [allEntries])
  // « Nouveautés »: the button next to the settings, its sheet, and the item opened from it (or on its own, once per launch).
  const logged = useMemo(() => loggedEntries(allEntries ?? []), [allEntries])
  const today = todayISO()
  const newsState: NewsState = {
    hasOldZones: oldZones.length > 0,
    zonesNoticeSeen: !!settings.zonesNoticeSeen,
    thanksEligible: thanksEligible(logged),
    duoEligible: loggedBy(logged, DUO_CUTOFF),
    seen: settings.newsSeen ?? [],
  }
  const quiet = quietDay({ illnesses: settings.illnesses, logged, all: allEntries ?? [], markedFlares: settings.markedFlares, today })
  const unread = unreadNews(newsState)
  const [newsOpen, setNewsOpen] = useState(false)
  const [newsItem, setNewsItem] = useState<NewsId | null>(null)
  const [newsAutoDone, setNewsAutoDone] = useState(false)
  function markNewsSeen(id: NewsId) {
    const seen = settings.newsSeen ?? []
    void updateSettings({ newsSeen: seen.includes(id) ? seen : [...seen, id], ...(id === 'zones' ? { zonesNoticeSeen: true } : {}) })
  }
  useAppliedTheme(settings.theme)
  useEffect(() => {
    if (!settings.onboardingDone) return
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000))
    // All the tabs: a page left open across a release then already holds them (see main.tsx).
    idle(() => {
      void loadTrends()
      void loadSettings()
      void loadSoulager()
      void loadConsultation()
    })
  }, [settings.onboardingDone])
  useAppliedLook(settings.theme)
  useAutoBackup()
  useAudiencePing()
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

  // One unread item opens on its own, once per launch, after the setup and the tour, never on a quiet day nor in the demo.
  const autoNews = allEntries && settingsLoaded && settings.onboardingDone && !tourOpen && !IS_DEMO && !newsAutoDone ? newsToOpen(newsState, quiet) : null
  // Adjusted during render (React's pattern for state that follows other state): no effect, no extra paint without it.
  if (autoNews) {
    setNewsAutoDone(true)
    setNewsItem(autoNews)
  }

  // From the backup reminder: open the settings on the backup card.
  const [backupRequested, setBackupRequested] = useState(false)
  // A day the journal opens on when it is reached from the day's page.
  const [journalDate, setJournalDate] = useState<string | null>(null)
  // Back from a provider's page (Dropbox): finish the link, then show the Settings, which say how it went.
  useEffect(() => {
    void handleProviderReturn().then((notice) => {
      if (notice) {
        setScreen('settings')
        setBackupRequested(true)
      }
    })
  }, [])
  function goToBackup() {
    setBackupRequested(true)
    setScreen('settings')
    requestAnimationFrame(() => document.getElementById('backup')?.scrollIntoView({ block: 'start' }))
  }

  // The word of the shortcut is spent: a reload or a bookmark opens the app as usual.
  useEffect(() => {
    if (launch || byDoctor) window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }, [launch, byDoctor])

  // A page opened from Today starts at its top.
  useEffect(() => {
    if (screen) window.scrollTo(0, 0)
  }, [screen])

  // Wait for the stored settings, or the setup would flash on every launch.
  if (!settingsLoaded) return null

  // The setup covers the whole screen; the app behind it is not rendered, so
  // neither focus nor a screen reader can wander into it.
  if (!settings.onboardingDone) {
    return (
      <Suspense fallback={null}>
        <SetupWizard
          wiped={wiped}
          byDoctor={byDoctor}
          onDone={() => {
            setTab('today')
            updateSettings({ onboardingDone: true })
          }}
        />
      </Suspense>
    )
  }

  return (
    <>
      {!IS_DEMO && <WeatherShareSender />}
      <main className="flex-1">
        <ReliefContext.Provider
          value={(view) => {
            setSoulagerRequest({ view, key: Date.now() })
            setTab('soulager')
          }}
        >
        <BackupContext.Provider value={goToBackup}>
        <Suspense fallback={null}>
        {screen === 'settings' && (
          <PageBack onBack={() => setScreen(null)}>
            <SettingsPage openBackup={backupRequested} onReplayTour={() => setTourOpen(true)} />
          </PageBack>
        )}
        {screen === 'kids' && settings.kidsTabEnabled && (
          <PageBack onBack={() => setScreen(null)}>
            <ChildViewPage />
          </PageBack>
        )}
        {screen === null && tab === 'today' && (
          <TodayPage
            onGoToBackup={goToBackup}
            onOpenSettings={() => {
              setBackupRequested(false)
              setScreen('settings')
            }}
            news={{ unread: quiet ? 0 : unread.length, onOpen: () => setNewsOpen(true) }}
            onOpenKids={settings.kidsTabEnabled ? () => setScreen('kids') : undefined}
            onGoToTab={(next, date) => {
              setBackupRequested(false)
              setJournalDate(date ?? null)
              setTab(next)
            }}
          />
        )}
        {screen === null && tab === 'journal' && <JournalPage key={journalDate ?? ''} openDate={journalDate} />}
        {screen === null && tab === 'trends' && <TrendsPage />}
        {screen === null && tab === 'soulager' && (
          <SoulagerPage
            key={soulagerRequest?.key ?? 'tab'}
            request={soulagerRequest?.view}
            onExit={() => {
              setSoulagerRequest(null)
              setTab('today')
            }}
          />
        )}
        {screen === null && tab === 'consultation' && <ConsultationPage />}
        </Suspense>
        </BackupContext.Provider>
        </ReliefContext.Provider>
      </main>
      <TabBar
        active={tab}
        tag={IS_DEMO && !tourOpen ? <DemoTag /> : undefined}
        badged={tab !== 'trends' && trendsDot({ shown: leadList?.shown ?? [], seen: settings.leadsSeen, enabled: settings.suggestionsEnabled, announced }) ? ['trends'] : []}
        onChange={(next) =>
          withPageFade(() => {
            setBackupRequested(false)
            setJournalDate(null)
            setSoulagerRequest(null)
            setTab(next)
          })
        }
      />
      {newsOpen && (
        <NewsSheet
          items={newsItems(newsState)}
          unread={unread}
          onClose={() => setNewsOpen(false)}
          onOpen={(id) => {
            setNewsOpen(false)
            setNewsItem(id)
          }}
        />
      )}
      {newsItem === 'zones' && (
        <ZonesNotice
          oldZones={oldZones}
          onClose={() => {
            markNewsSeen('zones')
            setNewsItem(null)
          }}
          onTry={
            oldZones.length > 0
              ? () => {
                  markNewsSeen('zones')
                  setNewsItem(null)
                  setBackupRequested(false)
                  setTab('today')
                }
              : undefined
          }
        />
      )}
      {newsItem === 'duo' && (
        <DuoNote
          backupReady={settings.autoBackup?.provider === 'dropbox'}
          onClose={() => {
            markNewsSeen('duo')
            setNewsItem(null)
          }}
          onSetUp={() => {
            markNewsSeen('duo')
            setNewsItem(null)
            goToBackup()
          }}
        />
      )}
      {newsItem === 'thanks' && (
        <ThanksNote
          days={daysWithOuch(logged, today)}
          onClose={() => {
            markNewsSeen('thanks')
            setNewsItem(null)
          }}
        />
      )}
      {IS_DEMO && tourOpen && (
        <Suspense fallback={null}>
          <DemoTour
            setTab={setTab}
            onClose={() => {
              finishTour()
              setTourOpen(false)
            }}
          />
        </Suspense>
      )}
      <UpdatedPill />
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
