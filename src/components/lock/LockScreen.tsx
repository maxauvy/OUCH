import { useEffect, useRef, useState } from 'react'
import { unlock } from '../../lib/appLock'
import { useTranslation } from '../../i18n'
import { AppLogo } from '../ui/AppLogo'
import { PinPad } from './PinPad'
import { usePause, useWaitText } from './lockHooks'

/**
 * The code lock: the app's logo, a soft sentence, and the pad. After too many
 * wrong codes it asks for a pause, said gently, with the time left; it never
 * says "locked out" and never erases anything.
 */
export function LockScreen() {
  const t = useTranslation().lock
  const waitText = useWaitText()
  const [wrong, setWrong] = useState(false)
  const { waitMs, set: setWaitMs } = usePause()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus goes to the dialog itself, not to a key: nothing is one keystroke from a code.
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const pausing = waitMs > 0

  async function submit(code: string) {
    const out = await unlock(code)
    if (!out.ok) {
      setWrong(out.waitMs === 0)
      setWaitMs(out.waitMs)
    }
  }

  const message = pausing ? waitText(waitMs) : wrong ? t.wrong : t.hint

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
      <PinPad onComplete={submit} onType={() => setWrong(false)} disabled={pausing} />
    </div>
  )
}
