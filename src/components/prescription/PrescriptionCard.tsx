import { useState } from 'react'
import { format as formatDate } from 'date-fns'
import { updateSettings } from '../../db'
import { useSettings } from '../../hooks/useSettings'
import { closeCard, prescriptionCard, prescriptionEnd, snoozeCard } from '../../lib/prescription'
import { todayISO } from '../../lib/dates'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Card } from '../ui/Card'
import { PrescriptionSheet } from './PrescriptionSheet'

/** On the day's page, from a week before a prescription ends and for two weeks after: a soft reminder to ask for a new one. */
export function PrescriptionCard() {
  const t = useTranslation().prescription
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const settings = useSettings()
  const today = todayISO()
  const [renewing, setRenewing] = useState(false)
  const kind = prescriptionCard(settings, today)
  const p = settings.prescription

  return (
    <>
      {kind && p && (
        <Card>
          <section aria-label={t.cardLabel}>
            <p className="text-caption font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--color-ink-muted)' }}>
              {t.cardLabel}
            </p>
            <p className="text-body mb-2">
              {format(kind === 'soon' ? t.cardSoon : t.cardEnded, { date: formatDate(new Date(prescriptionEnd(p) + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale }) }, language)}
            </p>
            <div className="flex flex-wrap gap-x-4">
              <button
                type="button"
                onClick={() => {
                  void updateSettings({ prescriptionCardState: closeCard(p) })
                  setRenewing(true)
                }}
                className="min-h-11 text-control font-semibold underline underline-offset-4"
                style={{ color: 'var(--color-brand)' }}
              >
                {t.done}
              </button>
              <button type="button" onClick={() => void updateSettings({ prescriptionCardState: snoozeCard(p, today) })} className="min-h-11 text-control underline underline-offset-4" style={{ color: 'var(--color-ink-muted)' }}>
                {t.later}
              </button>
            </div>
          </section>
        </Card>
      )}
      {renewing && <PrescriptionSheet settings={settings} today={today} initialStart={today} onClose={() => setRenewing(false)} />}
    </>
  )
}
