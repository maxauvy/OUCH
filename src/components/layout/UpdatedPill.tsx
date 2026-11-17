import { useEffect, useState } from 'react'
import { IconCircleCheck, IconX } from '@tabler/icons-react'
import { format } from '../../i18n/format'
import { useLanguage, useTranslation } from '../../i18n'
import { forgetUpdated, justUpdated, rememberVersion, versionChanged } from '../../lib/justUpdated'
import { IS_DEMO } from '../../lib/demoMode'

const REPO_URL = 'https://github.com/maxauvy/OUCH'
/** Long enough to read and to reach the link; it stays while the mouse or the keyboard is on it, and a cross closes it at once. */
const SHOW_MS = 7_000

/**
 * Said once, when a new version is in: the update is done, and where to read what changed (the page of that version, like the number in the footer). It comes after
 * the tap on "reload" (also for a new build of the same version) and whenever the version number is not the one this device saw last, so also after an update that
 * came in by itself. It closes by itself, or with its cross. Not in the demo, where the version means nothing. What is kept: the last version seen, on the device (see `lib/justUpdated`).
 */
export function UpdatedPill() {
  const t = useTranslation().footer
  const language = useLanguage()
  // Read, not taken, while rendering (React may render twice); remembered and thrown away once the page is on screen.
  const [shown, setShown] = useState(() => !IS_DEMO && (justUpdated() || versionChanged(__APP_VERSION__)))
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (IS_DEMO) return
    rememberVersion(__APP_VERSION__)
    forgetUpdated()
  }, [])
  useEffect(() => {
    if (!shown || held) return
    const timer = setTimeout(() => setShown(false), SHOW_MS)
    return () => clearTimeout(timer)
  }, [shown, held])

  if (!shown) return null
  const isRelease = __APP_COMMIT__ !== 'dev' && __APP_COMMIT__ !== 'unknown'
  const version = __APP_IS_TAGGED_RELEASE__ ? `v${__APP_VERSION__}` : isRelease ? `${__APP_VERSION__}+${__APP_COMMIT__}` : __APP_VERSION__
  const href = __APP_IS_TAGGED_RELEASE__ ? `${REPO_URL}/releases/tag/v${__APP_VERSION__}` : `${REPO_URL}/commit/${__APP_COMMIT__}`

  return (
    <div
      role="status"
      // A mouse hovering holds it; a tap does not (a touch screen sends a "mouse enter" that no "leave" follows, and the pill would never close).
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHeld(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-3 pr-0.5 text-caption font-semibold shadow-lg"
      // Above the tab bar, and above the demo's pill when there is one.
      style={{ bottom: `calc(env(safe-area-inset-bottom) + ${IS_DEMO ? 124 : 76}px)`, background: 'var(--color-ink)', color: 'var(--color-paper)' }}
    >
      <IconCircleCheck size={16} aria-hidden />
      <span>{format(t.updated, { version }, language)}</span>
      <span aria-hidden>·</span>
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full px-2 underline underline-offset-2" style={{ color: 'var(--color-paper)' }}>
        {t.whatsNew}
      </a>
      <button
        type="button"
        onClick={() => setShown(false)}
        aria-label={t.closeUpdated}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ color: 'var(--color-paper)' }}
      >
        <IconX size={16} aria-hidden />
      </button>
    </div>
  )
}
