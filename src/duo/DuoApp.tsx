import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { duoUrl, readDuoHash, readDuoInput, type DuoTarget } from '../lib/duoLink'
import { fetchImage, type ImageResult } from './image'
import { useDuoInstall, promptInstall } from './install'
import { Brand } from './Brand'
import { Scanner } from './Scanner'
import { Tour, Understand } from './Understand'
import { EXAMPLE_IMAGE } from './example'
import { forgetTarget, initialTarget, installLater, saveTarget, setInstallLater } from './store'
import { chooseLanguage, intlLocale, strings as t } from './strings'

type Screen = 'welcome' | 'scan' | 'paste' | 'view'

const time = (at: number) => new Date(at).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' })
const day = (at: number) => new Date(at).toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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

  // "Stop following this weather": back to the first screen, with nothing kept.
  const forget = useCallback((link: string) => {
    void forgetTarget(link).then(() => {
      history.replaceState(null, '', `${location.pathname}${location.search}`)
      setTarget(null)
      setArrived(false)
      setScreen('welcome')
    })
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
          <div className="top-row">
            <Brand />
          </div>
          <h1 className="title">{t.showcaseTitle}</h1>
          <p className="text muted-text">{t.showcaseText}</p>
          <Showcase />
          <ol className="how">
            {t.howSteps.map((step, i) => (
              <li key={step}>
                <span aria-hidden="true">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="stack push-end">
            <button type="button" className="btn" onClick={() => setScreen('scan')}>
              {t.scan}
            </button>
            <button type="button" className="link-btn center" onClick={() => setScreen('paste')}>
              {t.paste}
            </button>
            <p className="small center-text">{t.privacy}</p>
            <div className="center-row">
              <LanguageChoice />
            </div>
          </div>
        </div>
      </Shell>
    )
  }
  return (
    <Shell>
      <Today key={target.link} target={target} arrived={arrived} onScan={() => setScreen('scan')} onForget={() => forget(target.link)} />
    </Shell>
  )
}

/** Before any code: the example image, half shown, and the tour that explains it, so a relative sees what Duo brings before scanning. */
function Showcase() {
  const [tour, setTour] = useState<number | null>(null)
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null)
  return (
    <div className="showcase">
      <img src={EXAMPLE_IMAGE[t.lang === 'en' ? 'en' : 'fr']} alt={t.exampleAlt} />
      <span className="showcase-tag" aria-hidden="true">
        {t.exampleTag}
      </span>
      <span className="showcase-fade" aria-hidden="true" />
      <button
        type="button"
        className="showcase-go"
        onClick={(e) => {
          setOpener(e.currentTarget)
          setTour(0)
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01" />
        </svg>
        {t.understandThis}
      </button>
      {tour !== null && (
        <Tour
          step={tour}
          onStep={setTour}
          onClose={() => {
            setTour(null)
            opener?.focus()
          }}
        />
      )}
    </div>
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
function Today({ target, arrived, onScan, onForget }: { target: DuoTarget; arrived: boolean; onScan: () => void; onForget: () => void }) {
  const [asking, setAsking] = useState(false)
  const [result, setResult] = useState<ImageResult | null>(null)
  const [lookedAt, setLookedAt] = useState(0)
  const [loading, setLoading] = useState(true)
  // A newly sent image comes in over the one shown, which leaves once covered (`leaving`); the first one rises in (`entrance`).
  const shown = useRef<ImageResult | null>(null)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [entrance, setEntrance] = useState<'arrive' | 'fade'>('arrive')

  const show = useCallback((next: ImageResult) => {
    const previous = shown.current
    shown.current = next
    const before = sigOf(previous)
    const after = sigOf(next)
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (before && after && before !== after && !calm) {
      setEntrance('fade')
      setLeaving((old) => {
        if (old) URL.revokeObjectURL(old)
        return objectUrls(previous)[0] ?? null
      })
    } else {
      if (!before && after) setEntrance('arrive')
      for (const url of objectUrls(previous)) URL.revokeObjectURL(url)
    }
    setResult(next)
    setLookedAt(Date.now())
    setLoading(false)
  }, [])
  const settled = () =>
    setLeaving((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })

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

  let image: { url: string; sig: string; note: string } | null = null
  if (result?.kind === 'fresh') image = { url: result.url, sig: result.sig, note: t.lookedAt(time(lookedAt)) }
  else if (result?.kind === 'offline') image = { url: result.url, sig: result.sig, note: t.offline(day(result.at)) }
  const gone = result?.kind === 'gone' || result?.kind === 'wrongKey'
  const [tab, setTab] = useState<Tab>('weather')

  return (
    <div className="stack grow">
      <div className="top-row">
        <Brand />
        {!gone && <Menu onScan={onScan} onForget={() => setAsking(true)} />}
      </div>
      {!gone && <Tabs tab={tab} onTab={setTab} />}

      {tab === 'understand' && !gone ? (
        <div role="tabpanel" id="duo-panel-understand" aria-labelledby="duo-tab-understand">
          <Understand name={target.name} />
        </div>
      ) : (
        <div role={gone ? undefined : 'tabpanel'} id="duo-panel-weather" aria-labelledby={gone ? undefined : 'duo-tab-weather'} className="stack grow">
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
              <button type="button" className="link-btn center" onClick={() => setAsking(true)}>
                {t.forget}
              </button>
            </div>
          ) : image ? (
            <div className="weather-frame">
              {leaving && <img className="weather-image" src={leaving} alt="" aria-hidden="true" />}
              {/* One element per sent image: looking again at the same one changes nothing on screen. */}
              <img
                key={image.sig}
                className={`weather-image ${entrance === 'fade' ? 'image-fade-in' : 'image-arrive'}`}
                src={image.url}
                alt={t.imageAlt(target.name)}
                onAnimationEnd={leaving ? settled : undefined}
              />
            </div>
          ) : (
            <div className="weather-image placeholder" role="status">
              {result?.kind === 'nothing' ? t.offlineNothing : t.loading}
            </div>
          )}

          {!gone && (
            // On the first visit the install hint takes the bottom of the screen: the bar stays in its place under the image.
            <div className={arrived ? 'dock in-flow' : 'dock'}>
              <span className="dock-status" role="status">
                <strong>{loading ? t.loading : image ? image.note : ''}</strong>
                {!loading && result?.kind === 'fresh' && <span>{capitalize(day(lookedAt))}</span>}
              </span>
              <button type="button" className={loading ? 'pill is-loading' : 'pill'} onClick={refresh} disabled={loading}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 11A8 8 0 0 0 5.6 6.6L4 8M4 4v4h4M4 13a8 8 0 0 0 14.4 4.4L20 16M20 20v-4h-4" />
                </svg>
                {t.refresh}
              </button>
            </div>
          )}

          {gone && (
            <div className="footer">
              <LanguageChoice />
            </div>
          )}
        </div>
      )}

      {arrived && <InstallSheet />}
      {asking && <ForgetConfirm name={target.name} onForget={onForget} onCancel={() => setAsking(false)} />}
    </div>
  )
}

type Tab = 'weather' | 'understand'

/** "Their weather" and "Understand": two tabs, the arrows move between them. */
function Tabs({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  const tabs: [Tab, string][] = [
    ['weather', t.tabWeather],
    ['understand', t.tabUnderstand],
  ]
  return (
    <div className="tabs" role="tablist" aria-label={t.tabsLabel}>
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`duo-tab-${id}`}
          aria-selected={tab === id}
          aria-controls={`duo-panel-${id}`}
          tabIndex={tab === id ? 0 : -1}
          onClick={() => onTab(id)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            const next: Tab = id === 'weather' ? 'understand' : 'weather'
            onTab(next)
            document.getElementById(`duo-tab-${next}`)?.focus()
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** The round button at the top: what is rarely needed, scanning another code and the language, out of the way. */
function Menu({ onScan, onForget }: { onScan: () => void; onForget: () => void }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <div className="menu">
      <button type="button" className="round" id="duo-menu-button" aria-label={t.more} aria-expanded={open} aria-controls="duo-menu" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open && (
        <>
          <button type="button" className="menu-backdrop" aria-label={t.close} onClick={() => setOpen(false)} />
          <div className="menu-panel" id="duo-menu">
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setOpen(false)
                onScan()
              }}
            >
              {t.otherCode}
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setOpen(false)
                onForget()
              }}
            >
              {t.forget}
            </button>
            <LanguageChoice />
          </div>
        </>
      )}
    </div>
  )
}

/** Asks before forgetting, since the code is needed to come back. Calm: no alert colour, and "Cancel" has the focus. */
function ForgetConfirm({ name, onForget, onCancel }: { name?: string; onForget: () => void; onCancel: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    cancel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // The menu item that opened it is gone with the menu: back to the round button.
      ;(before?.isConnected ? before : document.getElementById('duo-menu-button'))?.focus()
    }
  }, [onCancel])
  return (
    <div className="confirm-layer">
      <button type="button" className="confirm-backdrop" aria-label={t.cancel} tabIndex={-1} onClick={onCancel} />
      <section className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="duo-forget-title" aria-describedby="duo-forget-text">
        <h2 id="duo-forget-title" className="card-title">
          {t.forgetTitle(name)}
        </h2>
        <p id="duo-forget-text" className="text">
          {t.forgetText(name)}
        </p>
        <button type="button" className="btn" onClick={onForget}>
          {t.forgetOk}
        </button>
        <button type="button" className="link-btn center" ref={cancel} onClick={onCancel}>
          {t.cancel}
        </button>
      </section>
    </div>
  )
}

function sigOf(result: ImageResult | null): string | undefined {
  return result?.kind === 'fresh' || result?.kind === 'offline' ? result.sig : undefined
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
      <Brand />
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
