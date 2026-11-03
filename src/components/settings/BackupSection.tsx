import { useRef, useState } from 'react'
import { IconFileCheck, IconFileImport, IconX } from '@tabler/icons-react'
import { exportEncryptedBackup, downloadBlob, importEncryptedBackup } from '../../lib/backup'
import { canShareFiles, shareOrDownload, type ShareEnv } from '../../lib/shareFile'
import { useEarlyAccess } from '../../lib/earlyAccess'
import { format, useLocale, useTranslation } from '../../i18n'
import { useSettings } from '../../hooks/useSettings'
import { updateSettings } from '../../db'
import { StorageProtection } from './StorageProtection'

const MIN_EXPORT_PASSWORD_LENGTH = 10

/** The browser's own share sheet and download, handed to `lib/shareFile`. */
const shareEnv: ShareEnv = {
  phone: typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  canShare: (data) => !!navigator.canShare?.(data),
  share: (data) => navigator.share(data),
  download: downloadBlob,
}
const fileName = () => `ouch-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
const canShareBackup = canShareFiles(shareEnv, new File(['{}'], fileName(), { type: 'application/json' }))

export function BackupSection() {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const { lastBackupAt } = useSettings()
  const earlyAccess = useEarlyAccess()
  const [exportPassword, setExportPassword] = useState('')
  const [exportBusy, setExportBusy] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  const [importPassword, setImportPassword] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importMsg, setImportMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function clearFile() {
    setImportFile(null)
    setImportMsg(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleExport() {
    if (exportPassword.length < MIN_EXPORT_PASSWORD_LENGTH) {
      setExportMsg(t.backup.exportPasswordTooShort)
      return
    }
    setExportBusy(true)
    setExportMsg(null)
    try {
      const blob = await exportEncryptedBackup(exportPassword)
      // On a phone the share sheet is how the file reaches Files or iCloud Drive; a person who closes it kept nothing.
      const result = await shareOrDownload(blob, fileName(), t.backup.exportTitle, shareEnv)
      if (result === 'cancelled') return
      await updateSettings({ lastBackupAt: Date.now(), backupReminderSnoozedUntil: undefined })
      setExportMsg(result === 'shared' ? t.backup.shareSuccess : t.backup.exportSuccess)
    } catch {
      setExportMsg(t.backup.exportError)
    } finally {
      setExportBusy(false)
    }
  }

  async function handleImport() {
    if (!importFile || !importPassword) return
    setImportBusy(true)
    setImportMsg(null)
    try {
      const result = await importEncryptedBackup(importFile, importPassword, 'merge', {
        invalidFile: t.backup.invalidFile,
        invalidBackup: t.backup.invalidBackup,
        fileTooLarge: t.backup.fileTooLarge,
      })
      setImportMsg({
        text: format(result.imported === 1 ? t.backup.importSuccessOne : t.backup.importSuccessOther, {
          n: result.imported,
        }),
      })
      setImportFile(null)
      setImportPassword('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setImportMsg({ text: e instanceof Error ? e.message : t.backup.importGenericError, error: true })
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <StorageProtection />

      <div style={{ borderTop: '1px solid var(--color-hairline)' }} className="pt-5">
        <p className="font-medium text-body mb-1">{t.backup.whereTitle}</p>
        <ul className="text-caption flex flex-col gap-1.5 list-disc pl-5" style={{ color: 'var(--color-ink-muted)' }}>
          {canShareBackup && <li>{t.backup.whereFiles}</li>}
          <li>{t.backup.whereFolder}</li>
          {earlyAccess && <li>{t.backup.whereDropbox}</li>}
        </ul>
        <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
          {t.backup.whereAlways}
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--color-hairline)' }} className="pt-5">
        <p className="font-medium text-body mb-1">{t.backup.exportTitle}</p>
        <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.backup.exportHelper}
        </p>
        <p className="text-caption mb-3 font-medium" style={{ color: 'var(--color-ink)' }}>
          {lastBackupAt === undefined
            ? t.backup.neverBackedUp
            : format(t.backup.lastBackup, {
                date: new Date(lastBackupAt).toLocaleDateString(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' }),
              })}
        </p>
        <input
          type="password"
          value={exportPassword}
          onChange={(e) => setExportPassword(e.target.value)}
          placeholder={t.backup.passwordPlaceholder}
          className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none mb-2"
          style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        />
        <button
          onClick={handleExport}
          disabled={exportBusy}
          className="w-full rounded-[var(--radius-control)] py-3 text-body font-semibold text-[var(--color-on-brand)]"
          style={{ background: 'var(--color-brand)' }}
        >
          {exportBusy ? t.backup.exporting : canShareBackup ? t.backup.shareButton : t.backup.exportButton}
        </button>
        {canShareBackup && (
          <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {t.backup.shareHelper}
          </p>
        )}
        {exportMsg && (
          <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {exportMsg}
          </p>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-hairline)' }} className="pt-5">
        <p className="font-medium text-body mb-1">{t.backup.importTitle}</p>
        <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.backup.importHelper}
        </p>
        {/* The native input is hidden: browsers draw it as a faint "no file chosen" line. */}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            setImportFile(e.target.files?.[0] ?? null)
            setImportMsg(null)
          }}
          disabled={importBusy}
          className="hidden"
        />
        {importFile ? (
          <div
            className="flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2.5 mb-2"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          >
            <IconFileCheck size={20} aria-hidden className="shrink-0" />
            <span className="flex-1 min-w-0 truncate text-control font-medium">{importFile.name}</span>
            <button
              type="button"
              onClick={clearFile}
              disabled={importBusy}
              aria-label={t.backup.removeFile}
              className="shrink-0 rounded-full p-1"
            >
              <IconX size={18} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importBusy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] py-3 text-body font-semibold mb-2"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          >
            <IconFileImport size={20} aria-hidden />
            {t.backup.chooseFile}
          </button>
        )}
        <input
          type="password"
          value={importPassword}
          onChange={(e) => setImportPassword(e.target.value)}
          placeholder={t.backup.passwordPlaceholder}
          className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none mb-2"
          style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        />
        <button
          onClick={handleImport}
          disabled={importBusy || !importFile || !importPassword}
          className="w-full rounded-[var(--radius-control)] py-3 text-body font-semibold text-[var(--color-on-brand)] disabled:opacity-40"
          style={{ background: 'var(--color-brand)' }}
        >
          {importBusy ? t.backup.importing : t.backup.importButton}
        </button>
        {importMsg && (
          <p className="text-caption mt-2" style={{ color: importMsg.error ? 'var(--color-weather-5-text)' : 'var(--color-ink-muted)' }}>
            {importMsg.text}
          </p>
        )}
      </div>
    </div>
  )
}
