import { useState } from 'react'
import { IconLock } from '@tabler/icons-react'
import { lockNow, setLockDelay, useLockState } from '../../lib/appLock'
import { LOCK_DELAYS_MIN } from '../../lib/pinLock'
import { useTranslation } from '../../i18n'
import { radioGroupProps, radioProps } from '../../lib/a11y'
import { SettingToggle } from './SettingToggle'
import { LockSheet, type LockSheetMode } from './LockSheet'

/**
 * The code lock, in the same form as the other settings: a sentence and a
 * switch. Turning it on opens the sheet that sets the code; once on, the delay
 * (chips), "Verrouiller maintenant" and "Changer le code" appear. Turning it off
 * asks for the code. It says what it does: it hides the journal, it does not
 * encrypt it.
 */
export function LockCard({ lastBackupAt, onBackupFirst }: { lastBackupAt?: number; onBackupFirst: () => void }) {
  const t = useTranslation().lockSettings
  const { enabled, delayMinutes } = useLockState()
  const [sheet, setSheet] = useState<LockSheetMode | null>(null)
  const soft = { background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }

  return (
    <SettingToggle icon={IconLock} title={t.title} helper={t.helper} checked={enabled} onChange={(on) => setSheet(on ? 'activate' : 'remove')}>
      <p className="text-caption mt-3" style={{ color: 'var(--color-ink-muted)' }}>
        {t.previewNote}
      </p>

      {enabled && (
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <p className="text-control font-medium mb-2">{t.delayTitle}</p>
            <div className="flex gap-2" {...radioGroupProps(t.delayTitle)}>
              {LOCK_DELAYS_MIN.map((minutes, i) => (
                <button
                  key={minutes}
                  {...radioProps(delayMinutes === minutes)}
                  onClick={() => setLockDelay(minutes)}
                  className="flex-1 min-h-11 rounded-[var(--radius-control)] px-1 text-control font-semibold"
                  style={
                    delayMinutes === minutes
                      ? { background: 'var(--color-brand)', color: 'var(--color-on-brand)' }
                      : soft
                  }
                >
                  {t.delays[i]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={lockNow}
              className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] px-3 text-control font-semibold"
              style={soft}
            >
              <IconLock size={18} aria-hidden />
              {t.lockNow}
            </button>
            <button
              type="button"
              onClick={() => setSheet('change')}
              className="flex-1 min-h-11 rounded-[var(--radius-control)] px-3 text-control font-semibold"
              style={soft}
            >
              {t.change}
            </button>
          </div>
        </div>
      )}

      {sheet && <LockSheet mode={sheet} lastBackupAt={lastBackupAt} onBackupFirst={onBackupFirst} onClose={() => setSheet(null)} />}
    </SettingToggle>
  )
}
