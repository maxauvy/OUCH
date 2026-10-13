import { useState } from 'react'
import { IconCloudCheck, IconCloudOff, IconCloudUpload, IconHistory, IconRefresh } from '@tabler/icons-react'
import type { AutoBackupState } from '../../db/types'
import { useSettings } from '../../hooks/useSettings'
import { backupNow, stopAutoBackup } from '../../lib/autoBackupRuntime'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Card } from '../ui/Card'
import { AutoBackupRestore } from './AutoBackupRestore'
import { AutoBackupWizard } from './AutoBackupWizard'
import { TrustLines } from './TrustLines'

const SOFT_BUTTON = { background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }

/**
 * Where a copy of the journal goes by itself. Three states, none of them loud:
 * not set up (one sentence and a button), on (when the last copy went, how big,
 * that it was checked), and a copy that could not go out (said plainly, with
 * what to do, nothing red). The wizard lives beside the card, not inside it:
 * setting up changes the card, and the wizard has one more thing to say after that.
 */
export function AutoBackupCard() {
  const { autoBackup } = useSettings()
  const [wizardOpen, setWizardOpen] = useState(false)
  return (
    <>
      {autoBackup ? <CardOn state={autoBackup} /> : <CardOff onChoose={() => setWizardOpen(true)} />}
      {wizardOpen && <AutoBackupWizard onClose={() => setWizardOpen(false)} />}
    </>
  )
}

function CardOff({ onChoose }: { onChoose: () => void }) {
  const t = useTranslation().autoBackup
  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <IconCloudUpload size={20} aria-hidden style={{ color: 'var(--color-brand)' }} />
        <h3 className="text-body font-medium">{t.title}</h3>
      </div>
      <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
        {t.intro}
      </p>
      <button
        type="button"
        onClick={onChoose}
        className="w-full min-h-11 rounded-[var(--radius-control)] py-3 text-body font-semibold"
        style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
      >
        {t.choose}
      </button>
    </Card>
  )
}

function CardOn({ state }: { state: AutoBackupState }) {
  const t = useTranslation().autoBackup
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const when = (ms: number) =>
    new Date(ms).toLocaleString(intlLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const provider = t.providers[state.provider]
  const failure = state.lastFailure
  const copy = state.lastCopy
  const Icon = failure ? IconCloudOff : IconCloudCheck

  async function sendNow() {
    setBusy(true)
    try {
      await backupNow()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={20} aria-hidden style={{ color: failure ? 'var(--color-ink-muted)' : 'var(--color-brand)' }} />
        <h3 className="text-body font-medium flex-1">{t.title}</h3>
        {!failure && (
          <span className="text-caption font-medium rounded-full px-2.5 py-0.5" style={SOFT_BUTTON}>
            {t.active}
          </span>
        )}
      </div>

      {failure ? (
        <div role="status" className="mb-3">
          <p className="text-caption" style={{ color: 'var(--color-ink)' }}>
            {format(t.failure[failure], { provider }, language)}
          </p>
          {copy && (
            <p className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {format(t.lastGood, { date: when(copy.at) }, language)}
            </p>
          )}
        </div>
      ) : (
        <p className="text-caption font-medium mb-3" style={{ color: 'var(--color-ink)' }}>
          {copy
            ? format(
                t.lastCopy,
                { date: when(copy.at), size: format(t.kb, { n: Math.max(1, Math.round(copy.bytes / 1024)) }, language) },
                language
              )
            : t.noCopyYet}
        </p>
      )}

      <div className="mb-3">
        <TrustLines provider={provider} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void sendNow()}
          disabled={busy}
          className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] px-3 text-control font-semibold disabled:opacity-60"
          style={SOFT_BUTTON}
        >
          <IconRefresh size={18} aria-hidden />
          {busy ? t.backingUp : t.backupNow}
        </button>
        <button
          type="button"
          onClick={() => setRestoreOpen(true)}
          className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] px-3 text-control font-semibold"
          style={SOFT_BUTTON}
        >
          <IconHistory size={18} aria-hidden />
          {t.restore}
        </button>
      </div>

      <button
        type="button"
        onClick={() => void stopAutoBackup()}
        className="w-full min-h-11 mt-1 text-caption underline"
        style={{ color: 'var(--color-ink-muted)' }}
      >
        {t.stop}
      </button>
      <p className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
        {format(t.stopNote, { provider }, language)}
      </p>

      {restoreOpen && <AutoBackupRestore state={state} onClose={() => setRestoreOpen(false)} />}
    </Card>
  )
}
