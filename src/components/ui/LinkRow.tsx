import type { ReactNode, Ref } from 'react'
import { IconChevronRight, type Icon } from '@tabler/icons-react'
import { RoundIcon } from './RoundIcon'

/** A row that opens something: a round icon, a title, a line under it, a chevron. Several of them go in one Card; a row without a hint keeps the height of one with a hint, so the list stays even. `badge` is a small dot, named for screen readers, for something new inside. */
export function LinkRow({ icon, title, hint, badge, onClick, buttonRef }: { icon: Icon; title: string; hint?: ReactNode; badge?: string; onClick: () => void; /** For a page that opens from the row and gives focus back to it. */ buttonRef?: Ref<HTMLButtonElement> }) {
  return (
    <button ref={buttonRef} type="button" onClick={onClick} className="flex items-center gap-3 py-3 text-left border-t first:border-t-0 min-h-[4.2rem] w-full" style={{ borderColor: 'var(--color-hairline)' }}>
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
