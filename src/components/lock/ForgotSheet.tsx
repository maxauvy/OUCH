import { useId, useState } from 'react'
import { IconTrash } from '@tabler/icons-react'
import { useSettings } from '../../hooks/useSettings'
import { confirmationMatches } from '../../lib/wipeConfirm'
import { wipeLocalData } from '../../lib/wipe'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

/**
 * "Code oublié ?": there is no way back to the code (only a hash of it is
 * kept), so the way out is to erase this device and restore a backup. It says
 * so plainly, shows the date of the last backup (the thing that decides how
 * much is lost), and asks for the same typed word as "Supprimer toutes mes
 * données". This keeps the lock meaningful: a forgotten code cannot be
 * walked around by a stranger without erasing what they came to see.
 */
export function ForgotSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslation()
  const lock = t.lock
  const del = t.deleteData
  const s = t.lockSettings
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const { lastBackupAt } = useSettings()
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const matches = confirmationMatches(typed, del.word)
  const date = lastBackupAt === undefined ? null : new Date(lastBackupAt).toLocaleDateString(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' })

  async function erase() {
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
    <ModalSheet title={lock.forgotTitle} closeLabel={s.close} busy={busy} onClose={onClose}>
      <p className="text-body">{lock.forgotText}</p>
      <p className="text-control font-medium">{date ? format(s.lastBackup, { date }, language) : s.noBackup}</p>
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {lock.forgotAfter}
      </p>

      <div>
        <label htmlFor={inputId} className="text-caption font-medium block mb-1.5">
          {format(del.typeLabel, { word: del.word }, language)}
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
          style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        />
      </div>

      {failed && (
        <p role="alert" className="text-caption font-medium" style={{ color: 'var(--color-danger)' }}>
          {del.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => !busy && onClose()}
          disabled={busy}
          className="flex-1 min-h-11 rounded-[var(--radius-control)] px-4 text-control font-semibold"
          style={{ color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        >
          {s.cancel}
        </button>
        <button
          type="button"
          onClick={() => void erase()}
          disabled={!matches || busy}
          className="flex flex-1 min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-control font-semibold disabled:opacity-40"
          style={{ background: 'var(--color-danger)', color: 'var(--color-on-danger)' }}
        >
          <IconTrash size={18} aria-hidden />
          {busy ? del.deleting : lock.forgotAction}
        </button>
      </div>
    </ModalSheet>
  )
}
