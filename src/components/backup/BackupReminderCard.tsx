import { useBackupReminder } from '../../hooks/useBackupReminder'
import { Card } from '../ui/Card'
import { format, useLanguage, useTranslation } from '../../i18n'

/** Shown at the top of the day's page when the journal is worth backing up. */
export function BackupReminderCard({ onBackup }: { onBackup: () => void }) {
  const t = useTranslation()
  const language = useLanguage()
  const { reminder, snooze } = useBackupReminder()
  if (!reminder) return null

  const text =
    reminder.kind === 'never'
      ? format(t.backupReminder.never, { n: reminder.entries }, language)
      : format(t.backupReminder.stale, { n: reminder.days }, language)

  return (
    <Card>
      <section aria-label={t.backupReminder.title}>
        <p className="font-medium text-body mb-1">{t.backupReminder.title}</p>
        <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {text}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBackup}
            className="flex-1 rounded-[var(--radius-control)] py-3 text-body font-semibold text-[var(--color-on-brand)]"
            style={{ background: 'var(--color-brand)' }}
          >
            {t.backupReminder.backup}
          </button>
          <button
            type="button"
            onClick={snooze}
            className="rounded-[var(--radius-control)] px-4 py-3 text-body font-medium"
            style={{ color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
          >
            {t.backupReminder.later}
          </button>
        </div>
      </section>
    </Card>
  )
}
