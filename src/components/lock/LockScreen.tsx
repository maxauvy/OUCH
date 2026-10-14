import { useEffect, useRef, useState } from 'react'
import { IconBackspace, IconEye, IconEyeOff } from '@tabler/icons-react'
import { lockWaitMs, unlock } from '../../lib/appLock'
import { PIN_LENGTH } from '../../lib/pinLock'
import { format, useLanguage, useTranslation } from '../../i18n'
import { AppLogo } from '../ui/AppLogo'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * The code lock: the app's logo, a soft sentence, four dots, a round keypad.
 * The digits are dots by default (so that a glance over the shoulder reads
 * nothing); "Voir" shows what was typed, and goes back to dots at each lock.
 * After too many wrong codes it asks for a pause, said gently, with the time
 * left; it never says "locked out" and never erases anything.
 */
export function LockScreen() {
  const t = useTranslation().lock
  const language = useLanguage()
  const [digits, setDigits] = useState('')
  const [reveal, setReveal] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [waitMs, setWaitMs] = useState(() => lockWaitMs())
  const busy = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus goes to the dialog itself, not to a key: nothing is one keystroke from a code.
  useEffect(() => dialogRef.current?.focus(), [])

  // While a pause runs, the time left is shown and counts down.
  useEffect(() => {
    if (waitMs <= 0) return
    const timer = setInterval(() => setWaitMs(lockWaitMs()), 500)
    return () => clearInterval(timer)
  }, [waitMs > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const waiting = waitMs > 0

  async function submit(code: string) {
    busy.current = true
    try {
      const out = await unlock(code)
      if (!out.ok) {
        setWrong(out.waitMs === 0)
        setWaitMs(out.waitMs)
        setDigits('')
      }
    } finally {
      busy.current = false
    }
  }

  function press(d: string) {
    if (waiting || busy.current || digits.length >= PIN_LENGTH) return
    setWrong(false)
    const next = digits + d
    setDigits(next)
    if (next.length === PIN_LENGTH) void submit(next)
  }

  function erase() {
    if (busy.current) return
    setWrong(false)
    setDigits((d) => d.slice(0, -1))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') erase()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const message = waiting
    ? waitMs >= 60_000
      ? format(t.waitMinutes, { n: Math.ceil(waitMs / 60_000) }, language)
      : format(t.waitSeconds, { n: Math.max(1, Math.ceil(waitMs / 1000)) }, language)
    : wrong
      ? t.wrong
      : t.hint

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.dialogLabel}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto px-6 outline-none"
      style={{
        background: 'var(--color-paper)',
        color: 'var(--color-ink)',
        paddingTop: 'calc(env(safe-area-inset-top) + 40px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
      }}
    >
      <AppLogo size={64} />
      <h1 className="text-title font-semibold text-center mt-5">{t.title}</h1>
      <p role="status" className="text-control text-center mt-1.5 min-h-[2.75rem]" style={{ color: 'var(--color-ink-muted)' }}>
        {message}
      </p>

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

      <div
        className="grid grid-cols-3 gap-x-5 gap-y-4 mt-4 w-full max-w-[300px]"
        style={{ opacity: waiting ? 0.5 : 1 }}
      >
        {KEYS.map((d) => (
          <Key key={d} onPress={() => press(d)}>
            {d}
          </Key>
        ))}
        <span aria-hidden />
        <Key onPress={() => press('0')}>0</Key>
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
