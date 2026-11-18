import { useEffect, useRef, useState } from 'react'
import { unlock } from '../../lib/appLock'
import { useTranslation } from '../../i18n'
import { useRichLook } from '../../lib/look'
import { AppLogo } from '../ui/AppLogo'
import { useSkyTop } from '../entry/skyTop'
import { ForgotSheet } from './ForgotSheet'
import { PinPad } from './PinPad'
import { usePause, useWaitText } from './lockHooks'

/**
 * The code lock: the app's logo, a soft sentence, and the pad. After too many
 * wrong codes it asks for a pause, said gently, with the time left; it never
 * says "locked out" and never erases anything.
 */
export function LockScreen() {
  const t = useTranslation().lock
  const look = useRichLook()
  // The weather look: the neutral sky of the pages behind the lock, up to the status bar.
  useSkyTop(look ? 0 : null)
  const waitText = useWaitText()
  const [wrong, setWrong] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
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
        background: look ? 'var(--sky-0) top / 100% 420px no-repeat, var(--color-paper)' : 'var(--color-paper)',
        color: 'var(--color-ink)',
        paddingTop: 'calc(env(safe-area-inset-top) + 40px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
      }}
    >
      {look ? (
        // The weather look: the logo and the title on the sky, the keys straight on the page, like the other screens.
        <>
          <span className="inline-flex" style={{ borderRadius: '22%', boxShadow: '0 6px 18px -8px rgba(30, 45, 70, 0.45)' }}>
            <AppLogo size={64} />
          </span>
          <h1 className="page-title text-title font-semibold text-center mt-5">{t.title}</h1>
          <p role="status" className="text-control text-center mt-1.5 min-h-[2.75rem]" style={{ color: 'var(--color-ink-muted)' }}>
            {message}
          </p>
          <PinPad onComplete={submit} onType={() => setWrong(false)} disabled={pausing || forgotOpen} />
        </>
      ) : (
        <>
          <AppLogo size={64} />
          <h1 className="text-title font-semibold text-center mt-5">{t.title}</h1>
          <p role="status" className="text-control text-center mt-1.5 min-h-[2.75rem]" style={{ color: 'var(--color-ink-muted)' }}>
            {message}
          </p>
          <PinPad onComplete={submit} onType={() => setWrong(false)} disabled={pausing || forgotOpen} />
        </>
      )}
      <button
        type="button"
        onClick={() => setForgotOpen(true)}
        className={`min-h-11 px-3 mt-3 text-control ${look ? 'font-semibold' : 'underline'}`}
        style={{ color: look ? 'var(--color-brand)' : 'var(--color-ink-muted)' }}
      >
        {t.forgot}
      </button>
      {forgotOpen && <ForgotSheet onClose={() => setForgotOpen(false)} />}
    </div>
  )
}
