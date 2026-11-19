import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { duoUrl, readDuoHash, readDuoInput, type DuoTarget } from '../lib/duoLink'
import { fetchImage, type ImageResult } from './image'
import { useDuoInstall, promptInstall } from './install'
import { Scanner } from './Scanner'
import { initialTarget, installLater, saveTarget, setInstallLater } from './store'
import { chooseLanguage, intlLocale, strings as t } from './strings'

type Screen = 'welcome' | 'scan' | 'paste' | 'view'

const time = (at: number) => new Date(at).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' })
const day = (at: number) => new Date(at).toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function DuoApp() {
  const [target, setTarget] = useState<DuoTarget | null>(() => initialTarget(location.hash, isStandalone()))
  const [screen, setScreen] = useState<Screen>(target ? 'view' : 'welcome')
  // Arrived from a code or a link, in the browser: the first visit, with the install hint.
  const [arrived, setArrived] = useState(() => !!target && !isStandalone() && location.hash.length > 1)

  const follow = useCallback((next: DuoTarget) => {
    saveTarget(next)
    // The address keeps the link after #: on iPhone, the app added to the
    // home screen from here opens this very address, and finds the link in it.
    history.replaceState(null, '', `${location.pathname}${location.search}${duoUrl('', next)}`)
    setTarget(next)
    setArrived(!isStandalone())
    setScreen('view')
  }, [])

  // A new link opened while Duo is already open in the browser: only the part after # changes, the page does not reload.
  useEffect(() => {
    const onHash = () => {
      const next = readDuoHash(location.hash)
      if (next) follow(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [follow])

  if (screen === 'scan') return <Shell><Scanner onFound={follow} onCancel={() => setScreen(target ? 'view' : 'welcome')} onPaste={() => setScreen('paste')} /></Shell>
  if (screen === 'paste') return <Shell><Paste onDone={follow} onCancel={() => setScreen(target ? 'view' : 'welcome')} /></Shell>
  if (screen === 'welcome' || !target) {
    return (
      <Shell>
        <div className="stack grow">
          <p className="kicker">{t.appName}</p>
          <h1 className="title">{t.welcomeTitle}</h1>
          <p className="text">{t.welcomeText}</p>
          <div className="stack push-end">
            <button type="button" className="btn" onClick={() => setScreen('scan')}>
              {t.scan}
            </button>
            <button type="button" className="btn soft" onClick={() => setScreen('paste')}>
              {t.paste}
            </button>
            <p className="small">{t.privacy}</p>
            <LanguageChoice />
          </div>
        </div>
      </Shell>
    )
  }
  return (
    <Shell>
      <Today key={target.link} target={target} arrived={arrived} onScan={() => setScreen('scan')} />
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="sky" aria-hidden="true" />
      <main className="page">{children}</main>
    </>
  )
}

/** The day's weather: the image, when it was looked at, and a way to look again. */
function Today({ target, arrived, onScan }: { target: DuoTarget; arrived: boolean; onScan: () => void }) {
  const [result, setResult] = useState<ImageResult | null>(null)
  const [lookedAt, setLookedAt] = useState(0)
  const [loading, setLoading] = useState(true)

  const show = useCallback((next: ImageResult) => {
    setResult((previous) => {
      for (const url of objectUrls(previous)) URL.revokeObjectURL(url)
      return next
    })
    setLookedAt(Date.now())
    setLoading(false)
  }, [])

  const look = useCallback(() => fetchImage(target.link, target.key).catch((): ImageResult => ({ kind: 'nothing' })), [target.link, target.key])

  const refresh = useCallback(() => {
    setLoading(true)
    void look().then(show)
  }, [look, show])

  useEffect(() => {
    void look().then(show)
    // Back to the app after a while (it stays open in the background): look again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [look, show, refresh])

  let image: { url: string; note: string } | null = null
  if (result?.kind === 'fresh') image = { url: result.url, note: t.lookedAt(time(lookedAt)) }
  else if (result?.kind === 'offline') image = { url: result.url, note: t.offline(day(result.at)) }
  const gone = result?.kind === 'gone' || result?.kind === 'wrongKey'

  return (
    <div className="stack grow">
      <p className="kicker">{t.appName}</p>
      <h1 className="title">{arrived ? t.firstTitle(target.name) : t.weatherOf(target.name)}</h1>

      {gone ? (
        <div className="card stack">
          <h2 className="card-title">{result.kind === 'wrongKey' ? t.newCodeTitle : t.goneTitle}</h2>
          <p className="text">{result.kind === 'wrongKey' ? t.newCodeText(target.name) : t.goneText(target.name)}</p>
          {result.kind === 'gone' && (
            <button type="button" className="btn soft" onClick={refresh}>
              {t.tryAgain}
            </button>
          )}
          <button type="button" className="btn soft" onClick={onScan}>
            {t.scanNew}
          </button>
        </div>
      ) : image ? (
        <img
          className="weather-image"
          src={image.url}
          alt={t.imageAlt(target.name)}
        />
      ) : (
        <div className="weather-image placeholder" role="status">
          {result?.kind === 'nothing' ? t.offlineNothing : t.loading}
        </div>
      )}

      {!gone && (
      <div className="footer">
        <div className="footer-row">
          <span className="small" role="status">
            {loading ? t.loading : image ? image.note : ''}
          </span>
          <button type="button" className="link-btn" onClick={refresh} disabled={loading}>
            {t.refresh}
          </button>
        </div>
        <div className="footer-row">
          <button type="button" className="link-btn quiet" onClick={onScan}>
            {t.otherCode}
          </button>
          <LanguageChoice />
        </div>
      </div>
      )}

      {gone && (
        <div className="footer">
          <LanguageChoice />
        </div>
      )}

      {arrived && <InstallSheet />}
    </div>
  )
}

function objectUrls(result: ImageResult | null): string[] {
  if (!result) return []
  return result.kind === 'fresh' || result.kind === 'offline' ? [result.url] : []
}

/** How to keep Duo on the home screen, on the first visit only, until put aside. */
function InstallSheet() {
  const kind = useDuoInstall()
  const [hidden, setHidden] = useState(installLater)
  if (hidden || kind === 'installed' || kind === 'other') return null
  const later = () => {
    setInstallLater()
    setHidden(true)
  }
  return (
    <section className="sheet" aria-label={t.installTitle}>
      <h2 className="card-title">{t.installTitle}</h2>
      {kind === 'ios-safari' && (
        <ol className="steps">
          <li>
            <span aria-hidden="true">1</span>
            {t.iosStep1}
          </li>
          <li>
            <span aria-hidden="true">2</span>
            {t.iosStep2}
          </li>
        </ol>
      )}
      {kind === 'ios-other' && <p className="text">{t.iosOther}</p>}
      {kind === 'prompt' && (
        <button type="button" className="btn" onClick={() => void promptInstall()}>
          {t.install}
        </button>
      )}
      <button type="button" className="link-btn" onClick={later}>
        {t.later}
      </button>
    </section>
  )
}

function Paste({ onDone, onCancel }: { onDone: (target: DuoTarget) => void; onCancel: () => void }) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const target = readDuoInput(value)
    if (target) onDone(target)
    else setWrong(true)
  }
  return (
    <form className="stack grow" onSubmit={submit}>
      <p className="kicker">{t.appName}</p>
      <h1 className="title">{t.pasteLabel}</h1>
      <input
        id="duo-link"
        className="input"
        type="url"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={t.pastePlaceholder}
        aria-label={t.pasteLabel}
        aria-describedby={wrong ? 'duo-link-wrong' : undefined}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setWrong(false)
        }}
      />
      {wrong && (
        <p id="duo-link-wrong" className="text" role="status">
          {t.pasteWrong}
        </p>
      )}
      <div className="stack">
        <button type="submit" className="btn" disabled={!value.trim()}>
          {t.pasteOk}
        </button>
        <button type="button" className="link-btn center" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </form>
  )
}

/** Français · English: the phone's language at first, then the one chosen here. */
function LanguageChoice() {
  return (
    <div className="lang" role="group" aria-label={t.language}>
      {(['fr', 'en'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          className="link-btn quiet"
          aria-pressed={t.lang === lang}
          onClick={() => {
            if (t.lang !== lang) chooseLanguage(lang)
          }}
        >
          {lang === 'fr' ? 'Français' : 'English'}
        </button>
      ))}
    </div>
  )
}
