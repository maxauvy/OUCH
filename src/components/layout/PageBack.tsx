import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { IconChevronLeft } from '@tabler/icons-react'
import { useTranslation } from '../../i18n'

/**
 * A page opened from another one (the settings, the kids' page, a page of Trends or of Relief): a way back above it. The tab bar stays, with its tab lit.
 * Once the link has scrolled away, a round glass button with its arrow takes over at the top left, like the round button of OUCH Duo, so the way back
 * is never lost on a long page; it goes when the link is back in view.
 */
export function PageBack({ onBack, label, children }: PropsWithChildren<{ onBack: () => void; /** Where it goes back to; Today by default. */ label?: string }>) {
  const t = useTranslation()
  const text = label ?? t.today.backToToday
  const link = useRef<HTMLButtonElement>(null)
  const [away, setAway] = useState(false)
  useEffect(() => {
    const el = link.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    // The top band is left out: on an installed iPhone the status bar and its blur cover it, and a link under them is already out of reach.
    const watch = new IntersectionObserver(([entry]) => setAway(!entry.isIntersecting && entry.boundingClientRect.top < 0), { rootMargin: '-56px 0px 0px 0px' })
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  return (
    <>
      <div className="px-4 pt-3">
        <button ref={link} type="button" onClick={onBack} className="inline-flex items-center gap-1 min-h-11 -ml-2 pr-3 text-control font-semibold" style={{ color: 'var(--color-brand)' }}>
          <IconChevronLeft size={20} aria-hidden />
          {text}
        </button>
      </div>
      <button
        type="button"
        onClick={onBack}
        aria-label={text}
        aria-hidden={!away}
        tabIndex={away ? 0 : -1}
        className={`glass-float page-back-float${away ? ' is-away' : ''} fixed z-40 flex h-11 w-11 items-center justify-center rounded-full`}
        style={{ top: 'calc(var(--root-pad-top, 0px) + 8px)', left: 'max(12px, env(safe-area-inset-left))', color: 'var(--color-ink)' }}
      >
        <IconChevronLeft size={22} stroke={2} aria-hidden />
      </button>
      {children}
    </>
  )
}
