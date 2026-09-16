import type { PropsWithChildren, ReactNode } from 'react'

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-[var(--radius-card)] p-5 ${className}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-hairline)',
        boxShadow: '0 1px 2px rgba(20, 15, 35, 0.04)',
      }}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[17px] font-semibold" style={{ color: 'var(--color-ink)' }}>
        {children}
      </h2>
      {action}
    </div>
  )
}
