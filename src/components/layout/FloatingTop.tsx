import type { PropsWithChildren } from 'react'

/**
 * A glass bar at the top of the screen that stands in for something of the page once it has scrolled away (the period of Trends,
 * the day open in the Journal), in the glass of the tab bar. Out of sight, it is inert: not read, not reached, not touched.
 * `besideBack` leaves room for the round way back of a page (PageBack), at the top left.
 */
export function FloatingTop({ away, besideBack = false, label, children }: PropsWithChildren<{ away: boolean; besideBack?: boolean; label?: string }>) {
  return (
    <div
      role={label ? 'region' : undefined}
      aria-label={label}
      aria-hidden={!away}
      inert={!away}
      className={`glass-float float-in${away ? ' is-away' : ''} fixed z-40 rounded-[18px] p-[5px]`}
      style={{
        top: 'calc(var(--root-pad-top, 0px) + 8px)',
        left: besideBack ? 'calc(max(12px, env(safe-area-inset-left)) + 52px)' : 'max(12px, env(safe-area-inset-left))',
        right: 'max(12px, env(safe-area-inset-right))',
        maxWidth: 536,
      }}
    >
      {children}
    </div>
  )
}
