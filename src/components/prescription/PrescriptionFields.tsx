import { useId, useState } from 'react'
import { format as formatDate } from 'date-fns'
import { addMonthsISO, draftPrescription, DURATION_MONTHS, MAX_LABEL_LENGTH, MAX_MONTHS, reminderDay, type PrescriptionDraft } from '../../lib/prescription'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Chip } from '../ui/Chip'

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
const fieldClass = 'w-full rounded-xl px-3.5 py-2.5 text-body outline-none'

/** The length, the day it starts, when to be reminded and (optionally) what it is for: shared by the page of the appointment and by the prescription's own sheet. */
export function PrescriptionFields({ draft, onChange, withLabel = true }: { draft: PrescriptionDraft; onChange: (patch: Partial<PrescriptionDraft>) => void; withLabel?: boolean }) {
  const t = useTranslation().prescription
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const ids = useId()
  const [otherOpen, setOtherOpen] = useState(draft.months !== null && !(DURATION_MONTHS as readonly number[]).includes(draft.months))
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMMM yyyy', { locale: dateFnsLocale })
  const p = draftPrescription(draft)

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t.durationTitle}>
        <p className="text-caption font-semibold mb-1.5">{t.durationTitle}</p>
        <div className="flex flex-wrap gap-2">
          {DURATION_MONTHS.map((m) => (
            <Chip
              key={m}
              label={format(t.months, { n: m }, language)}
              selected={!otherOpen && draft.months === m}
              onClick={() => {
                setOtherOpen(false)
                onChange({ months: draft.months === m ? null : m })
              }}
            />
          ))}
          <Chip
            label={t.other}
            selected={otherOpen}
            onClick={() => {
              setOtherOpen(!otherOpen)
              if (otherOpen) onChange({ months: null })
            }}
          />
        </div>
        {otherOpen && (
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_MONTHS}
            aria-label={t.otherMonths}
            placeholder={t.otherMonths}
            value={draft.months ?? ''}
            onChange={(e) => onChange({ months: e.target.value === '' ? null : Number(e.target.value) })}
            className={`${fieldClass} mt-2`}
            style={field}
          />
        )}
        <p className="text-caption mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
          {t.renewableHint}
        </p>
      </div>

      <div>
        <label htmlFor={`${ids}-start`} className="text-caption font-semibold block mb-1">
          {t.startLabel}
        </label>
        <input id={`${ids}-start`} type="date" value={draft.start} onChange={(e) => e.target.value && onChange({ start: e.target.value })} className={fieldClass} style={field} />
      </div>

      <div role="group" aria-label={t.remindTitle}>
        <p className="text-caption font-semibold mb-1.5">{t.remindTitle}</p>
        <div className="flex flex-wrap gap-2">
          <Chip label={t.remind7} selected={draft.remindDays === 7} onClick={() => onChange({ remindDays: 7 })} />
          <Chip label={t.remind14} selected={draft.remindDays === 14} onClick={() => onChange({ remindDays: 14 })} />
        </div>
      </div>

      {withLabel && (
        <div>
          <label htmlFor={`${ids}-label`} className="text-caption font-semibold block mb-1">
            {t.labelLabel}
          </label>
          <input id={`${ids}-label`} value={draft.label} maxLength={MAX_LABEL_LENGTH} placeholder={t.labelPlaceholder} onChange={(e) => onChange({ label: e.target.value })} className={fieldClass} style={field} />
        </div>
      )}

      {p && (
        <p className="text-body" aria-live="polite">
          {format(t.summary, { end: day(addMonthsISO(p.start, p.months)), remind: day(reminderDay(p)) }, language)}
        </p>
      )}
    </div>
  )
}
