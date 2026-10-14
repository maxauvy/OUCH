import { useEffect, useRef, useState } from 'react'
import { IconBackspace, IconEye, IconEyeOff } from '@tabler/icons-react'
import { PIN_LENGTH } from '../../lib/pinLock'
import { format, useLanguage, useTranslation } from '../../i18n'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

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
      if (/^\d$/.test(e.key)) void press(e.key)
      else if (e.key === 'Backspace') erase()
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
        {KEYS.map((d) => (
          <Key key={d} onPress={() => void press(d)}>
            {d}
          </Key>
        ))}
        <span aria-hidden />
        <Key onPress={() => void press('0')}>0</Key>
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

function Key({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="mx-auto w-[76px] h-[76px] rounded-full text-[28px] font-medium"
      style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
    >
      {children}
    </button>
  )
}
