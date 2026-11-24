import { lazy, Suspense, useRef, useState, useEffect } from 'react'
import { format as formatDate } from 'date-fns'
import { IconCalendarCheck, IconCalendarHeart, IconFileText, IconMessageQuestion, IconNotes, IconPill, IconStethoscope, IconFolder } from '@tabler/icons-react'
import { useSettings } from '../hooks/useSettings'
import { consultationCard, daysUntil, kindOf, pastConsultations } from '../lib/consultation'
import { prescriptionEnd } from '../lib/prescription'
import { todayISO } from '../lib/dates'
import { format, useLanguage, useLocale, useTranslation } from '../i18n'
import { Card } from '../components/ui/Card'
import { LinkRow } from '../components/ui/LinkRow'
import { Footer } from '../components/layout/Footer'
import { ConsultationSheet } from '../components/consultation/ConsultationSheet'
import { PrescriptionSheet } from '../components/prescription/PrescriptionSheet'
import { PastConsultationSheet } from '../components/consultation/PastConsultationSheet'
import { GroupCaption } from '../components/ui/Card'
import type { PastConsultation } from '../db/types'
import { useRichLook } from '../lib/look'
import { NavTile, NavTiles } from '../components/ui/NavTile'
import { PageSky } from '../components/entry/TodaySky'

const CareSheetPage = lazy(() => import('./CareSheetPage').then((m) => ({ default: m.CareSheetPage })))
const MdphPage = lazy(() => import('./MdphPage').then((m) => ({ default: m.MdphPage })))
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
  const [careSheet, setCareSheet] = useState(false)
  const [mdph, setMdph] = useState(false)
  const mdphRow = useRef<HTMLButtonElement>(null)
  const mdphFrom = useRef(false)
  const [openPast, setOpenPast] = useState<PastConsultation | null>(null)
  const reportButton = useRef<HTMLButtonElement>(null)
  // The weather look: no dark block; the appointment in a light card with a small calendar page, one filled button, tiles for the rest.
  const rich = useRichLook()
  const returning = useRef(false)
  // Which page the focus returns to: the care sheet's row, or the report's button.
  const careSheetFrom = useRef(false)
  const careSheetRow = useRef<HTMLButtonElement>(null)

  // Back from the report: focus returns to the button that opened it.
  useEffect(() => {
    if (reporting || careSheet || mdph || !returning.current) return
    returning.current = false
    ;(mdphFrom.current ? mdphRow.current : careSheetFrom.current ? careSheetRow.current : reportButton.current)?.focus()
    mdphFrom.current = false
  }, [reporting, careSheet, mdph])

  if (reporting) {
    return (
      <Suspense fallback={null}>
        <DoctorReportPage
          onBack={() => {
            returning.current = true
            careSheetFrom.current = false
            setReporting(false)
          }}
        />
      </Suspense>
    )
  }

  if (careSheet) {
    return (
      <Suspense fallback={null}>
        <CareSheetPage
          onBack={() => {
            returning.current = true
            careSheetFrom.current = true
            setCareSheet(false)
          }}
        />
      </Suspense>
    )
  }

  if (mdph) {
    return (
      <Suspense fallback={null}>
        <MdphPage
          onBack={() => {
            returning.current = true
            mdphFrom.current = true
            setMdph(false)
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
  const past = pastConsultations(settings)
  const who = c ? [kindOf(c) === 'cetd' ? t.kindCetd : t.kindGp, c.doctor].filter(Boolean).join(' · ') : ''

  const openCareSheet = () => {
    careSheetFrom.current = true
    setCareSheet(true)
  }
  const prescriptionHint = p ? [format(i18n.prescription.settingsCurrent, { end: day(prescriptionEnd(p)) }, language), p.label].filter(Boolean).join(' · ') : i18n.prescription.settingsNone

  return (
    <div className="relative isolate flex flex-col gap-4 px-4 pt-4 pb-28">
      <PageSky />
      <div className="px-1">
        <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {t.pageKicker}
        </p>
        <h1 className="page-title dawn-title text-title font-bold leading-tight">{i18n.tabs.consultation}</h1>
      </div>

      {rich ? (
        <>
          <section aria-label={c ? t.nextTitle : t.noneTitle} className="rounded-[var(--radius-card)] p-[18px] flex flex-col gap-4" style={{ background: 'var(--color-surface)', border: 'var(--card-border, none)', boxShadow: 'var(--card-shadow)' }}>
            <div className="flex items-center gap-3.5">
              {/* A small calendar page: the month and the day once an appointment is noted, an empty page until then. */}
              <span className="w-[58px] shrink-0 rounded-2xl overflow-hidden text-center" style={{ boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }} aria-hidden>
                <span className="block text-[11px] font-bold uppercase tracking-wide py-0.5" style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}>
                  {c ? formatDate(new Date(c.date + 'T00:00:00'), 'MMM', { locale: dateFnsLocale }).replace('.', '') : '\u00a0'}
                </span>
                <span className="sky-title flex items-center justify-center h-11 text-[26px] font-extrabold" style={{ color: c ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}>
                  {c ? formatDate(new Date(c.date + 'T00:00:00'), 'd') : <IconCalendarHeart size={22} stroke={1.6} />}
                </span>
              </span>
              <div className="min-w-0">
                {c && <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>{t.nextTitle}</p>}
                <h2 className="section-title text-heading font-bold leading-snug">{c ? day(c.date) : t.noneTitle}</h2>
                <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
                  {c ? [when, who].filter(Boolean).join(' · ') : t.noneHint}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                ref={reportButton}
                data-tour="report"
                type="button"
                onClick={() => setReporting(true)}
                className="btn-primary"
              >
                <IconFileText size={18} aria-hidden />
                {t.prepareReport}
              </button>
              <button type="button" onClick={() => setSheet('appointment')} className="btn-secondary">
                {c ? <IconMessageQuestion size={18} aria-hidden /> : <IconCalendarHeart size={18} aria-hidden />}
                <span>
                  {c ? t.questionsRow : t.addAppointment}
                  {c && (
                    <span className="font-normal">
                      {' · '}
                      {c.questions.length ? format(t.questionsCount, { n: c.questions.length }, language) : t.questionsNone}
                    </span>
                  )}
                </span>
              </button>
            </div>
          </section>

          <NavTiles>
            {afterKind && <NavTile icon={IconNotes} tone="mood" title={t.afterRow} hint={t.afterRowHint} onClick={() => setSheet('after')} />}
            <NavTile icon={IconPill} tone="meds" title={t.prescriptionRow} hint={prescriptionHint} onClick={() => setSheet('prescription')} />
            <NavTile buttonRef={careSheetRow} icon={IconStethoscope} tone="fog" title={i18n.careSheet.row} hint={i18n.careSheet.rowHint} onClick={openCareSheet} />
            <NavTile buttonRef={mdphRow} icon={IconFolder} tone="sleep" title={i18n.mdph.row} hint={i18n.mdph.rowHint} onClick={() => setMdph(true)} />
          </NavTiles>
        </>
      ) : (
        <>
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
          <LinkRow
            icon={c ? IconMessageQuestion : IconCalendarHeart}
            title={c ? t.questionsRow : t.addAppointment}
            hint={c ? (c.questions.length ? format(t.questionsCount, { n: c.questions.length }, language) : t.questionsNone) : undefined}
            onClick={() => setSheet('appointment')}
          />
          {afterKind && <LinkRow icon={IconNotes} title={t.afterRow} hint={t.afterRowHint} onClick={() => setSheet('after')} />}
          <LinkRow
            icon={IconPill}
            title={t.prescriptionRow}
            hint={prescriptionHint}
            onClick={() => setSheet('prescription')}
          />
          <LinkRow
            buttonRef={careSheetRow}
            icon={IconStethoscope}
            title={i18n.careSheet.row}
            hint={i18n.careSheet.rowHint}
            onClick={openCareSheet}
          />
          <LinkRow buttonRef={mdphRow} icon={IconFolder} title={i18n.mdph.row} hint={i18n.mdph.rowHint} onClick={() => setMdph(true)} />
        </div>
      </Card>
        </>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-title" className="flex flex-col gap-2">
          <GroupCaption>
            <span id="past-title">{t.pastTitle}</span>
          </GroupCaption>
          <Card>
            <div className="flex flex-col">
              {past.map((p) => (
                <LinkRow
                  key={`${p.date}-${p.kind}`}
                  icon={IconCalendarCheck}
                  title={`${day(p.date)} ${p.date.slice(0, 4)}`}
                  hint={[p.kind === 'cetd' ? t.kindCetd : t.kindGp, p.doctor, p.notes && p.notes.length > 60 ? `${p.notes.slice(0, 60)}…` : p.notes].filter(Boolean).join(' · ')}
                  onClick={() => setOpenPast(p)}
                />
              ))}
            </div>
          </Card>
          <p className="text-caption px-1" style={{ color: 'var(--color-ink-muted)' }}>
            {t.pastHint}
          </p>
        </section>
      )}

      <p className="text-caption px-1" style={{ color: 'var(--color-ink-muted)' }}>
        {t.reportNote}
      </p>
      <Footer />

      {(sheet === 'appointment' || sheet === 'after') && (
        <ConsultationSheet settings={settings} today={today} startAfter={sheet === 'after'} onSeeReport={() => { setSheet(null); setReporting(true) }} onClose={() => setSheet(null)} />
      )}
      {openPast && <PastConsultationSheet settings={settings} past={openPast} onClose={() => setOpenPast(null)} />}
      {sheet === 'prescription' && <PrescriptionSheet settings={settings} today={today} onClose={() => setSheet(null)} />}
    </div>
  )
}
