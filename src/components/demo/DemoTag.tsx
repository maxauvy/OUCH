import { useEffect, useId, useRef, useState } from 'react'
import { exitDemo } from '../../lib/demoSession'
import { useTranslation } from '../../i18n'

/**
 * On every screen of the demo, a small « Démo » tag sits on the top left edge of the tab bar: a quiet reminder that the data is made up, which
 * covers nothing of the page (the floating pill it replaces hid the foot of each page, « Mise à jour disponible · Recharger » included). It stays
 * at the same place whatever the open tab. A touch opens a bubble that says it, with the way out; a touch anywhere else (a tab included) or
 * Escape closes it. Leaving needs no confirmation: nothing in the sandbox is worth keeping, and the person's own journal was never in it.
 * Rendered inside the tab bar, which places it.
 */
export function DemoTag() {
  const t = useTranslation().demo
  const [open, setOpen] = useState(false)
  const bubbleId = useId()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} data-demo-pill className="absolute left-2.5 top-0">
      {/* The touch area is taller than the tag it shows, and mostly above the bar: it barely reaches the first tab. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={bubbleId}
        aria-label={t.pill}
        className="absolute left-0 flex items-center px-1.5"
        style={{ top: -20, height: 26 }}
      >
        <span
          aria-hidden
          className="rounded-full px-2 font-semibold uppercase whitespace-nowrap"
          style={{
            fontSize: 11,
            lineHeight: '17px',
            letterSpacing: '0.04em',
            background: 'var(--color-brand-soft)',
            color: 'var(--color-brand)',
            boxShadow: '0 1px 3px rgba(20, 28, 48, 0.12)',
          }}
        >
          {t.tag}
        </span>
      </button>
      {open && (
        <div
          id={bubbleId}
          className="absolute left-0 rounded-2xl text-caption"
          style={{
            bottom: 18,
            width: 'min(250px, calc(100vw - 40px))',
            padding: '10px 12px 4px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-hairline)',
            boxShadow: '0 10px 30px -14px rgba(20, 28, 48, 0.5)',
            color: 'var(--color-ink)',
          }}
        >
          <p className="font-semibold">{t.settingsTitle}</p>
          <p style={{ color: 'var(--color-ink-muted)' }}>{t.tagText}</p>
          <button
            type="button"
            onClick={() => void exitDemo()}
            className="min-h-9 font-semibold underline underline-offset-2"
            style={{ color: 'var(--color-brand)' }}
          >
            {t.tourExit}
          </button>
        </div>
      )}
    </div>
  )
}
