import { useEffect, useState } from 'react'
import { IconCircleCheck } from '@tabler/icons-react'
import type { AutoBackupState } from '../../db/types'
import { copyAsFile, listCopies, type ListedCopy } from '../../lib/autoBackup'
import { providerFor } from '../../lib/autoBackupRuntime'
import { checkCopyOpens, shortFingerprint } from '../../lib/backupIntegrity'
import { importEncryptedBackup } from '../../lib/backup'
import { loadBackupKey } from '../../lib/backupKeyStore'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

const FIELD = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }

/**
 * The copies at the provider, newest first. For each one: check that it opens
 * (with the key this device keeps, no password) or restore it (with the
 * password, through the same import as a backup file: days are merged in).
 */
export function AutoBackupRestore({ state, onClose }: { state: AutoBackupState; onClose: () => void }) {
  const t = useTranslation()
  const r = t.autoBackup.restorePanel
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const [copies, setCopies] = useState<ListedCopy[] | 'error' | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  const provider = providerFor(state.provider)
  useEffect(() => {
    if (provider) listCopies(provider).then(setCopies, () => setCopies('error'))
  }, [provider])
  // No provider to read from is the same as a failed read.
  const shown = provider ? copies : 'error'

  async function verify(name: string) {
    const key = await loadBackupKey()
    setBusy(true)
    setMessage(null)
    try {
      const text = await provider!.download(name)
      const check = key ? await checkCopyOpens(text, key) : null
      setMessage(
        check?.ok
          ? { text: format(r.verifyOk, { n: check.entries ?? 0 }, language) }
          : { text: r.verifyBad, error: true }
      )
    } catch {
      setMessage({ text: r.loadError, error: true })
    } finally {
      setBusy(false)
    }
  }

  async function restore(name: string) {
    if (!provider || !password) return
    setBusy(true)
    setMessage(null)
    try {
      const file = await copyAsFile(provider, name)
      const result = await importEncryptedBackup(file, password, 'merge', {
        invalidFile: t.backup.invalidFile,
        invalidBackup: t.backup.invalidBackup,
        fileTooLarge: t.backup.fileTooLarge,
      })
      setMessage({ text: format(r.restored, { n: result.imported }, language) })
      setPassword('')
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t.backup.importGenericError, error: true })
    } finally {
      setBusy(false)
    }
  }

  const when = (d: Date) => d.toLocaleString(intlLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const size = (n: number) => format(t.autoBackup.kb, { n: Math.max(1, Math.round(n / 1024)) }, language)

  return (
    <ModalSheet title={r.title} closeLabel={r.close} busy={busy} onClose={onClose}>
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {r.hint}
      </p>
      {shown === null && <p className="text-caption">…</p>}
      {shown === 'error' && <p className="text-caption font-medium">{r.loadError}</p>}
      {Array.isArray(shown) && shown.length === 0 && <p className="text-caption">{r.empty}</p>}
      {Array.isArray(shown) && (
        <ul className="flex flex-col gap-2">
          {shown.map((c) => {
            const open = chosen === c.name
            const latest = state.lastCopy?.name === c.name
            return (
              <li key={c.name} className="rounded-[var(--radius-control)]" style={FIELD}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => {
                    setChosen(open ? null : c.name)
                    setMessage(null)
                  }}
                  className="w-full min-h-11 flex items-center gap-3 px-3.5 text-left text-body"
                >
                  <span className="flex-1">{when(c.at)}</span>
                  <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                    {size(c.size)}
                  </span>
                  {latest && state.lastCopy && (
                    <span className="inline-flex items-center gap-1 text-caption" style={{ color: 'var(--color-brand)' }}>
                      <IconCircleCheck size={16} aria-hidden />
                      <span className="font-mono">{shortFingerprint(state.lastCopy.sha256)}</span>
                    </span>
                  )}
                </button>
                {open && (
                  <div className="flex flex-col gap-2 px-3.5 pb-3.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void verify(c.name)}
                      className="min-h-11 rounded-[var(--radius-control)] px-3 text-control font-semibold disabled:opacity-60"
                      style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
                    >
                      {r.verify}
                    </button>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-label={r.passwordLabel}
                      placeholder={r.passwordLabel}
                      autoComplete="current-password"
                      className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
                      style={FIELD}
                    />
                    <button
                      type="button"
                      disabled={busy || !password}
                      onClick={() => void restore(c.name)}
                      className="min-h-11 rounded-[var(--radius-control)] px-3 text-control font-semibold disabled:opacity-60"
                      style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
                    >
                      {r.restoreThis}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {message && (
        <p role={message.error ? 'alert' : 'status'} className="text-caption font-medium">
          {message.text}
        </p>
      )}
    </ModalSheet>
  )
}
