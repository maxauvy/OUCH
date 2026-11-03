import { useState } from 'react'
import { format as formatDate } from 'date-fns'
import { useSettings } from '../../hooks/useSettings'
import { todayISO } from '../../lib/dates'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { ConsultationSheet } from './ConsultationSheet'

/** A quiet line that opens the appointment's preparation: where to start one, and where to get back to it. */
export function PrepareLink({ onSeeReport }: { onSeeReport?: () => void }) {
  const t = useTranslation().consultation
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const settings = useSettings()
  const [open, setOpen] = useState(false)
  const c = settings.consultation
  const label = c ? format(t.trendsPrepare, { date: formatDate(new Date(c.date + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale }) }, language) : t.trendsPrepareNew
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="self-start min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-brand)' }}>
        {label}
      </button>
      {open && (
        <ConsultationSheet
          settings={settings}
          today={todayISO()}
          onSeeReport={
            onSeeReport &&
            (() => {
              setOpen(false)
              onSeeReport()
            })
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
