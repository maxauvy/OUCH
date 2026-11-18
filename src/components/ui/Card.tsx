import { useContext, type PropsWithChildren, type ReactNode } from 'react'
import type { Icon } from '@tabler/icons-react'
import { useRichLook } from '../../lib/look'
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
        border: 'var(--card-border, 1px solid var(--color-hairline))',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {children}
    </div>
  )
}

/** The title of a card: the title in bold, after a round icon when it has one. The small grey capitals are for naming a group of cards (see GroupCaption), never one card. In the weather look, a larger title in the titles' face and no icon. */
export function SectionTitle({ children, action, icon }: PropsWithChildren<{ action?: ReactNode; icon?: Icon }>) {
  const rich = useRichLook()
  return (
    <div className="flex items-center gap-3 mb-3">
      {icon && !rich && <RoundIcon icon={icon} />}
      <h2 className={`section-title flex-1 min-w-0 ${rich ? 'text-heading font-bold' : 'text-body font-semibold'}`}>{children}</h2>
      {action}
    </div>
  )
}

/** Small uppercase caption above a group of cards. In the weather look, a
 * plain heading in the titles' face instead. `icon` and `tone` (a measure
 * category) are no longer drawn: the weather look dropped the small coloured
 * icon, and the lighter look never had it. */
export function GroupCaption({ children }: PropsWithChildren<{ icon?: Icon; tone?: string }>) {
  const look = useRichLook()
  if (look)
    return (
      <p className="section-title text-heading font-bold px-1 -mb-1 mt-2" style={{ color: 'var(--color-ink)' }}>
        {children}
      </p>
    )
  return (
    <p className="text-caption font-semibold uppercase tracking-[0.06em] px-1 -mb-1 mt-1" style={{ color: 'var(--color-ink-muted)' }}>
      {children}
    </p>
  )
}
