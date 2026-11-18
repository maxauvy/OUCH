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
      className={`fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto px-6 outline-none`}
      style={
        look
          ? ({
              background: 'var(--sky-0) top / 100% 420px no-repeat, var(--color-paper)',
              color: 'var(--color-ink)',
              // Centred when there is room; from the top, never cut, when there is not.
              justifyContent: 'safe center',
              paddingTop: 'calc(var(--root-pad-top, 0px) + 12px)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
              // The keys and their gaps follow the screen's height, so the whole lock fits without scrolling on a phone.
              ['--key' as string]: 'clamp(52px, 8.4dvh, 72px)',
              ['--key-gap' as string]: 'clamp(6px, 1.3dvh, 14px)',
            } as React.CSSProperties)
          : {
              background: 'var(--color-paper)',
              color: 'var(--color-ink)',
              paddingTop: 'calc(env(safe-area-inset-top) + 40px)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
            }
      }
    >
      {look ? (
        // The weather look: the logo and the title on the sky, the keys straight on the page, like the other screens.
        <>
          <span className="inline-flex shrink-0" style={{ borderRadius: '22%', boxShadow: '0 6px 18px -8px rgba(30, 45, 70, 0.45)' }}>
            <AppLogo size={52} />
          </span>
          <h1 className="text-title font-bold text-center mt-3 leading-tight max-w-[300px]" style={{ textWrap: 'balance' }}>{t.title}</h1>
          <p role="status" className="text-control text-center mt-1 min-h-[2.5rem]" style={{ color: 'var(--color-ink-muted)' }}>
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
        className={`min-h-11 px-3 ${look ? 'mt-1 shrink-0 font-semibold' : 'mt-3 underline'} text-control`}
        style={{ color: look ? 'var(--color-brand)' : 'var(--color-ink-muted)' }}
      >
        {t.forgot}
      </button>
      {forgotOpen && <ForgotSheet onClose={() => setForgotOpen(false)} />}
    </div>
  )
}
