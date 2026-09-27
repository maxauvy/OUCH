import type { PropsWithChildren, ReactNode } from 'react'
import { useDesign } from '../../hooks/useDesign'

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
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

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  const design = useDesign()
  return (
    <div className="flex items-center justify-between mb-3">
      <h2
        className={
          design === 'health' ? 'text-caption font-semibold uppercase tracking-[0.06em]' : 'text-heading font-semibold'
        }
        style={{ color: design === 'health' ? 'var(--color-ink-muted)' : 'var(--color-ink)' }}
      >
        {children}
      </h2>
      {action}
    </div>
  )
}

/** Health design: small uppercase caption above a group of cards. */
export function GroupCaption({ children }: PropsWithChildren) {
  return (
    <p
      className="text-caption font-semibold uppercase tracking-[0.06em] px-1 -mb-1 mt-1"
      style={{ color: 'var(--color-ink-muted)' }}
    >
      {children}
    </p>
  )
}
