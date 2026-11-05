import { lazy, Suspense, useRef, useState, useEffect, type ReactNode } from 'react'
import { format as formatDate } from 'date-fns'
import { IconCalendarHeart, IconChevronRight, IconFileText, IconMessageQuestion, IconNotes, IconPill, type Icon } from '@tabler/icons-react'
import { useSettings } from '../hooks/useSettings'
import { consultationCard, daysUntil, kindOf } from '../lib/consultation'
import { prescriptionEnd } from '../lib/prescription'
import { todayISO } from '../lib/dates'
import { format, useLanguage, useLocale, useTranslation } from '../i18n'
import { Card } from '../components/ui/Card'
import { RoundIcon } from '../components/ui/RoundIcon'
import { Footer } from '../components/layout/Footer'
import { ConsultationSheet } from '../components/consultation/ConsultationSheet'
import { PrescriptionSheet } from '../components/prescription/PrescriptionSheet'

const DoctorReportPage = lazy(() => import('./DoctorReportPage').then((m) => ({ default: m.DoctorReportPage })))

/** Everything that prepares a visit to the doctor, in one place: the appointment, its questions, the report, the prescription. */
export function ConsultationPage() {
  const i18n = useTranslation()
  const t = i18n.consultation
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const settings = useSettings()
  const today = todayISO()
  const [sheet, setSheet] = useState<'appointment' | 'after' | 'prescription' | null>(null)
  const [reporting, setReporting] = useState(false)
  const reportButton = useRef<HTMLButtonElement>(null)
  const returning = useRef(false)

  // Back from the report: focus returns to the button that opened it.
  useEffect(() => {
    if (reporting || !returning.current) return
    returning.current = false
    reportButton.current?.focus()
  }, [reporting])

  if (reporting) {
    return (
      <Suspense fallback={null}>
        <DoctorReportPage
          onBack={() => {
            returning.current = true
            setReporting(false)
          }}
        />
      </Suspense>
    )
  }

  const c = settings.consultation
  const p = settings.prescription
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale })
  const n = c ? daysUntil(c, today) : 0
  const when = !c ? '' : n > 0 ? format(t.inDays, { n }, language) : n === 0 ? t.todayLabel : t.passedLabel
  const afterKind = consultationCard(settings, today) === 'after'
  const who = c ? [kindOf(c) === 'cetd' ? t.kindCetd : t.kindGp, c.doctor].filter(Boolean).join(' · ') : ''

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <div className="px-1">
        <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {t.pageKicker}
        </p>
        <h1 className="text-title font-bold leading-tight">{i18n.tabs.consultation}</h1>
      </div>

      <section
        aria-label={c ? t.nextTitle : t.noneTitle}
        className="rounded-[var(--radius-card)] p-5 flex flex-col gap-3"
        style={{ background: 'var(--cta-bg, var(--color-brand))', color: 'var(--color-on-brand)' }}
      >
        <div>
          <p className="text-caption opacity-90">{c ? t.nextTitle : t.noneTitle}</p>
          {c ? (
            <>
              <p className="text-display font-bold leading-tight">{day(c.date)}</p>
              <p className="text-body opacity-95">{[when, who].filter(Boolean).join(' · ')}</p>
            </>
          ) : (
            <p className="text-body mt-1 opacity-95">{t.noneHint}</p>
          )}
        </div>
        <button
          ref={reportButton}
          data-tour="report"
          type="button"
          onClick={() => setReporting(true)}
          className="inline-flex items-center justify-center gap-2 min-h-12 rounded-[var(--radius-control)] text-body font-semibold"
          style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }}
        >
          <IconFileText size={18} aria-hidden />
          {t.prepareReport}
        </button>
      </section>

      <Card>
        <div className="flex flex-col">
          <Line
            icon={c ? IconMessageQuestion : IconCalendarHeart}
            title={c ? t.questionsRow : t.addAppointment}
            hint={c ? (c.questions.length ? format(t.questionsCount, { n: c.questions.length }, language) : t.questionsNone) : undefined}
            onClick={() => setSheet('appointment')}
          />
          {afterKind && <Line icon={IconNotes} title={t.afterRow} hint={t.afterRowHint} onClick={() => setSheet('after')} />}
          <Line
            icon={IconPill}
            title={t.prescriptionRow}
            hint={p ? [format(i18n.prescription.settingsCurrent, { end: day(prescriptionEnd(p)) }, language), p.label].filter(Boolean).join(' · ') : i18n.prescription.settingsNone}
            onClick={() => setSheet('prescription')}
          />
        </div>
      </Card>

      <p className="text-caption px-1" style={{ color: 'var(--color-ink-muted)' }}>
        {t.reportNote}
      </p>
      <Footer />

      {(sheet === 'appointment' || sheet === 'after') && (
        <ConsultationSheet settings={settings} today={today} startAfter={sheet === 'after'} onSeeReport={() => { setSheet(null); setReporting(true) }} onClose={() => setSheet(null)} />
      )}
      {sheet === 'prescription' && <PrescriptionSheet settings={settings} today={today} onClose={() => setSheet(null)} />}
    </div>
  )
}

/** A row that opens something: a round icon, a title, a line under it, a chevron. */
function Line({ icon, title, hint, onClick }: { icon: Icon; title: string; hint?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 py-3 text-left border-t first:border-t-0 min-h-11" style={{ borderColor: 'var(--color-hairline)' }}>
      <RoundIcon icon={icon} />
      <span className="flex-1 min-w-0">
        <span className="block text-body font-semibold">{title}</span>
        {hint && (
          <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {hint}
          </span>
        )}
      </span>
      <IconChevronRight size={20} aria-hidden style={{ color: 'var(--color-ink-muted)' }} />
    </button>
  )
}
