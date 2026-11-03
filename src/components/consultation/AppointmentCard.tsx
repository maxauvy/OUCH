import { useState } from 'react'
import { format as formatDate } from 'date-fns'
import { updateSettings } from '../../db'
import { useSettings } from '../../hooks/useSettings'
import { consultationCard, daysUntil } from '../../lib/consultation'
import { todayISO } from '../../lib/dates'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Card } from '../ui/Card'
import { ConsultationSheet } from './ConsultationSheet'

/** On the day's page, shortly before an appointment (to prepare it) and on and after the day (to note what was said). Soft, and it can be closed. */
export function AppointmentCard() {
  const t = useTranslation().consultation
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const settings = useSettings()
  const today = todayISO()
  const [open, setOpen] = useState(false)
  const kind = consultationCard(settings, today)
  const c = settings.consultation
  if (!kind || !c) return null

  const text =
    kind === 'soon'
      ? format(t.cardSoon, { date: formatDate(new Date(c.date + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale }), n: daysUntil(c, today) }, language)
      : t.cardAfter

  return (
    <>
      <Card>
        <section aria-label={t.cardLabel}>
          <p className="text-caption font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--color-ink-muted)' }}>
            {t.cardLabel}
          </p>
          <p className="text-body mb-2">{text}</p>
          <div className="flex gap-4">
            <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-brand)' }}>
              {kind === 'soon' ? t.prepare : t.note}
            </button>
            <button type="button" onClick={() => void updateSettings({ consultationCardClosed: { date: c.date, kind } })} className="min-h-11 text-control underline underline-offset-4" style={{ color: 'var(--color-ink-muted)' }}>
              {t.later}
            </button>
          </div>
        </section>
      </Card>
      {open && <ConsultationSheet settings={settings} today={today} startAfter={kind === 'after'} onClose={() => setOpen(false)} />}
    </>
  )
}
