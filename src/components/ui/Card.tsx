import { useContext, type PropsWithChildren, type ReactNode } from 'react'
import type { Icon } from '@tabler/icons-react'
import { useLuminous } from '../../lib/look'
import { FlatCardContext } from './flatCard'
import { RoundIcon } from './RoundIcon'

/** `tour` marks the card for the demo tour, which outlines it. Inside a settings group it is a section of the group's card: a rule above it, nothing around it. */
export function Card({ children, className = '', tour }: PropsWithChildren<{ className?: string; tour?: string }>) {
  const flat = useContext(FlatCardContext)
  if (flat) {
    return (
      <div data-tour={tour} className={`py-5 border-t first:border-t-0 first:pt-4 ${className}`} style={{ borderColor: 'var(--color-hairline)' }}>
        {children}
      </div>
    )
  }
  return (
    <div
      data-tour={tour}
      className={`rounded-[var(--radius-card)] p-5 ${className}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-hairline)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {children}
    </div>
  )
}

/** The title of a card. In a settings group it is the section's title: a round icon, then the title in bold. */
export function SectionTitle({ children, action, icon }: PropsWithChildren<{ action?: ReactNode; icon?: Icon }>) {
  const flat = useContext(FlatCardContext)
  if (flat) {
    return (
      <div className="flex items-center gap-3 mb-3">
        {icon && <RoundIcon icon={icon} />}
        <h2 className="flex-1 min-w-0 text-body font-semibold">{children}</h2>
        {action}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between mb-3">
      <h2
        className="text-caption font-semibold uppercase tracking-[0.06em]"
        style={{ color: 'var(--color-ink-muted)' }}
      >
        {children}
      </h2>
      {action}
    </div>
  )
}

/** Small uppercase caption above a group of cards. With `icon` and `tone` (a
 * measure category), the luminous look puts a small coloured icon before it. */
export function GroupCaption({ children, icon: I, tone }: PropsWithChildren<{ icon?: Icon; tone?: string }>) {
  const look = useLuminous()
  return (
    <p
      className="text-caption font-semibold uppercase tracking-[0.06em] px-1 -mb-1 mt-1 flex items-center gap-2"
      style={{ color: 'var(--color-ink-muted)' }}
    >
      {look && I && tone && (
        <span
          className="inline-flex items-center justify-center shrink-0 rounded-[7px]"
          style={{ width: 22, height: 22, background: `var(--look-${tone}-soft)`, color: `var(--look-${tone})` }}
          aria-hidden
        >
          <I size={14} stroke={1.8} />
        </span>
      )}
      {children}
    </p>
  )
}
