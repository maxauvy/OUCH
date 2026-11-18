import type { Ref } from 'react'
import type { Icon } from '@tabler/icons-react'

/** A tile that opens another page, in the weather look: a small square icon in a
 * measure's colour, a title, a line under it. Two go side by side (see
 * NavTiles). `tone` is a measure category of index.css (`fog`, `meds`, `sleep`…).
 * `badge` is a small dot, named for screen readers, for something new inside. */
export function NavTile({ icon: I, title, hint, tone, badge, onClick, buttonRef }: { icon: Icon; title: string; hint?: string; tone: string; badge?: string; onClick: () => void; buttonRef?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className="relative text-left rounded-[20px] p-3.5 flex flex-col gap-2.5 min-h-[108px]"
      style={{ background: 'var(--color-surface)', border: 'var(--card-border, 1px solid var(--color-hairline))', boxShadow: 'var(--card-shadow)' }}
    >
      <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `var(--cat-${tone}-soft)`, color: `var(--cat-${tone})` }} aria-hidden>
        <I size={20} stroke={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block text-body font-bold leading-snug">{title}</span>
        {hint && (
          <span className="block text-caption mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
            {hint}
          </span>
        )}
      </span>
      {badge && <span role="img" aria-label={badge} className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-brand)' }} />}
    </button>
  )
}

/** Tiles two by two. An odd one out takes the whole row, so nothing sits alone beside a gap. */
export function NavTiles({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 [&>*:last-child:nth-child(odd)]:col-span-2">{children}</div>
}
