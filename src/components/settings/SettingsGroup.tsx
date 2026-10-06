import { useId, useState, type ComponentType, type PropsWithChildren } from 'react'
import { IconChevronDown } from '@tabler/icons-react'

/**
 * A collapsible group of settings: a header showing a one-line summary of the
 * current values, so most of them can be read without opening anything.
 * The body stays mounted when closed (hidden), so a half-typed field or an open
 * editor is not lost by folding the group.
 */
export function SettingsGroup({
  icon: Icon,
  title,
  summary,
  defaultOpen = false,
  id,
  children,
}: PropsWithChildren<{
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
  title: string
  summary?: string
  defaultOpen?: boolean
  id?: string
}>) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()
  return (
    <section id={id} className="flex flex-col gap-4 scroll-mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 rounded-[var(--radius-card)] p-4 text-left"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-hairline)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
        >
          <Icon size={20} aria-hidden />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-body font-semibold">{title}</span>
          {summary && (
            <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {summary}
            </span>
          )}
        </span>
        <span
          className="shrink-0 transition-transform"
          style={{ color: 'var(--color-ink-muted)', transform: open ? 'rotate(180deg)' : undefined }}
        >
          <IconChevronDown size={20} aria-hidden />
        </span>
      </button>
      <div id={bodyId} hidden={!open} className="flex flex-col gap-4">
        {children}
      </div>
    </section>
  )
}
