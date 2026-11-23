import { IconCalendar, IconChartLine, IconHeartbeat, IconStethoscope, IconWind, type Icon } from '@tabler/icons-react'
import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from '../../i18n'

export type Tab = 'today' | 'journal' | 'trends' | 'soulager' | 'consultation'

const TAB_ICONS: Record<Tab, Icon> = {
  today: IconHeartbeat,
  journal: IconCalendar,
  trends: IconChartLine,
  soulager: IconWind,
  consultation: IconStethoscope,
}

/**
 * `badged` tabs carry a small dot, named for screen readers: something new is there, without a number. `tag` is drawn on the bar's top left
 * edge, the same place whatever the open tab (the demo's tag).
 */
export function TabBar({
  active,
  onChange,
  badged = [],
  tag,
}: {
  active: Tab
  onChange: (t: Tab) => void
  badged?: Tab[]
  tag?: ReactNode
}) {
  const t = useTranslation()
  const pillRef = useRef<HTMLDivElement>(null)
  const place = useGlidingPill(pillRef, active)
  // The pill's width follows the text size and the language: the soft disc goes back under the open tab, without moving.
  useEffect(() => {
    const pill = pillRef.current
    if (!pill || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => place.current(false))
    observer.observe(pill)
    return () => observer.disconnect()
  }, [place])
  const ALL: { id: Tab; label: string }[] = [
    { id: 'today', label: t.tabs.today },
    { id: 'journal', label: t.tabs.journal },
    { id: 'trends', label: t.tabs.trends },
    { id: 'soulager', label: t.tabs.soulager },
    { id: 'consultation', label: t.tabs.consultation },
  ]
  const TABS = ALL
  // A compact pill floating above the bottom edge, as the « Actualiser » bubble of OUCH Duo: the page
  // shows through its frosted glass while it scrolls. Only the open tab shows its name; the others keep
  // theirs for screen readers. On an installed iPhone it sits just above the home bar rather than below
  // the whole safe area. The pages keep 112px free at their foot (pb-28), more than the pill needs.
  return (
    <nav
      className="fixed inset-x-0 z-40 flex justify-center px-3 pointer-events-none"
      style={{ bottom: 'max(12px, calc(env(safe-area-inset-bottom) - 12px))' }}
    >
      <div
        ref={pillRef}
        className="glass-float pointer-events-auto relative flex items-center max-w-full"
        style={{ height: 58, padding: 5, borderRadius: 999 }}
      >
        {/* The soft disc under the open tab: one for the bar, so it can glide from a tab to the next. */}
        <span
          aria-hidden
          data-pill-disc
          className="absolute left-0 top-[5px] bottom-[5px] rounded-full"
          style={{ background: 'var(--color-brand-soft)', width: 0 }}
        />
        {TABS.map((tab) => {
          const isActive = active === tab.id
          const Icon = TAB_ICONS[tab.id]
          const badge = badged.includes(tab.id)
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={badge ? `${tab.label}, ${t.tabs.trendsNew}` : tab.label}
              className="relative h-full flex items-center justify-center gap-1.5 shrink-0 min-w-0"
              style={{
                borderRadius: 999,
                minWidth: 46,
                padding: isActive ? '0 15px 0 12px' : 0,
                color: isActive ? 'var(--tab-active, var(--color-ink))' : 'var(--color-ink-muted)',
              }}
            >
              <span className="relative flex shrink-0" style={{ color: isActive ? 'var(--tab-active-icon, inherit)' : undefined }}>
                <Icon size={24} stroke={isActive ? 2 : 1.6} aria-hidden />
                {badge && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full"
                    style={{ background: 'var(--color-brand)', boxShadow: '0 0 0 2px var(--color-surface)' }}
                  />
                )}
              </span>
              {isActive && (
                <span
                  aria-hidden
                  data-tab-label
                  className="font-semibold truncate"
                  style={{ fontSize: 'min(calc(var(--text-caption) * 1.1), 16px)' }}
                >
                  {tab.label}
                </span>
              )}
            </button>
          )
        })}
        {tag}
      </div>
    </nav>
  )
}

/** How long the soft disc takes to glide to the tab just opened (ms). */
const GLIDE_MS = 300
const GLIDE_EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)'

/**
 * Puts the soft disc under the open tab. When the tab changes, it glides there
 * and the other tabs slide to their new places (the open one widens with its
 * name) instead of jumping; nothing moves with reduced motion. Returns the
 * placing, for a change of size (no glide then).
 */
function useGlidingPill(pillRef: RefObject<HTMLDivElement | null>, active: Tab) {
  // Where each tab and the disc were after the last placing, from the pill's left edge.
  const lefts = useRef(new Map<string, number>())
  const disc = useRef<{ left: number; width: number } | null>(null)
  const place = useRef<(glide: boolean) => void>(() => {})

  useLayoutEffect(() => {
    place.current = (glide: boolean) => {
      const pill = pillRef.current
      const ind = pill?.querySelector<HTMLElement>('[data-pill-disc]')
      if (!pill || !ind) return
      const tabs = [...pill.querySelectorAll<HTMLElement>('[data-tab]')]
      const open = tabs.find((b) => b.dataset.tab === active)
      if (!open) return
      const to = { left: open.offsetLeft, width: open.offsetWidth }
      ind.style.transform = `translateX(${to.left}px)`
      ind.style.width = `${to.width}px`
      const from = disc.current
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (glide && from && !calm && typeof ind.animate === 'function') {
        const timing = { duration: GLIDE_MS, easing: GLIDE_EASE }
        ind.animate(
          [
            { transform: `translateX(${from.left}px)`, width: `${from.width}px` },
            { transform: `translateX(${to.left}px)`, width: `${to.width}px` },
          ],
          timing,
        )
        for (const tab of tabs) {
          const before = lefts.current.get(tab.dataset.tab ?? '')
          const dx = before === undefined ? 0 : before - tab.offsetLeft
          if (Math.abs(dx) > 0.5) tab.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], timing)
        }
        open.querySelector('[data-tab-label]')?.animate([{ opacity: 0 }, { opacity: 1 }], timing)
      }
      disc.current = to
      for (const tab of tabs) lefts.current.set(tab.dataset.tab ?? '', tab.offsetLeft)
    }
    place.current(true)
  }, [active, pillRef])

  return place
}
