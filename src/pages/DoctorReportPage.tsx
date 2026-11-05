import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconArrowLeft, IconFileTypePdf, IconPrinter } from '@tabler/icons-react'
import { useAllEntries } from '../hooks/useEntries'
import { useMedications } from '../hooks/useMedications'
import { useSettings } from '../hooks/useSettings'
import { leadFactors } from '../lib/leads'
import { formatISODate } from '../lib/medicationFormat'
import { buildImagePdf, type PdfImage } from '../lib/pdf'
import { downloadBlob } from '../lib/backup'
import { IS_DEMO } from '../lib/demoMode'
import { radioGroupProps, radioProps } from '../lib/a11y'
import { format, LANGUAGES, useLanguage, useLocale, useTranslation, type Language } from '../i18n'
import { Card, SectionTitle } from '../components/ui/Card'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import { ReportDocument } from '../components/report/ReportDocument'
import { buildReportData, type ReportVariant } from '../components/report/reportData'
import { withCut, type Cut } from '../components/report/pagination'
import { isOffered, withoutUnoffered } from '../lib/indicatorCatalog'
import { useEarlyAccess } from '../lib/earlyAccess'
import { shiftISO, todayISO } from '../lib/dates'
import { agendaLines, kindOf, lastOf, pastConsultations, previousOf, reportStart, withPast } from '../lib/consultation'
import { updateSettings } from '../db'
import type { ConsultationKind } from '../db/types'
import { validSpans, type Span } from '../lib/periodComparison'

/** A4 width in CSS pixels (210 mm at 96 dpi): the preview is scaled from it. */
const PAGE_WIDTH = 794

const inputStyle = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
const inputClass = 'w-full rounded-xl px-3.5 py-2.5 text-body outline-none'

// An app installed from Safari on iPhone has no print dialog: window.print()
// does nothing there, so only the PDF is offered.
const canPrint = !(navigator as Navigator & { standalone?: boolean }).standalone

/** The preview's pages as JPEGs, at twice the A4 size in CSS pixels (about
 * 190 dpi once printed). */
async function capturePages(container: HTMLElement): Promise<PdfImage[]> {
  const { toCanvas } = await import('html-to-image')
  const images: PdfImage[] = []
  for (const page of Array.from(container.querySelectorAll<HTMLElement>('.report-page'))) {
    const canvas = await toCanvas(page, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      // The preview's page shadow and spacing aren't part of the page.
      style: { boxShadow: 'none', margin: '0' },
    })
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG encoding failed'))), 'image/jpeg', 0.9)
    )
    images.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height })
  }
  return images
}

export function DoctorReportPage({ onBack }: { onBack: () => void }) {
  const t = useTranslation()
  const appLanguage = useLanguage()
  const { intlLocale } = useLocale()
  const settings = useSettings()
  const earlyAccess = useEarlyAccess()
  const entries = useAllEntries()
  const medications = useMedications()
  const ids = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportFailed, setExportFailed] = useState(false)

  const today = todayISO()
  // null until chosen: the report for whom the next appointment is with, once the settings are read.
  const [variantInput, setVariant] = useState<ReportVariant | null>(null)
  const variant: ReportVariant = variantInput ?? (kindOf(settings.consultation) === 'cetd' ? 'painClinic' : 'gp')
  const kind: ConsultationKind = variant === 'gp' ? 'gp' : 'cetd'
  // By kind, until edited: a report starts at the last appointment of its kind, else 90 days back.
  const [dates, setDates] = useState<Partial<Record<ConsultationKind, string>>>({})
  const consultation = dates[kind] ?? reportStart(settings, today, shiftISO(today, -90), kind)
  const lastOfKind = lastOf(settings, kind)
  // The appointment of this kind before the one the report starts at: the comparison period is the interval between the two.
  const previousStart = previousOf(settings, kind, consultation)?.date
  const [language, setLanguage] = useState<Language>(appLanguage)
  // null until edited: settings load asynchronously, so the defaults follow them.
  const [nameInput, setPatientName] = useState<string | null>(null)
  const patientName = nameInput ?? settings.displayName
  // null until edited: kept on the device once typed.
  const [birthInput, setBirthDate] = useState<string | null>(null)
  const birthDate = birthInput ?? settings.birthDate ?? ''
  // null until edited: filled from the appointment prepared in the app, if any.
  const [agendaInput, setAgenda] = useState<string | null>(null)
  const agenda = agendaInput ?? agendaLines(kindOf(settings.consultation) === kind ? settings.consultation : undefined, t.consultation.goalPrefix).join('\n')
  const [includeNotes, setIncludeNotes] = useState(true)
  const [includeLastNote, setIncludeLastNote] = useState(true)
  // The two periods compared: by default the report's and the one before it; the person can choose two of their own.
  const [customCompare, setCustomCompare] = useState(false)
  const [spanA, setSpanA] = useState<Span>({ from: shiftISO(today, -59), to: shiftISO(today, -30) })
  const [spanB, setSpanB] = useState<Span>({ from: shiftISO(today, -29), to: today })
  const compareValid = validSpans(spanA, spanB, today)
  const [cycleChoice, setIncludeCycle] = useState<boolean | null>(null)
  const includeCycle = cycleChoice ?? settings.cycleTrackingEnabled

  // Arriving on a new screen: start at the top, and move focus to its title
  // so screen readers announce where they are.
  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [])

  // What the patient noted after the last appointment: only when the report starts at that appointment.
  const lastNoteText = lastOfKind?.date === consultation ? lastOfKind.notes : undefined
  const lastNote = useMemo(() => (lastNoteText ? { date: consultation, text: lastNoteText } : undefined), [lastNoteText, consultation])

  const data = useMemo(
    () =>
      entries && medications
        ? buildReportData(entries.map((e) => withoutUnoffered(e, earlyAccess)), medications, {
            variant,
            language,
            consultation,
            sinceConsultation: lastOfKind?.date === consultation,
            previousStart,
            end: today,
            patientName: patientName.trim(),
            birthDate: birthDate || undefined,
            illnesses: settings.illnesses,
            illnessDetails: { status: settings.illnessStatus, otherName: settings.otherIllnessName, year: settings.illnessYear },
            agenda: agenda.split('\n'),
            markedFlares: settings.markedFlares,
            compareSpans: customCompare && compareValid ? { a: spanA, b: spanB } : undefined,
            lastNote: lastNote && includeLastNote ? lastNote : undefined,
            leadChoices: settings.leadChoices,
            leadFactors: leadFactors(settings.enabledFactors),
            leadTrials: { history: settings.leadTrialHistory, current: settings.leadTrial },
            includeStiffness: settings.enabledFactors.includes('morningStiffness') && isOffered('morningStiffness', earlyAccess),
            includeNightWakings: settings.enabledFactors.includes('nightWaking') && isOffered('nightWaking', earlyAccess),
            includeNotes,
            includeCycle,
            demo: IS_DEMO,
          })
        : null,
    [entries, medications, variant, language, consultation, lastOfKind?.date, previousStart, today, patientName, birthDate, settings.illnesses, settings.illnessStatus, settings.otherIllnessName, settings.illnessYear, settings.leadChoices, settings.enabledFactors, earlyAccess, settings.leadTrialHistory, settings.leadTrial, settings.markedFlares, lastNote, includeLastNote, customCompare, compareValid, spanA, spanB, agenda, includeNotes, includeCycle]
  )

  // Browsers name the saved PDF after the page title.
  useEffect(() => {
    const previous = document.title
    document.title = `${t.doctorReport.title} ${today}`
    return () => {
      document.title = previous
    }
  }, [t, today])

  async function exportPdf() {
    if (!previewRef.current) return
    setExporting(true)
    setExportFailed(false)
    try {
      const blob = buildImagePdf(await capturePages(previewRef.current), `${t.doctorReport.title} ${today}`)
      const file = new File([blob], `${t.doctorReport.fileName}-${today}.pdf`, { type: 'application/pdf' })
      // On a phone the share sheet is the way to keep the file (Files, mail,
      // print…); a computer just downloads it.
      const phone = window.matchMedia('(pointer: coarse)').matches
      if (phone && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: t.doctorReport.title })
          return
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          // Making the file can take long enough for the browser to stop
          // counting the tap as the reason for sharing; download instead.
        }
      }
      downloadBlob(blob, file.name)
    } catch (e) {
      console.error(e)
      setExportFailed(true)
    } finally {
      setExporting(false)
    }
  }

  // Continuation sheets for content that doesn't fit its page: found by
  // measuring the preview, shared with the printed copy, and started over
  // whenever the report changes, or once the web font is in (text metrics
  // change with it).
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    let live = true
    document.fonts?.ready.then(() => live && setFontsReady(true))
    return () => {
      live = false
    }
  }, [])
  const layoutKey = data && { data, fontsReady }
  const [pagination, setPagination] = useState<{ key: typeof layoutKey; cuts: Cut[] }>({ key: null, cuts: [] })
  const current = (key: typeof layoutKey) => key?.data === data && key?.fontsReady === fontsReady
  const cuts = current(pagination.key) ? pagination.cuts : []
  const addCut = (cut: Cut) =>
    setPagination((prev) => ({ key: layoutKey, cuts: withCut(current(prev.key) ? prev.cuts : [], cut) }))

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
                aria-labelledby={`${ids}-${v}-label`}
                aria-describedby={`${ids}-${v}-help`}
                onClick={() => setVariant(v)}
                className="text-left rounded-xl px-4 py-3"
                style={{
                  background: selected ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                  boxShadow: `inset 0 0 0 ${selected ? 2 : 1}px ${selected ? 'var(--color-brand)' : 'var(--color-hairline)'}`,
                }}
              >
                <span id={`${ids}-${v}-label`} className="block text-body font-semibold" style={{ color: selected ? 'var(--color-brand)' : 'var(--color-ink)' }}>
                  {t.doctorReport.recipients[v].label}
                </span>
                {/* Muted grey on the selected tint misses 4.5:1. */}
                <span id={`${ids}-${v}-help`} className="block text-caption mt-0.5" style={{ color: selected ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}>
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
          onChange={(e) => e.target.value && e.target.value < today && setDates((d) => ({ ...d, [kind]: e.target.value }))}
          // Kept once the field is left, as an appointment of this kind: it need not be typed again.
          onBlur={() => {
            if (consultation < today && !pastConsultations(settings).some((p) => p.kind === kind && p.date === consultation)) void updateSettings(withPast(settings, { date: consultation, kind }))
          }}
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
            }, appLanguage)}{' '}
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
              onBlur={() => {
                const v = birthDate >= '1900-01-01' && birthDate <= today ? birthDate : undefined
                if (v !== settings.birthDate) void updateSettings({ birthDate: v })
              }}
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
        <SectionTitle>{t.doctorReport.compareTitle}</SectionTitle>
        <div className="flex flex-col gap-2" {...radioGroupProps(t.doctorReport.compareTitle)}>
          {([false, true] as const).map((custom) => (
            <button
              key={String(custom)}
              type="button"
              {...radioProps(customCompare === custom)}
              onClick={() => setCustomCompare(custom)}
              className="text-left rounded-[var(--radius-control)] px-3.5 py-2.5 text-control"
              style={{
                background: customCompare === custom ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                boxShadow: `inset 0 0 0 1px ${customCompare === custom ? 'var(--color-brand)' : 'var(--color-hairline)'}`,
              }}
            >
              {custom ? t.doctorReport.compareCustom : t.doctorReport.compareDefault}
            </button>
          ))}
        </div>
        {customCompare && (
          <div className="flex flex-col gap-2 mt-3">
            {([[t.compare.periodA, spanA, setSpanA], [t.compare.periodB, spanB, setSpanB]] as const).map(([label, span, set]) => (
              <div key={label} className="flex items-center gap-2 flex-wrap">
                <span className="text-caption font-semibold w-full">{label}</span>
                <span className="text-caption">{t.compare.from}</span>
                <input type="date" aria-label={`${label} ${t.compare.from}`} value={span.from} max={today} onChange={(e) => e.target.value && set({ ...span, from: e.target.value })} className="rounded-xl px-2.5 py-2 text-control outline-none flex-1" style={{ ...inputStyle, minWidth: '9.5rem' }} />
                <span className="text-caption">{t.compare.to}</span>
                <input type="date" aria-label={`${label} ${t.compare.to}`} value={span.to} max={today} onChange={(e) => e.target.value && set({ ...span, to: e.target.value })} className="rounded-xl px-2.5 py-2 text-control outline-none flex-1" style={{ ...inputStyle, minWidth: '9.5rem' }} />
              </div>
            ))}
            {!compareValid && (
              <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }} aria-live="polite">
                {t.doctorReport.compareInvalid}
              </p>
            )}
          </div>
        )}
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
          {agendaInput === null && settings.consultation && ` ${t.consultation.reportFilled}`}
        </p>
      </Card>

      <Card>
        <SectionTitle>{t.doctorReport.optionsTitle}</SectionTitle>
        <div className="flex flex-col gap-3.5">
          <div>
            <p className="text-control font-medium mb-2">{t.doctorReport.languageTitle}</p>
            <Segmented
              label={t.doctorReport.languageTitle}
              options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
              value={language}
              onChange={setLanguage}
            />
          </div>
          {lastNote && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-control font-medium">{t.consultation.reportNoteToggle}</p>
              <Toggle checked={includeLastNote} onChange={setIncludeLastNote} label={t.consultation.reportNoteToggle} />
            </div>
          )}
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

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={exportPdf}
          disabled={!logged || exporting}
          aria-describedby={`${ids}-export-help`}
          className="btn-primary w-full"
        >
          <IconFileTypePdf size={18} aria-hidden />
          {exporting ? t.doctorReport.exporting : t.doctorReport.exportPdf}
        </button>
        {canPrint && (
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!logged}
            className="btn-secondary w-full"
          >
            <IconPrinter size={18} aria-hidden />
            {t.doctorReport.print}
          </button>
        )}
        <p id={`${ids}-export-help`} className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
          {t.doctorReport.exportHelper}
        </p>
        <p role="alert" className="text-caption text-center font-medium" style={{ color: 'var(--color-weather-5-text)' }}>
          {exportFailed ? t.doctorReport.exportFailed : ''}
        </p>
      </div>

      {data && logged > 0 && (
        <section aria-labelledby={`${ids}-preview`}>
          <h2 id={`${ids}-preview`} className="text-heading font-semibold px-1 mb-2">
            {t.doctorReport.preview}
          </h2>
          <ScaledPreview>
            <div ref={previewRef} className="report report-preview" lang={language}>
              <ReportDocument data={data} headingOffset={2} cuts={cuts} onCut={addCut} />
            </div>
          </ScaledPreview>
          {/* The copy that gets printed: full size, hidden on screen. */}
          {createPortal(
            <div className="report report-print" lang={language}>
              <ReportDocument data={data} cuts={cuts} />
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
