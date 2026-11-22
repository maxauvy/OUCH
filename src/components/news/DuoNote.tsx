import { useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

/**
 * The word about the Dropbox backup and OUCH Duo, open to everyone: once on its
 * own for the people already there, then from « Nouveautés ». It says what each
 * does and that all of it is optional; its one button leads to the backup, and
 * where the backup already goes to Dropbox it says where the rest is instead.
 */
export function DuoNote({ backupReady, onSetUp, onClose }: { backupReady: boolean; onSetUp: () => void; onClose: () => void }) {
  const t = useTranslation().news
  return (
    <ModalSheet title={t.duo.title} closeLabel={t.close} onClose={onClose}>
      <div className="flex flex-col gap-3 text-body leading-relaxed">
        <p>{t.duo.intro}</p>
        <p>{t.duo.backup}</p>
        <p>{t.duo.relative}</p>
        <p style={{ color: 'var(--color-ink-muted)' }}>{backupReady ? t.duo.ready : t.duo.free}</p>
      </div>
      {backupReady ? (
        <button type="button" onClick={onClose} className="btn-primary">
          {t.duo.ok}
        </button>
      ) : (
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            {t.duo.later}
          </button>
          <button type="button" onClick={onSetUp} className="btn-primary flex-1">
            {t.duo.setUp}
          </button>
        </div>
      )}
    </ModalSheet>
  )
}
