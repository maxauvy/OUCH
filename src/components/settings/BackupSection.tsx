import { useRef, useState } from 'react'
import { exportEncryptedBackup, downloadBlob, importEncryptedBackup } from '../../lib/backup'
import { format, useTranslation } from '../../i18n'

export function BackupSection() {
  const t = useTranslation()
  const [exportPassword, setExportPassword] = useState('')
  const [exportBusy, setExportBusy] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  const [importPassword, setImportPassword] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importMsg, setImportMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    if (exportPassword.length < 6) {
      setExportMsg(t.backup.exportPasswordTooShort)
      return
    }
    setExportBusy(true)
    setExportMsg(null)
    try {
      const blob = await exportEncryptedBackup(exportPassword)
      downloadBlob(blob, `ouch-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`)
      setExportMsg(t.backup.exportSuccess)
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
      <div>
        <p className="font-medium text-[15px] mb-1">{t.backup.exportTitle}</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.backup.exportHelper}
        </p>
        <input
          type="password"
          value={exportPassword}
          onChange={(e) => setExportPassword(e.target.value)}
          placeholder={t.backup.passwordPlaceholder}
          className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none mb-2"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
        />
        <button
          onClick={handleExport}
          disabled={exportBusy}
          className="w-full rounded-full py-3 text-[15px] font-semibold text-white"
          style={{ background: 'var(--color-brand)' }}
        >
          {exportBusy ? t.backup.exporting : t.backup.exportButton}
        </button>
        {exportMsg && (
          <p className="text-[13px] mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {exportMsg}
          </p>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-hairline)' }} className="pt-5">
        <p className="font-medium text-[15px] mb-1">{t.backup.importTitle}</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.backup.importHelper}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={(e) => {
            setImportFile(e.target.files?.[0] ?? null)
            setImportMsg(null)
          }}
          disabled={importBusy}
          className="w-full text-[14px] mb-2"
        />
        <input
          type="password"
          value={importPassword}
          onChange={(e) => setImportPassword(e.target.value)}
          placeholder={t.backup.passwordPlaceholder}
          className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none mb-2"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
        />
        <button
          onClick={handleImport}
          disabled={importBusy || !importFile || !importPassword}
          className="w-full rounded-full py-3 text-[15px] font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--color-brand)' }}
        >
          {importBusy ? t.backup.importing : t.backup.importButton}
        </button>
        {importMsg && (
          <p className="text-[13px] mt-2" style={{ color: importMsg.error ? 'var(--color-weather-5)' : 'var(--color-ink-muted)' }}>
            {importMsg.text}
          </p>
        )}
      </div>
    </div>
  )
}
