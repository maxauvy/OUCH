import { IconShield, IconShieldCheck } from '@tabler/icons-react'
import { todayISO } from '../../lib/dates'
import { useSettings } from '../../hooks/useSettings'
import { useEntryCount } from '../../hooks/useEntries'
import { format, useLocale, useTranslation } from '../../i18n'

/** Under the day's title: when the journal was last backed up, so the answer
 * is always one glance away rather than only in Settings. Touching it opens
 * the backup section. Quiet by design: the reminder card is what asks for
 * action, and only when it is time. Nothing is said before the first entry,
 * when there is nothing yet to keep. */
export function LastBackupLine({ onClick }: { onClick: () => void }) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const { lastBackupAt } = useSettings()
  const entries = useEntryCount()

  if (lastBackupAt === undefined && !entries) return null

  // The year only when it is not this one.
  const date = (ms: number) => {
    const d = new Date(ms)
    const sameYear = d.getFullYear() === Number(todayISO().slice(0, 4))
    return d.toLocaleDateString(intlLocale, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
  }
  const Icon = lastBackupAt === undefined ? IconShield : IconShieldCheck

  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-0.5 -ml-0.5 flex min-h-6 items-center gap-1.5 text-caption underline underline-offset-4"
      style={{ color: 'var(--color-ink-muted)' }}
    >
      <Icon size={15} aria-hidden />
      {lastBackupAt === undefined ? t.backup.neverBackedUp : format(t.backup.lastBackup, { date: date(lastBackupAt) })}
    </button>
  )
}
