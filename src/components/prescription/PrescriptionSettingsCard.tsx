import { useState } from 'react'
import { IconPill } from '@tabler/icons-react'
import { useSettings } from '../../hooks/useSettings'
import { prescriptionEnd } from '../../lib/prescription'
import { todayISO } from '../../lib/dates'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'
import { PrescriptionSheet } from './PrescriptionSheet'

/** In Settings: the prescription noted, and the way to note or change it. */
export function PrescriptionSettingsCard() {
  const t = useTranslation().prescription
  const language = useLanguage()
  const { intlLocale } = useLocale()
  const settings = useSettings()
  const [open, setOpen] = useState(false)
  const p = settings.prescription
  return (
    <Card>
      <SectionTitle icon={IconPill}>{t.settingsTitle}</SectionTitle>
      <p className="text-caption mb-1" style={{ color: 'var(--color-ink-muted)' }}>
        {p
          ? [
              format(t.settingsCurrent, { end: new Date(prescriptionEnd(p) + 'T00:00:00').toLocaleDateString(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' }) }, language),
              p.label,
            ]
              .filter(Boolean)
              .join(' · ')
          : t.settingsNone}
      </p>
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-brand)' }}>
        {p ? t.settingsEdit : t.settingsAdd}
      </button>
      {open && <PrescriptionSheet settings={settings} today={todayISO()} onClose={() => setOpen(false)} />}
    </Card>
  )
}
