import { useState, type ReactNode } from 'react'
import { IconCheck, type Icon } from '@tabler/icons-react'
import { useTranslation } from '../../i18n'
import { useRichLook } from '../../lib/look'

export interface LightItem {
  key: string
  label: string
  icon: Icon
  /** Already has something in it: shown open */
  filled: boolean
  content: ReactNode
}

/** What follows the pain on the lighter form: once it is noted, one line of
 * thanks and one soft button per part, each opening only that part. Nothing
 * is asked. A part that already holds something is open from the start, and
 * stays open once opened, even if what is in it is cleared. */
export function LightExtras({ noted, items }: { noted: boolean; items: LightItem[] }) {
  const t = useTranslation().hardDays
  // The weather look: the parts still closed sit side by side as tiles.
  const rich = useRichLook()
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  // A part that holds something opens, and stays open if it is then emptied.
  // Done while rendering, like the draft's reload in the day's form, so it
  // never paints folded for a frame.
  const newlyFilled = items.filter((i) => i.filled && !open.has(i.key)).map((i) => i.key)
  if (newlyFilled.length) setOpen((prev) => new Set([...prev, ...newlyFilled]))

  if (!noted || items.length === 0) return null

  const openItems = items.filter((i) => open.has(i.key) || i.filled)
  const closed = items.filter((i) => !(open.has(i.key) || i.filled))

  return (
    <div className="flex flex-col gap-2.5">
      <p role="status" className="flex items-center gap-2 text-body px-1">
        <span
          className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center"
          style={{ background: 'var(--cat-mood-soft)', color: 'var(--cat-mood)' }}
          aria-hidden
        >
          <IconCheck size={13} stroke={2.5} />
        </span>
        {t.lightNoted}
      </p>
      {rich ? (
        <>
          {openItems.map((item) => (
            <div key={item.key}>{item.content}</div>
          ))}
          {closed.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {closed.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setOpen((prev) => new Set(prev).add(item.key))}
                  className="min-h-[88px] rounded-[20px] p-3.5 flex flex-col items-start justify-between gap-2.5 text-body font-semibold text-left"
                  style={{ background: 'var(--color-surface)', border: 'var(--card-border, none)', boxShadow: 'var(--card-shadow)', color: 'var(--color-ink)' }}
                >
                  <span className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }} aria-hidden>
                    <item.icon size={19} stroke={1.8} />
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        items.map((item) =>
          open.has(item.key) || item.filled ? (
            <div key={item.key}>{item.content}</div>
          ) : (
            <button
              key={item.key}
              type="button"
              onClick={() => setOpen((prev) => new Set(prev).add(item.key))}
              className="min-h-12 rounded-[var(--radius-card)] px-3.5 py-3 flex items-center gap-3 text-body font-semibold text-left"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', color: 'var(--color-brand)' }}
            >
              <span
                className="w-7 h-7 shrink-0 rounded-[7px] flex items-center justify-center"
                style={{ background: 'var(--color-brand-soft)' }}
                aria-hidden
              >
                <item.icon size={17} stroke={1.8} />
              </span>
              {item.label}
            </button>
          )
        )
      )}
    </div>
  )
}
