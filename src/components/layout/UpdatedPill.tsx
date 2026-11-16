import { useEffect, useState } from 'react'
import { IconCircleCheck } from '@tabler/icons-react'
import { format } from '../../i18n/format'
import { useLanguage, useTranslation } from '../../i18n'
import { forgetUpdated, justUpdated } from '../../lib/justUpdated'
import { IS_DEMO } from '../../lib/demoMode'

const REPO_URL = 'https://github.com/maxauvy/OUCH'
/** Long enough to read and to reach the link; it stays while a finger or the keyboard is on it. */
const SHOW_MS = 12_000

/**
 * Said once, on the page that comes back after the person tapped "reload" for a new version: the update is done, and where to read what changed (the page of that
 * version, like the number in the footer). It closes by itself. Nothing is stored: a note in the tab's session storage, thrown away as soon as the pill shows (see `lib/justUpdated`).
 */
export function UpdatedPill() {
  const t = useTranslation().footer
  const language = useLanguage()
  // Read, not taken, while rendering (React may render twice); thrown away once it is on screen.
  const [shown, setShown] = useState(() => justUpdated())
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (shown) forgetUpdated()
  }, [shown])
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
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-3 pr-1 text-caption font-semibold shadow-lg"
      // Above the tab bar, and above the demo's pill when there is one.
      style={{ bottom: `calc(env(safe-area-inset-bottom) + ${IS_DEMO ? 124 : 76}px)`, background: 'var(--color-ink)', color: 'var(--color-paper)' }}
    >
      <IconCircleCheck size={16} aria-hidden />
      <span>{format(t.updated, { version }, language)}</span>
      <span aria-hidden>·</span>
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full px-2 underline underline-offset-2" style={{ color: 'var(--color-paper)' }}>
        {t.whatsNew}
      </a>
    </div>
  )
}
