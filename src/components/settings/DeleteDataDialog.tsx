import { useId, useState } from 'react'
import { IconTrash } from '@tabler/icons-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { confirmationMatches } from '../../lib/wipeConfirm'
import { wipeLocalData } from '../../lib/wipe'
import { format, useLanguage, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

/** Erase everything this app keeps on the device. It is irreversible and
 * there is no server copy, so the sheet says what will be lost and asks for a
 * typed word: a stray tap cannot delete a journal. */
export function DeleteDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslation().deleteData
  const language = useLanguage()
  const inputId = useId()
  const noteId = useId()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  // Undefined until read: a 0 shown meanwhile would say "nothing to lose".
  const days = useLiveQuery(() => db.entries.count(), [])
  const meds = useLiveQuery(() => db.medications.count(), [])
  const matches = confirmationMatches(typed, t.word)

  function close() {
    if (!busy) onClose()
  }

  function backupFirst() {
    onClose()
    requestAnimationFrame(() => document.getElementById('backup')?.scrollIntoView({ block: 'start' }))
  }

  async function wipe() {
    if (!matches || busy) return
    setBusy(true)
    setFailed(false)
    try {
      await wipeLocalData()
      // A fresh start: nothing in memory should outlive the data.
      location.reload()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <ModalSheet title={t.dialogTitle} closeLabel={t.close} busy={busy} onClose={onClose}>
      <div className="flex flex-col gap-2 text-body">
        <p>{days === undefined || meds === undefined ? t.helper : format(t.willLose, { days, meds }, language)}</p>
        <p>{t.irreversible}</p>
      </div>

      <p
        id={noteId}
        className="text-caption rounded-[var(--radius-control)] px-3.5 py-3"
        style={{ background: 'var(--color-brand-soft)' }}
      >
        {t.backupsKept}
      </p>

      <button
        type="button"
        onClick={backupFirst}
        disabled={busy}
        className="min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
        style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
      >
        {t.backupFirst}
      </button>

      <div>
        <label htmlFor={inputId} className="text-caption font-medium block mb-1.5">
          {format(t.typeLabel, { word: t.word }, language)}
        </label>
        <input
          id={inputId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={busy}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
          style={{
            background: 'var(--color-input)',
            color: 'var(--color-ink)',
            boxShadow: 'inset 0 0 0 1px var(--color-input-ring)',
          }}
        />
      </div>

      {failed && (
        <p role="alert" className="text-caption font-medium" style={{ color: 'var(--color-danger)' }}>
          {t.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={close}
          disabled={busy}
          className="flex-1 min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
          style={{ color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        >
          {t.cancel}
        </button>
        <button
          type="button"
          onClick={wipe}
          disabled={!matches || busy}
          className="flex flex-1 min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-control font-semibold disabled:opacity-40"
          style={{ background: 'var(--color-danger)', color: 'var(--color-on-danger)' }}
        >
          <IconTrash size={18} aria-hidden />
          {busy ? t.deleting : t.confirm}
        </button>
      </div>
    </ModalSheet>
  )
}
