import { flushSync } from 'react-dom'

/** How long a page that is still loading may hold the fade back (ms): past it, the fade goes on with what is there. */
const WAIT_MS = 400

/**
 * Changing tab with a soft fade (View Transitions): the page that leaves fades
 * out, the new one fades in rising 6px, the tab bar stays live so its pill can
 * glide (index.css, `html.page-fading`). The old page stays on screen until the
 * new one is drawn, so there is no blank frame between them. Without the API,
 * or with reduced motion, the change is immediate, as before.
 */
export function withPageFade(change: () => void) {
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (calm || typeof document.startViewTransition !== 'function') return change()
  const root = document.documentElement
  root.classList.add('page-fading')
  const transition = document.startViewTransition(async () => {
    flushSync(change)
    await pageDrawn()
  })
  void transition.finished.finally(() => root.classList.remove('page-fading'))
}

/** A page loaded on demand shows nothing the first time, while its code comes: wait for it, a little. */
function pageDrawn(): Promise<void> {
  const start = performance.now()
  return new Promise((resolve) => {
    const check = () => {
      const main = document.querySelector('main')
      if (!main || main.childElementCount > 0 || performance.now() - start > WAIT_MS) resolve()
      else setTimeout(check, 16)
    }
    check()
  })
}
