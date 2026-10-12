import { useState } from 'react'
import { IconAlertTriangle, IconDownload } from '@tabler/icons-react'
import { db, todayISO } from '../../db'
import { downloadBlob } from '../../lib/backup'
import { intakesCsv, journalCsv } from '../../lib/csvExport'
import { format, useLanguage, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'
import { Toggle } from '../ui/Toggle'

/**
 * The journal as two CSV files, for a spreadsheet or an analysis tool. They
 * are plain text, so the sheet says so before the button, and the notes can be
 * left out. It is not a backup: it cannot restore OUCH, so it never counts as
 * one (the "last backup" date and the reminder are left alone).
 */
export function CsvExportDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslation()
  const s = t.settings
  const language = useLanguage()
  const [includeNotes, setIncludeNotes] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [done, setDone] = useState(false)

  async function exportCsv() {
    setBusy(true)
    setMessage(null)
    try {
      const [entries, medications] = await Promise.all([db.entries.toArray(), db.medications.toArray()])
      const day = todayISO()
      const type = 'text/csv;charset=utf-8'
      const files = [
        new File([journalCsv(entries, { includeNotes })], `ouch-journal-${day}.csv`, { type }),
        new File([intakesCsv(entries, medications)], `ouch-prises-${day}.csv`, { type }),
      ]
      // On a phone the share sheet is the way to keep files (Files, mail…);
      // a computer downloads them.
      const phone = window.matchMedia('(pointer: coarse)').matches
      let shared = false
      if (phone && navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files })
          shared = true
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          // The tap no longer counts as the reason for sharing: download instead.
        }
      }
      if (!shared) for (const file of files) downloadBlob(file, file.name)
      setMessage({ text: format(s.csvDone, { files: files.map((f) => f.name).join(', ') }, language) })
      setDone(true)
    } catch (e) {
      console.error(e)
      setMessage({ text: s.csvError, error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalSheet title={s.csvDialogTitle} closeLabel={t.deleteData.close} busy={busy} onClose={onClose}>
      <div
        className="flex gap-2.5 rounded-[var(--radius-control)] px-3.5 py-3 text-caption"
        style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-surface))' }}
      >
        <IconAlertTriangle size={18} className="shrink-0 mt-px" style={{ color: 'var(--color-danger)' }} aria-hidden />
        <p>{s.csvWarning}</p>
      </div>
      <p className="text-body">{s.csvHelper}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-control font-medium">{s.csvNotes}</p>
        <Toggle checked={includeNotes} onChange={setIncludeNotes} label={s.csvNotes} />
      </div>

      {message && (
        <p
          role={message.error ? 'alert' : 'status'}
          className="text-caption font-medium"
          style={{ color: message.error ? 'var(--color-danger)' : 'var(--color-ink)' }}
        >
          {message.text}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="flex-1 min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
          style={{ color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        >
          {done ? t.deleteData.close : t.deleteData.cancel}
        </button>
        {!done && (
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={busy}
            className="flex flex-1 min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-control font-semibold disabled:opacity-60"
            style={{ background: 'var(--color-surface)', color: 'var(--color-danger)', boxShadow: 'inset 0 0 0 1.5px var(--color-danger)' }}
          >
            <IconDownload size={18} aria-hidden />
            {s.csvExport}
          </button>
        )}
      </div>
    </ModalSheet>
  )
}
