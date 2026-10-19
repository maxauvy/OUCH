import { Fragment, useEffect, useRef, useState } from 'react'
import { IconBackspace, IconEye, IconEyeOff } from '@tabler/icons-react'
import { PIN_LENGTH } from '../../lib/pinLock'
import { useLuminous } from '../../lib/look'
import { format, useLanguage, useTranslation } from '../../i18n'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
/** How long a key stays lit after the finger leaves it, and after a press that did not come from a touch (the keyboard). */
const LIT_AFTER_RELEASE_MS = 140
const LIT_AFTER_PRESS_MS = 200

/**
 * Four dots and a round keypad, for typing a code: the lock screen, and the
 * sheets that set, change or remove it. The digits are dots until "Voir" is
 * touched. Once the fourth is typed, `onComplete` gets the code and the pad
 * empties itself. While `disabled` (a pause) it takes nothing.
 */
export function PinPad({
  onComplete,
  onType,
  disabled = false,
}: {
  onComplete: (code: string) => void | Promise<void>
  /** Called when a digit is typed or deleted, so a message about the last try can go. */
  onType?: () => void
  disabled?: boolean
}) {
  const t = useTranslation().lock
  const language = useLanguage()
  const [digits, setDigits] = useState('')
  const [reveal, setReveal] = useState(false)
  const busy = useRef(false)
  const look = useLuminous()
  // The key that is lit: held under the finger, then a moment more, so that even a quick tap is seen.
  const [lit, setLit] = useState<string | null>(null)
  const litTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const held = useRef<string | null>(null)

  function light(d: string, forMs?: number) {
    clearTimeout(litTimer.current)
    setLit(d)
    if (forMs !== undefined) litTimer.current = setTimeout(() => setLit(null), forMs)
  }
  function touchDown(d: string) {
    held.current = d
    light(d)
  }
  /** Only a key that was pressed down is released: a pointer passing over it lights nothing. */
  function touchUp(d: string) {
    if (held.current !== d) return
    held.current = null
    light(d, LIT_AFTER_RELEASE_MS)
  }
  useEffect(() => () => clearTimeout(litTimer.current), [])

  async function press(d: string) {
    if (disabled || busy.current || digits.length >= PIN_LENGTH) return
    onType?.()
    const next = digits + d
    setDigits(next)
    if (next.length < PIN_LENGTH) return
    busy.current = true
    try {
      await onComplete(next)
    } finally {
      busy.current = false
      setDigits('')
    }
  }

  function erase() {
    if (disabled || busy.current) return
    onType?.()
    setDigits((d) => d.slice(0, -1))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Typed in a field (the word that confirms an erase), not on the pad.
      if (e.target instanceof Element && e.target.closest('input, textarea')) return
      if (/^\d$/.test(e.key)) {
        if (look) light(e.key, LIT_AFTER_PRESS_MS)
        void press(e.key)
      } else if (e.key === 'Backspace') erase()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex items-center justify-center gap-4 mt-3 h-8" aria-hidden>
        {Array.from({ length: PIN_LENGTH }, (_, i) => {
          const filled = i < digits.length
          return reveal && filled ? (
            <span key={i} className="w-4 text-center text-title font-semibold leading-none">
              {digits[i]}
            </span>
          ) : (
            <span
              key={i}
              className="w-4 h-4 rounded-full"
              style={{ boxShadow: 'inset 0 0 0 2px var(--color-brand)', background: filled ? 'var(--color-brand)' : 'transparent' }}
            />
          )
        })}
      </div>
      <span className="sr-only" role="status">
        {format(t.typed, { n: digits.length }, language)}
      </span>

      <button
        type="button"
        aria-pressed={reveal}
        aria-label={reveal ? t.hideLabel : t.showLabel}
        onClick={() => setReveal((r) => !r)}
        className="inline-flex items-center gap-1.5 min-h-11 px-3 mt-2 text-control"
        style={{ color: 'var(--color-ink-muted)' }}
      >
        {reveal ? <IconEyeOff size={18} aria-hidden /> : <IconEye size={18} aria-hidden />}
        {reveal ? t.hide : t.show}
      </button>

      <div className="grid grid-cols-3 gap-x-5 gap-y-4 mt-4 w-full max-w-[300px]" style={{ opacity: disabled ? 0.5 : 1 }}>
        {[...KEYS, '0'].map((d) => (
          <Fragment key={d}>
            {d === '0' && <span aria-hidden />}
            <Key
              onPress={() => {
                if (look) light(d, LIT_AFTER_PRESS_MS)
                void press(d)
              }}
              lit={look && lit === d}
              onDown={look ? () => touchDown(d) : undefined}
              onUp={look ? () => touchUp(d) : undefined}
            >
              {d}
            </Key>
          </Fragment>
        ))}
        <button
          type="button"
          onClick={erase}
          aria-label={t.erase}
          className="mx-auto w-[76px] h-[76px] rounded-full flex items-center justify-center"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          <IconBackspace size={26} aria-hidden />
        </button>
      </div>
    </div>
  )
}

function Key({
  children,
  onPress,
  lit = false,
  onDown,
  onUp,
}: {
  children: string
  onPress: () => void
  /** The luminous look: the key shows that it is being, or has just been, touched. */
  lit?: boolean
  onDown?: () => void
  onUp?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      className={`mx-auto w-[76px] h-[76px] rounded-full text-[28px] font-medium transition-[background-color,box-shadow,transform] duration-75 ${lit ? 'motion-safe:scale-[0.94]' : ''}`}
      style={{
        background: lit ? 'color-mix(in srgb, var(--color-brand) 30%, var(--color-surface))' : 'var(--color-brand-soft)',
        boxShadow: lit ? 'inset 0 0 0 3px var(--color-brand)' : undefined,
        color: 'var(--color-brand)',
      }}
    >
      {children}
    </button>
  )
}
