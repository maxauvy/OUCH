import { useState, type ComponentType } from 'react'
import { IconAlertTriangle, IconChevronRight, IconDownload, IconTrash } from '@tabler/icons-react'
import { useEntryCount } from '../../hooks/useEntries'
import { useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'
import { CsvExportDialog } from './CsvExportDialog'
import { DeleteDialog } from './DeleteDataDialog'

/**
 * The two actions that touch the whole journal, together and in red: sending
 * it out as plain CSV (nothing leaves the device until the sheet's button is
 * pressed) and erasing it (irreversible). Each opens its own sheet that says
 * what is at stake first, so a stray tap does neither.
 */
export function SensitiveZoneCard() {
  const t = useTranslation()
  const days = useEntryCount()
  const [open, setOpen] = useState<'csv' | 'delete' | null>(null)
  const nothingToExport = days === 0

  return (
    <Card>
      <SectionTitle icon={IconAlertTriangle}>{t.sensitive.title}</SectionTitle>
      <ul>
        <ActionRow
          icon={IconDownload}
          title={t.settings.csvTitle}
          line={nothingToExport ? t.sensitive.exportEmpty : t.sensitive.exportLine}
          disabled={nothingToExport}
          onClick={() => setOpen('csv')}
          first
        />
        <ActionRow icon={IconTrash} title={t.deleteData.button} line={t.sensitive.deleteLine} onClick={() => setOpen('delete')} />
      </ul>
      {open === 'csv' && <CsvExportDialog onClose={() => setOpen(null)} />}
      {open === 'delete' && <DeleteDialog onClose={() => setOpen(null)} />}
    </Card>
  )
}

function ActionRow({
  icon: Icon,
  title,
  line,
  onClick,
  disabled = false,
  first = false,
}: {
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
  title: string
  line: string
  onClick: () => void
  disabled?: boolean
  first?: boolean
}) {
  return (
    <li style={first ? undefined : { borderTop: '1px solid var(--color-hairline)' }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-haspopup="dialog"
        className="w-full min-h-14 flex items-center gap-3 py-3 text-left disabled:opacity-50"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, var(--color-surface))', color: 'var(--color-danger)' }}
          aria-hidden
        >
          <Icon size={18} aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-control font-semibold">{title}</span>
          <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {line}
          </span>
        </span>
        <IconChevronRight size={20} aria-hidden style={{ color: 'var(--color-ink-muted)' }} />
      </button>
    </li>
  )
}
