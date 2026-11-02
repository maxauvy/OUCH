import { useState } from 'react'
import { IconChevronRight, IconCircleCheck, IconCloud, IconFolder, IconServer } from '@tabler/icons-react'
import { AVAILABLE_PROVIDERS, beginRedirectLink, linkWebdav, REDIRECT_PROVIDERS, setUpAutoBackup, type ReturnNotice } from '../../lib/autoBackupRuntime'
import { checkConnection, type ConnectionCheck } from '../../lib/cloud/webdavProvider'
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
  const [server, setServer] = useState({ url: '', user: '', password: '' })
  const [check, setCheck] = useState<ConnectionCheck | null>(null)
  const [testing, setTesting] = useState(false)
  const redirects = provider !== null && REDIRECT_PROVIDERS.includes(provider)

  // The trial provider only shows in development, the three real ones always (not yet usable).
  const rows = ROWS.filter((r) => r.id !== 'memory' || AVAILABLE_PROVIDERS.includes('memory'))

  /** Tries the server's address and credentials; says what it found. */
  async function test(): Promise<boolean> {
    setTesting(true)
    setCheck(null)
    try {
      const result = await checkConnection(server)
      setCheck(result)
      return result.ok
    } finally {
      setTesting(false)
    }
  }

  async function start() {
    if (password.length < MIN_PASSWORD_LENGTH) return setError(w.tooShort)
    if (password !== again) return setError(w.different)
    if (!provider) return
    setError(null)
    setBusy(true)
    if (provider === 'webdav') {
      // The server is tried before anything is kept: a link that cannot work is not made.
      if (!(await test())) return setBusy(false)
      await linkWebdav(server)
    }
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
          {provider === 'webdav' && (
            <ServerForm
              value={server}
              onChange={(v) => {
                setServer(v)
                setCheck(null)
              }}
              check={check}
              testing={testing}
              disabled={busy}
              onTest={() => void test()}
            />
          )}
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

function ServerForm({
  value,
  onChange,
  check,
  testing,
  disabled,
  onTest,
}: {
  value: { url: string; user: string; password: string }
  onChange: (v: { url: string; user: string; password: string }) => void
  check: ConnectionCheck | null
  testing: boolean
  disabled: boolean
  onTest: () => void
}) {
  const w = useTranslation().autoBackup.wizard.server
  const language = useLanguage()
  const field = 'w-full rounded-xl px-3.5 py-2.5 text-body outline-none'
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-body font-semibold">{w.title}</h3>
        <p className="text-caption mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
          {w.text}
        </p>
      </div>
      <input
        type="url"
        inputMode="url"
        value={value.url}
        onChange={(e) => onChange({ ...value, url: e.target.value })}
        aria-label={w.urlLabel}
        placeholder={w.urlPlaceholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={field}
        style={FIELD}
      />
      <input
        type="text"
        value={value.user}
        onChange={(e) => onChange({ ...value, user: e.target.value })}
        aria-label={w.userLabel}
        placeholder={w.userLabel}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={field}
        style={FIELD}
      />
      <input
        type="password"
        value={value.password}
        onChange={(e) => onChange({ ...value, password: e.target.value })}
        aria-label={w.passwordLabel}
        placeholder={w.passwordLabel}
        autoComplete="off"
        className={field}
        style={FIELD}
      />
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {w.passwordNote}
      </p>
      <button
        type="button"
        onClick={onTest}
        disabled={testing || disabled}
        className="w-full min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold disabled:opacity-60"
        style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
      >
        {testing ? w.testing : w.test}
      </button>
      {check && (
        <p role="status" className="text-caption font-medium break-words" style={{ color: 'var(--color-ink)' }}>
          {check.ok ? w.ok : format(w.problems[check.problem], { detail: check.detail ?? '' }, language).trim()}
        </p>
      )}
      <ServerHelp />
    </div>
  )
}

/** The permissions a server has to give, as text to copy. Starting points, not guarantees. */
function ServerHelp() {
  const w = useTranslation().autoBackup.wizard.server
  const language = useLanguage()
  const origin = location.origin
  const methods = 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS'
  const headers = 'Authorization, Content-Type, Depth'
  const apache = [
    `Header always set Access-Control-Allow-Origin "${origin}"`,
    `Header always set Access-Control-Allow-Methods "${methods}"`,
    `Header always set Access-Control-Allow-Headers "${headers}"`,
    'RewriteEngine On',
    'RewriteCond %{REQUEST_METHOD} OPTIONS',
    'RewriteRule ^ - [R=204,L]',
  ].join('\n')
  const nginx = [
    `add_header Access-Control-Allow-Origin "${origin}" always;`,
    `add_header Access-Control-Allow-Methods "${methods}" always;`,
    `add_header Access-Control-Allow-Headers "${headers}" always;`,
    'if ($request_method = OPTIONS) { return 204; }',
  ].join('\n')
  const code = 'rounded-xl p-3 text-caption overflow-x-auto select-text whitespace-pre'
  return (
    <details className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
      <summary className="min-h-11 inline-flex items-center cursor-pointer underline">{w.helpTitle}</summary>
      <div className="flex flex-col gap-2 pb-2">
        <p>{format(w.helpIntro, { origin }, language)}</p>
        <p>{format(w.helpSteps, { origin }, language)}</p>
        <p className="font-medium">{w.helpApache}</p>
        <pre className={code} style={FIELD}>
          {apache}
        </pre>
        <p className="font-medium">{w.helpNginx}</p>
        <pre className={code} style={FIELD}>
          {nginx}
        </pre>
        <p>{w.helpNote}</p>
      </div>
    </details>
  )
}
