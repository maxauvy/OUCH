import type { Icon } from '@tabler/icons-react'

/** The small round tinted icon that opens a section, like the cards of the day's page. */
export function RoundIcon({ icon: I, className = '' }: { icon: Icon; className?: string }) {
  return (
    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${className}`} style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }} aria-hidden>
      <I size={20} stroke={1.8} />
    </span>
  )
}
