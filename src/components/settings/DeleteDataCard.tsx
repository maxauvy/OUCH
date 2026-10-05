import { useEffect, useId, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { IconTrash, IconX } from '@tabler/icons-react'
import { db } from '../../db'
import { confirmationMatches } from '../../lib/wipeConfirm'
import { wipeLocalData } from '../../lib/wipe'
import { format, useLanguage, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/** At the bottom of Settings: erase everything this app keeps on the device.
 * It is irreversible and there is no server copy, so the button opens a
 * dialog that says what will be lost and asks for a typed word: a stray tap
 * cannot delete a journal. */
export function DeleteDataCard() {
  const t = useTranslation().deleteData
  const [open, setOpen] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)

  return (
    <Card className="!border-[color:color-mix(in_srgb,var(--color-danger)_45%,var(--color-hairline))]">
      <SectionTitle>{t.title}</SectionTitle>
      <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
        {t.helper}
      </p>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold flex items-center gap-2"
        style={{ background: 'var(--color-danger)', color: 'var(--color-on-danger)' }}
      >
        <IconTrash size={18} aria-hidden />
        {t.button}
      </button>
      {open && <DeleteDialog onClose={() => setOpen(false)} />}
    </Card>
  )
}

function DeleteDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslation().deleteData
  const language = useLanguage()
  const titleId = useId()
  const inputId = useId()
  const noteId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  // Undefined until read: a 0 shown meanwhile would say "nothing to lose".
  const days = useLiveQuery(() => db.entries.count(), [])
  const meds = useLiveQuery(() => db.medications.count(), [])
  const matches = confirmationMatches(typed, t.word)

  // A modal dialog: the page behind is inert and focus stays inside. Focus
  // goes to the close button, not the field or the red button, so nothing
  // is one keystroke from deleting; it returns to what opened the dialog.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    closeRef.current?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [])

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
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      className="fixed inset-0 m-0 p-0 w-full h-full max-w-none max-h-none bg-transparent backdrop:bg-transparent"
    >
      <div
        className="w-full h-full flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(20, 15, 35, 0.45)' }}
        onClick={close}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
          style={{ background: 'var(--color-paper)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <h2 id={titleId} className="text-heading font-semibold">
              {t.dialogTitle}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              disabled={busy}
              className="w-11 h-11 -my-2 -mr-2 shrink-0 rounded-[var(--radius-control)] flex items-center justify-center"
              style={{ color: 'var(--color-ink-muted)' }}
              aria-label={t.close}
            >
              <IconX size={22} aria-hidden />
            </button>
          </div>

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
              className="flex-1 min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold disabled:opacity-40"
              style={{ background: 'var(--color-danger)', color: 'var(--color-on-danger)' }}
            >
              {busy ? t.deleting : t.confirm}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
