import { useState } from 'react'
import { IconChevronRight, IconCircleCheck, IconCloud, IconFolder, IconServer } from '@tabler/icons-react'
import { AVAILABLE_PROVIDERS, beginRedirectLink, REDIRECT_PROVIDERS, setUpAutoBackup, type ReturnNotice } from '../../lib/autoBackupRuntime'
import type { AutoBackupState } from '../../db/types'
import { format, useLanguage, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'
import { TrustLines } from './TrustLines'

type ProviderId = AutoBackupState['provider']

const MIN_PASSWORD_LENGTH = 10

// Neutral pictograms, on purpose: the providers' own logos may only be the ones
// they approve (Dropbox's branding guide says so), and the name in words is enough.
const ROWS: { id: ProviderId; Icon: typeof IconFolder }[] = [
  { id: 'dropbox', Icon: IconCloud },
  { id: 'drive', Icon: IconCloud },
  { id: 'webdav', Icon: IconServer },
  { id: 'memory', Icon: IconFolder },
]

const FIELD = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }

/**
 * Three steps, once: where the copy goes, the password that opens it, and a
 * first copy sent on the spot, so that "set up" means "it works". The step
 * with the password is where it is said that without it the copy stays closed.
 */
export function AutoBackupWizard({ onClose, returned }: { onClose: () => void; returned?: ReturnNotice | null }) {
  const t = useTranslation().autoBackup
  const w = t.wizard
  const language = useLanguage()
  // Back from the provider's page: the wizard picks up at its last step with how it went.
  const [step, setStep] = useState<1 | 2 | 3>(returned ? 3 : 1)
  const [provider, setProvider] = useState<ProviderId | null>(returned ? 'dropbox' : null)
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<boolean | null>(returned ? returned === 'sent' : null)
  const redirects = provider !== null && REDIRECT_PROVIDERS.includes(provider)

  // The trial provider only shows in development, the three real ones always (not yet usable).
  const rows = ROWS.filter((r) => r.id !== 'memory' || AVAILABLE_PROVIDERS.includes('memory'))

  async function start() {
    if (password.length < MIN_PASSWORD_LENGTH) return setError(w.tooShort)
    if (password !== again) return setError(w.different)
    if (!provider) return
    setError(null)
    setBusy(true)
    if (redirects) {
      try {
        await beginRedirectLink(provider, password)
      } catch {
        setError(format(w.linkFailed, { provider: t.providers[provider] }, language))
        setBusy(false)
      }
      return
    }
    setStep(3)
    try {
      const outcome = await setUpAutoBackup(provider, password)
      setSent(!!outcome?.ok)
    } catch {
      setSent(false)
    } finally {
      setBusy(false)
      setPassword('')
      setAgain('')
    }
  }

  return (
    <ModalSheet title={t.title} closeLabel={w.cancel} busy={busy} onClose={onClose}>
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {format(w.step, { n: step, total: 3 }, language)}
      </p>

      {step === 1 && (
        <>
          <div>
            <h3 className="text-body font-semibold">{w.whereTitle}</h3>
            <p className="text-caption mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
              {w.whereText}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {rows.map(({ id, Icon }) => {
              const available = AVAILABLE_PROVIDERS.includes(id)
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      setProvider(id)
                      setStep(2)
                    }}
                    className="w-full min-h-11 flex items-center gap-3 rounded-[var(--radius-control)] px-3.5 text-left text-body disabled:opacity-60"
                    style={FIELD}
                  >
                    <Icon size={20} aria-hidden style={{ color: 'var(--color-brand)' }} />
                    <span className="flex-1">{t.providers[id]}</span>
                    {available ? (
                      <IconChevronRight size={18} aria-hidden style={{ color: 'var(--color-ink-muted)' }} />
                    ) : (
                      <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                        {w.soon}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <TrustLines provider={w.anyProvider} />
        </>
      )}

      {step === 2 && provider && (
        <>
          <div>
            <h3 className="text-body font-semibold">{w.passwordTitle}</h3>
            <p className="text-caption mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
              {w.passwordText}
            </p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label={w.passwordLabel}
            placeholder={w.passwordLabel}
            autoComplete="new-password"
            className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
            style={FIELD}
          />
          <input
            type="password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            aria-label={w.confirmLabel}
            placeholder={w.confirmLabel}
            autoComplete="new-password"
            className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
            style={FIELD}
          />
          {redirects && (
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {format(w.redirectNote, { provider: t.providers[provider] }, language)}
            </p>
          )}
          {error && (
            <p role="alert" className="text-caption font-medium" style={{ color: 'var(--color-ink)' }}>
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setError(null)
              }}
              className="flex-1 min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
              style={{ color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
            >
              {w.back}
            </button>
            <button
              type="button"
              onClick={() => void start()}
              className="flex-1 min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
              style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
            >
              {redirects ? format(w.toProvider, { provider: t.providers[provider] }, language) : w.next}
            </button>
          </div>
        </>
      )}

      {step === 3 && provider && (
        <>
          <h3 className="text-body font-semibold inline-flex items-center gap-2">
            {sent && <IconCircleCheck size={20} aria-hidden style={{ color: 'var(--color-brand)' }} />}
            {w.doneTitle}
          </h3>
          <p role="status" className="text-body">
            {sent === null
              ? w.sending
              : sent
                ? format(w.done, { provider: t.providers[provider] }, language)
                : returned === 'denied'
                  ? format(w.denied, { provider: t.providers[provider] }, language)
                  : returned === 'failed'
                    ? format(w.linkFailed, { provider: t.providers[provider] }, language)
                    : w.sendFailed}
          </p>
          {sent && <TrustLines provider={t.providers[provider]} />}
          {!busy && (
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
              style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
            >
              {w.finish}
            </button>
          )}
        </>
      )}
    </ModalSheet>
  )
}
