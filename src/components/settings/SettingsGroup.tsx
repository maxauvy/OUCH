import { useId, useState, type PropsWithChildren } from 'react'
import { IconChevronDown, type Icon as TablerIcon } from '@tabler/icons-react'
import { FlatCardContext } from '../ui/flatCard'
import { RoundIcon } from '../ui/RoundIcon'

/**
 * A collapsible group of settings, in one card: a header showing a one-line
 * summary of the current values, so most of them can be read without opening
 * anything, and under it, after a rule, the sections (the cards given to it).
 * The body stays mounted when closed (hidden), so a half-typed field or an open
 * editor is not lost by folding the group.
 */
export function SettingsGroup({
  icon: Icon,
  title,
  summary,
  defaultOpen = false,
  openSignal = 0,
  id,
  children,
}: PropsWithChildren<{
  icon: TablerIcon
  title: string
  summary?: string
  defaultOpen?: boolean
  /** Raised (changed to a higher number) to open the group from outside, once. */
  openSignal?: number
  id?: string
}>) {
  const [open, setOpen] = useState(defaultOpen)
  const [seenSignal, setSeenSignal] = useState(openSignal)
  if (openSignal !== seenSignal) {
    setSeenSignal(openSignal)
    if (openSignal > 0) setOpen(true)
  }
  const bodyId = useId()
  return (
    <section
      id={id}
      className="flex flex-col scroll-mt-4 rounded-[var(--radius-card)] overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', boxShadow: 'var(--card-shadow)' }}
    >
      <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left">
        <RoundIcon icon={Icon} />
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
      <div id={bodyId} hidden={!open} className="flex flex-col px-4 pb-1 border-t" style={{ borderColor: 'var(--color-hairline)' }}>
        <FlatCardContext.Provider value>{children}</FlatCardContext.Provider>
      </div>
    </section>
  )
}
