import { useRef, useState } from 'react'
import { IconCircleCheck } from '@tabler/icons-react'
import { changeLockPin, checkLockPin, disableLock, enableLock } from '../../lib/appLock'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { PinPad } from '../lock/PinPad'
import { usePause, useWaitText } from '../lock/lockHooks'
import { ModalSheet } from '../ui/ModalSheet'

export type LockSheetMode = 'activate' | 'change' | 'remove'
type Step = 'backup' | 'current' | 'choose' | 'confirm' | 'done'

/**
 * Setting, changing or removing the code, in a sheet. Turning it on starts with
 * the backup (if the code is forgotten, a backup is the way back); the code is
 * typed twice; changing or removing it asks for the current one first. The code
 * is held in memory only while the sheet is open.
 */
export function LockSheet({
  mode,
  lastBackupAt,
  onBackupFirst,
  onClose,
}: {
  mode: LockSheetMode
  lastBackupAt?: number
  onBackupFirst: () => void
  onClose: () => void
}) {
  const t = useTranslation()
  const s = t.lockSettings
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const waitText = useWaitText()
  const { waitMs, set: setWaitMs } = usePause()
  const [step, setStep] = useState<Step>(mode === 'activate' ? 'backup' : 'current')
  const [message, setMessage] = useState<string | null>(null)
  const current = useRef('')
  const first = useRef('')

  const titles: Record<Step, string> = {
    backup: s.activateTitle,
    current: mode === 'remove' ? s.removeTitle : mode === 'change' ? s.changeTitle : s.currentTitle,
    choose: mode === 'change' ? s.changeTitle : s.chooseTitle,
    confirm: s.confirmTitle,
    done: mode === 'activate' ? s.doneTitle : s.doneOtherTitle,
  }

  async function onCurrent(code: string) {
    const out = await checkLockPin(code)
    if (!out.ok) {
      setWaitMs(out.waitMs)
      setMessage(out.waitMs > 0 ? null : t.lock.wrong)
      return
    }
    setMessage(null)
    if (mode === 'remove') {
      disableLock()
      setStep('done')
    } else {
      current.current = code
      setStep('choose')
    }
  }

  function onChoose(code: string) {
    first.current = code
    setMessage(null)
    setStep('confirm')
  }

  async function onConfirm(code: string) {
    if (code !== first.current) {
      setMessage(s.different)
      setStep('choose')
      return
    }
    const saved = mode === 'change' ? await changeLockPin(current.current, code) : await enableLock(code)
    if (!saved) {
      setMessage(s.saveFailed)
      setStep('choose')
      return
    }
    current.current = ''
    first.current = ''
    setMessage(null)
    setStep('done')
  }

  const date = lastBackupAt === undefined ? null : new Date(lastBackupAt).toLocaleDateString(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' })
  const primary = { background: 'var(--color-brand)', color: 'var(--color-on-brand)' }
  const soft = { background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }
  const shown = waitMs > 0 ? waitText(waitMs) : message

  return (
    <ModalSheet title={titles[step]} closeLabel={s.close} onClose={onClose}>
      {step === 'backup' && (
        <>
          <p className="text-body">{s.backupText}</p>
          <p className="text-control font-medium">{date ? format(s.lastBackup, { date }, language) : s.noBackup}</p>
          {!date && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onBackupFirst()
              }}
              className="min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
              style={soft}
            >
              {s.backupFirst}
            </button>
          )}
          <button
            type="button"
            onClick={() => setStep('choose')}
            className="min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
            style={primary}
          >
            {date ? s.continue : s.continueWithout}
          </button>
        </>
      )}

      {step === 'current' && (
        <>
          {mode === 'remove' && <p className="text-body">{s.removeText}</p>}
          <PinPad key="current" onComplete={onCurrent} onType={() => setMessage(null)} disabled={waitMs > 0} />
        </>
      )}

      {(step === 'choose' || step === 'confirm') && (
        <>
          <p className="text-body">{step === 'choose' ? s.chooseText : s.confirmText}</p>
          <PinPad key={step} onComplete={step === 'choose' ? onChoose : onConfirm} onType={() => setMessage(null)} />
        </>
      )}

      {step === 'done' && (
        <>
          <p className="text-body inline-flex items-center gap-2">
            <IconCircleCheck size={20} aria-hidden style={{ color: 'var(--color-brand)' }} />
            {mode === 'remove' ? s.removed : mode === 'change' ? s.changed : s.doneText}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
            style={primary}
          >
            {s.finish}
          </button>
        </>
      )}

      {shown && step !== 'done' && step !== 'backup' && (
        <p role="alert" className="text-caption font-medium text-center" style={{ color: 'var(--color-ink)' }}>
          {shown}
        </p>
      )}
    </ModalSheet>
  )
}
