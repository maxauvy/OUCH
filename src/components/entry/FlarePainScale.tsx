import { useRef, type KeyboardEvent } from 'react'
import { PAIN_MAX, segmentStrength, stepPain } from '../../lib/painScale'
import { useTranslation } from '../../i18n'

const POINTS = Array.from({ length: PAIN_MAX + 1 }, (_, i) => i)

/**
 * The pain input of the lighter form, for days when a slider is hard to
 * handle: one touch on a tall segment sets the day's pain, and two large
 * buttons correct it by one. Nothing is preselected, so the answer is not
 * anchored on a starting value. The bar fills from the left in one blue that
 * deepens with pain (no green to red: a colour would say what is "bad"), and
 * the chosen segment is also ringed, so colour is never the only cue.
 */
export function FlarePainScale({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  const t = useTranslation().entryForm
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const pick = (v: number) => {
    onChange(v)
    refs.current[v]?.focus()
  }
  const step = (delta: -1 | 1) => {
    const next = stepPain(value, delta)
    if (next !== undefined && next !== value) onChange(next)
  }

  // A group of radios: arrows move the choice, Home and End go to the ends.
  function onKeyDown(e: KeyboardEvent) {
    const from = value ?? -1
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? Math.min(PAIN_MAX, from + 1)
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? Math.max(0, from - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? PAIN_MAX
              : null
    if (to === null) return
    e.preventDefault()
    pick(to)
  }

  const stepButton = (delta: -1 | 1, label: string, glyph: string) => {
    const disabled = value === undefined || (delta < 0 ? value <= 0 : value >= PAIN_MAX)
    return (
      <button
        type="button"
        onClick={() => step(delta)}
        disabled={disabled}
        aria-label={label}
        className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full text-[36px] leading-none touch-manipulation disabled:opacity-40"
        style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
      >
        <span aria-hidden>{glyph}</span>
      </button>
    )
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        {stepButton(-1, t.painLess, '−')}
        <div className="text-center" aria-live="polite">
          <p className="tabular-nums text-[60px] leading-none font-bold">
            {value ?? <span className="font-light" style={{ color: 'var(--color-ink-muted)' }}>—</span>}
          </p>
          <p className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
            {value === undefined ? t.painTouch : t.painOutOf}
          </p>
        </div>
        {stepButton(1, t.painMore, '+')}
      </div>

      <div role="radiogroup" aria-label={t.pain} onKeyDown={onKeyDown} className="flex gap-[3px] mt-4">
        {POINTS.map((i) => {
          const filled = value !== undefined && i <= value
          const chosen = i === value
          return (
            <button
              key={i}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={chosen}
              aria-label={String(i)}
              tabIndex={chosen || (value === undefined && i === 0) ? 0 : -1}
              onClick={() => onChange(i)}
              className="flex-1 min-w-0 touch-manipulation"
            >
              <span
                className="block h-[54px] rounded-lg"
                style={{
                  background: filled
                    ? `color-mix(in srgb, var(--color-brand) ${segmentStrength(i)}%, var(--color-brand-soft))`
                    : 'var(--color-surface)',
                  border: `1.5px solid ${filled ? 'transparent' : 'var(--color-control-off)'}`,
                  boxShadow: chosen ? '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-brand)' : undefined,
                }}
                aria-hidden
              />
              <span
                className="block mt-1 text-caption tabular-nums"
                style={{ color: chosen ? 'var(--color-ink)' : 'var(--color-ink-muted)', fontWeight: chosen ? 700 : 400 }}
                aria-hidden
              >
                {i}
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex justify-between text-caption mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
        <span>0 : {t.painEndNone.toLocaleLowerCase()}</span>
        <span>10 : {t.painEndExtreme.toLocaleLowerCase()}</span>
      </div>
    </div>
  )
}
