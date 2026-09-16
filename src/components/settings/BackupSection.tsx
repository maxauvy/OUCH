import { useRef, useState } from 'react'
import { exportEncryptedBackup, downloadBlob, importEncryptedBackup } from '../../lib/backup'

export function BackupSection() {
  const [exportPassword, setExportPassword] = useState('')
  const [exportBusy, setExportBusy] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  const [importPassword, setImportPassword] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importMsg, setImportMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    if (exportPassword.length < 6) {
      setExportMsg('Choisis un mot de passe d’au moins 6 caractères.')
      return
    }
    setExportBusy(true)
    setExportMsg(null)
    try {
      const blob = await exportEncryptedBackup(exportPassword)
      downloadBlob(blob, `accalmie-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`)
      setExportMsg('Sauvegarde téléchargée. Garde le mot de passe en lieu sûr : sans lui, ce fichier est illisible.')
    } catch {
      setExportMsg('Une erreur est survenue pendant l’export.')
    } finally {
      setExportBusy(false)
    }
  }

  async function handleImportFile(file: File) {
    if (!importPassword) {
      setImportMsg({ text: 'Indique le mot de passe de la sauvegarde.', error: true })
      return
    }
    setImportBusy(true)
    setImportMsg(null)
    try {
      const result = await importEncryptedBackup(file, importPassword, 'merge')
      setImportMsg({ text: `${result.imported} jour${result.imported > 1 ? 's' : ''} importé${result.imported > 1 ? 's' : ''}.` })
    } catch (e) {
      setImportMsg({ text: e instanceof Error ? e.message : 'Import impossible.', error: true })
    } finally {
      setImportBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-medium text-[15px] mb-1">Exporter une sauvegarde</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          Un fichier chiffré avec un mot de passe que tu choisis. Garde-le où tu veux (cloud perso, e-mail à
          toi-même) pour retrouver tes données sur un autre appareil.
        </p>
        <input
          type="password"
          value={exportPassword}
          onChange={(e) => setExportPassword(e.target.value)}
          placeholder="Mot de passe de la sauvegarde"
          className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none mb-2"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
        />
        <button
          onClick={handleExport}
          disabled={exportBusy}
          className="w-full rounded-full py-3 text-[15px] font-semibold text-white"
          style={{ background: 'var(--color-brand)' }}
        >
          {exportBusy ? 'Export…' : 'Télécharger la sauvegarde'}
        </button>
        {exportMsg && (
          <p className="text-[13px] mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {exportMsg}
          </p>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-hairline)' }} className="pt-5">
        <p className="font-medium text-[15px] mb-1">Importer une sauvegarde</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          Les jours importés s'ajoutent à ceux déjà présents (en cas de doublon, la sauvegarde l'emporte).
        </p>
        <input
          type="password"
          value={importPassword}
          onChange={(e) => setImportPassword(e.target.value)}
          placeholder="Mot de passe de la sauvegarde"
          className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none mb-2"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
          disabled={importBusy}
          className="w-full text-[14px]"
        />
        {importMsg && (
          <p className="text-[13px] mt-2" style={{ color: importMsg.error ? 'var(--color-weather-5)' : 'var(--color-ink-muted)' }}>
            {importMsg.text}
          </p>
        )}
      </div>
    </div>
  )
}
