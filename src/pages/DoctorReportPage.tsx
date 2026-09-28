import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconArrowLeft, IconPrinter } from '@tabler/icons-react'
import { todayISO } from '../db'
import { useAllEntries } from '../hooks/useEntries'
import { useMedications } from '../hooks/useMedications'
import { useSettings } from '../hooks/useSettings'
import { shiftISO } from '../lib/medications'
import { formatISODate } from '../lib/medicationFormat'
import { radioGroupProps, radioProps } from '../lib/a11y'
import { format, LANGUAGES, useLanguage, useLocale, useTranslation, type Language } from '../i18n'
import { Card, SectionTitle } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { ReportDocument } from '../components/report/ReportDocument'
import { buildReportData, type ReportVariant } from '../components/report/reportData'

/** A4 width in CSS pixels (210 mm at 96 dpi): the preview is scaled from it. */
const PAGE_WIDTH = 794

const inputStyle = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
const inputClass = 'w-full rounded-xl px-3.5 py-2.5 text-body outline-none'

export function DoctorReportPage({ onBack }: { onBack: () => void }) {
  const t = useTranslation()
  const appLanguage = useLanguage()
  const { intlLocale } = useLocale()
  const settings = useSettings()
  const entries = useAllEntries()
  const medications = useMedications()
  const ids = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const today = todayISO()
  const [variant, setVariant] = useState<ReportVariant>('gp')
  const [consultation, setConsultation] = useState(shiftISO(today, -90))
  const [language, setLanguage] = useState<Language>(appLanguage)
  // null until edited: settings load asynchronously, so the defaults follow them.
  const [nameInput, setPatientName] = useState<string | null>(null)
  const patientName = nameInput ?? settings.displayName
  const [birthDate, setBirthDate] = useState('')
  const [agenda, setAgenda] = useState('')
  const [includeNotes, setIncludeNotes] = useState(true)
  const [cycleChoice, setIncludeCycle] = useState<boolean | null>(null)
  const includeCycle = cycleChoice ?? settings.cycleTrackingEnabled

  // Arriving on a new screen: start at the top, and move focus to its title
  // so screen readers announce where they are.
  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [])

  const data = useMemo(
    () =>
      entries && medications
        ? buildReportData(entries, medications, {
            variant,
            language,
            consultation,
            end: today,
            patientName: patientName.trim(),
            birthDate: birthDate || undefined,
            agenda: agenda.split('\n'),
            includeNotes,
            includeCycle,
          })
        : null,
    [entries, medications, variant, language, consultation, today, patientName, birthDate, agenda, includeNotes, includeCycle]
  )

  // Browsers name the saved PDF after the page title.
  useEffect(() => {
    const previous = document.title
    document.title = `${t.doctorReport.title} ${today}`
    return () => {
      document.title = previous
    }
  }, [t, today])

  const logged = data?.current.length ?? 0
  const notesTracked = settings.enabledFactors.includes('notes')

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <div className="flex items-center gap-2 -ml-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.doctorReport.back}
          className="w-11 h-11 rounded-[var(--radius-control)] flex items-center justify-center shrink-0"
          style={{ color: 'var(--color-brand)' }}
        >
          <IconArrowLeft size={22} aria-hidden />
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="text-title font-semibold outline-none">
          {t.doctorReport.title}
        </h1>
      </div>

      <Card>
        <SectionTitle>{t.doctorReport.recipientTitle}</SectionTitle>
        <div className="flex flex-col gap-2" {...radioGroupProps(t.doctorReport.recipientTitle)}>
          {(['gp', 'painClinic'] as const).map((v) => {
            const selected = variant === v
            return (
              <button
                key={v}
                type="button"
                {...radioProps(selected)}
                onClick={() => setVariant(v)}
                className="text-left rounded-xl px-4 py-3"
                style={{
                  background: selected ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                  boxShadow: `inset 0 0 0 ${selected ? 2 : 1}px ${selected ? 'var(--color-brand)' : 'var(--color-hairline)'}`,
                }}
              >
                <span className="block text-body font-semibold" style={{ color: selected ? 'var(--color-brand)' : 'var(--color-ink)' }}>
                  {t.doctorReport.recipients[v].label}
                </span>
                {/* Muted grey on the selected tint misses 4.5:1 in the classic design. */}
                <span className="block text-caption mt-0.5" style={{ color: selected ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}>
                  {t.doctorReport.recipients[v].helper}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>{t.doctorReport.consultationTitle}</SectionTitle>
        <input
          aria-label={t.doctorReport.consultationTitle}
          type="date"
          value={consultation}
          max={shiftISO(today, -1)}
          onChange={(e) => e.target.value && e.target.value < today && setConsultation(e.target.value)}
          aria-describedby={`${ids}-consultation-help ${ids}-period`}
          className={inputClass}
          style={inputStyle}
        />
        <p id={`${ids}-consultation-help`} className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
          {t.doctorReport.consultationHelper}
        </p>
        {data && (
          <p id={`${ids}-period`} className="text-caption mt-2 font-medium" aria-live="polite">
            {format(t.doctorReport.periodSummary, {
              start: formatISODate(data.p.start, intlLocale),
              end: formatISODate(data.p.end, intlLocale),
              n: logged,
              days: data.p.periodDays,
            })}{' '}
            {logged === 0 ? t.doctorReport.noData : logged < 7 ? t.doctorReport.fewDaysWarning : ''}
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle>{t.doctorReport.patientTitle}</SectionTitle>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor={`${ids}-name`} className="block text-caption font-medium mb-1" style={{ color: 'var(--color-ink-muted)' }}>
              {t.doctorReport.patientName}
            </label>
            <input
              id={`${ids}-name`}
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder={t.doctorReport.patientNamePlaceholder}
              autoComplete="name"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor={`${ids}-birth`} className="block text-caption font-medium mb-1" style={{ color: 'var(--color-ink-muted)' }}>
              {t.doctorReport.birthDate} ({t.doctorReport.optional})
            </label>
            <input
              id={`${ids}-birth`}
              type="date"
              value={birthDate}
              max={today}
              onChange={(e) => setBirthDate(e.target.value)}
              autoComplete="bday"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {t.doctorReport.privacyNote}
          </p>
        </div>
      </Card>

      <Card>
        <SectionTitle>{t.doctorReport.agendaTitle}</SectionTitle>
        <textarea
          aria-label={t.doctorReport.agendaTitle}
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder={t.doctorReport.agendaPlaceholder}
          aria-describedby={`${ids}-agenda-help`}
          rows={3}
          className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none resize-y"
          style={inputStyle}
        />
        <p id={`${ids}-agenda-help`} className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
          {t.doctorReport.agendaHelper}
        </p>
      </Card>

      <Card>
        <SectionTitle>{t.doctorReport.optionsTitle}</SectionTitle>
        <div className="flex flex-col gap-3.5">
          <div>
            <p className="text-control font-medium mb-2">{t.doctorReport.languageTitle}</p>
            <div className="flex gap-2" {...radioGroupProps(t.doctorReport.languageTitle)}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  {...radioProps(language === lang.code)}
                  onClick={() => setLanguage(lang.code)}
                  className="flex-1 rounded-[var(--radius-control)] py-2 text-control font-semibold"
                  style={{
                    background: language === lang.code ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                    color: language === lang.code ? 'var(--color-on-brand)' : 'var(--color-brand)',
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
          {notesTracked && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-control font-medium">{t.doctorReport.includeNotes}</p>
              <Toggle checked={includeNotes} onChange={setIncludeNotes} label={t.doctorReport.includeNotes} />
            </div>
          )}
          {settings.cycleTrackingEnabled && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-control font-medium">{t.doctorReport.includeCycle}</p>
              <Toggle checked={includeCycle} onChange={setIncludeCycle} label={t.doctorReport.includeCycle} />
            </div>
          )}
        </div>
      </Card>

      <div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!logged}
          aria-describedby={`${ids}-print-help`}
          className="w-full rounded-[var(--radius-control)] py-3.5 text-body font-semibold text-[var(--color-on-brand)] flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: 'var(--color-brand)' }}
        >
          <IconPrinter size={18} aria-hidden />
          {t.doctorReport.print}
        </button>
        <p id={`${ids}-print-help`} className="text-caption mt-2 text-center" style={{ color: 'var(--color-ink-muted)' }}>
          {t.doctorReport.printHelper}
        </p>
      </div>

      {data && logged > 0 && (
        <section aria-labelledby={`${ids}-preview`}>
          <h2 id={`${ids}-preview`} className="text-heading font-semibold px-1 mb-2">
            {t.doctorReport.preview}
          </h2>
          <ScaledPreview>
            <div className="report report-preview" lang={language}>
              <ReportDocument data={data} />
            </div>
          </ScaledPreview>
          {/* The copy that gets printed: full size, hidden on screen. */}
          {createPortal(
            <div className="report report-print" lang={language}>
              <ReportDocument data={data} />
            </div>,
            document.body
          )}
        </section>
      )}
    </div>
  )
}

/** Shrinks the A4 pages to the screen's width, keeping their layout intact. */
function ScaledPreview({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ scale: 1, height: 0 })

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const update = () => {
      const scale = Math.min(1, outer.clientWidth / PAGE_WIDTH)
      setBox({ scale, height: inner.offsetHeight * scale })
    }
    const observer = new ResizeObserver(update)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={outerRef} style={{ height: box.height || undefined, overflow: 'hidden' }}>
      <div ref={innerRef} style={{ width: PAGE_WIDTH, transform: `scale(${box.scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}
