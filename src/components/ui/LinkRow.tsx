import type { ReactNode } from 'react'
import { IconChevronRight, type Icon } from '@tabler/icons-react'
import { RoundIcon } from './RoundIcon'

/** A row that opens something: a round icon, a title, a line under it, a chevron. Several of them go in one Card. `badge` is a small dot, named for screen readers, for something new inside. */
export function LinkRow({ icon, title, hint, badge, onClick }: { icon: Icon; title: string; hint?: ReactNode; badge?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 py-3 text-left border-t first:border-t-0 min-h-11 w-full" style={{ borderColor: 'var(--color-hairline)' }}>
      <RoundIcon icon={icon} />
      <span className="flex-1 min-w-0">
        <span className="block text-body font-semibold">{title}</span>
        {hint && (
          <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {hint}
          </span>
        )}
      </span>
      {badge && (
        <span role="img" aria-label={badge} className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-brand)' }} />
      )}
      <IconChevronRight size={20} aria-hidden style={{ color: 'var(--color-ink-muted)' }} />
    </button>
  )
}
