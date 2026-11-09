import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconArrowLeft, IconFileTypePdf, IconPencil, IconPrinter } from '@tabler/icons-react'
import { useAllEntries } from '../hooks/useEntries'
import { useMedications } from '../hooks/useMedications'
import { useSettings } from '../hooks/useSettings'
import { buildImagePdf } from '../lib/pdf'
import { capturePages } from '../lib/capturePages'
import { downloadBlob } from '../lib/backup'
import { careSheetData } from '../lib/careSheet'
import { todayISO } from '../lib/dates'
import { LANGUAGES, getTranslations, useLanguage, useTranslation, type Language } from '../i18n'
import { Segmented } from '../components/ui/Segmented'
import { CareSheetDocument, type CareSheetInput } from '../components/caresheet/CareSheetDocument'
import { CareSheetForm } from '../components/caresheet/CareSheetForm'
import '../components/report/report.css'

// An app installed from Safari on iPhone has no print dialog: window.print()
// does nothing there, so only the PDF is offered.
const canPrint = !(navigator as Navigator & { standalone?: boolean }).standalone

/** The sheet for a health professional who does not know the person: made from the journal, completed by the person, shown on screen, printed or saved as a PDF. */
export function CareSheetPage({ onBack }: { onBack: () => void }) {
  const t = useTranslation().careSheet
  const appLanguage = useLanguage()
  const settings = useSettings()
  const entries = useAllEntries()
  const medications = useMedications()
  const ids = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const [language, setLanguage] = useState<Language>(appLanguage)
  const [editing, setEditing] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [exportFailed, setExportFailed] = useState(false)
  const today = todayISO()
  const docT = getTranslations(language).careSheet

  // Arriving on a new screen: start at the top, and move focus to its title.
  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [])

  const data = useMemo(() => (entries && medications ? careSheetData({ entries, medications, today }) : null), [entries, medications, today])
  const input: CareSheetInput | null = data && {
    language,
    today,
    name: settings.displayName.trim(),
    birthDate: settings.birthDate,
    illnesses: settings.illnesses,
    illnessDetails: { status: settings.illnessStatus, otherName: settings.otherIllnessName, year: settings.illnessYear },
    data,
    info: settings.careSheet,
  }

  // Browsers name the saved PDF after the page title.
  useEffect(() => {
    const previous = document.title
    document.title = `${docT.title} ${today}`
    return () => {
      document.title = previous
    }
  }, [docT.title, today])

  // The PDF is made from a copy of the paper sheet laid out out of sight, only while it is being made.
  useEffect(() => {
    if (!capturing) return
    let live = true
    void (async () => {
      try {
        await document.fonts?.ready
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
        if (!captureRef.current) return
        const blob = buildImagePdf(await capturePages(captureRef.current), `${docT.title} ${today}`)
        const file = new File([blob], `${docT.title.replace(/\s+/g, '-').toLowerCase()}-${today}.pdf`, { type: 'application/pdf' })
        // On a phone the share sheet is the way to keep the file; a computer just downloads it.
        const phone = window.matchMedia('(pointer: coarse)').matches
        if (phone && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: docT.title })
            return
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return
            // Making the file can take long enough for the browser to stop counting the tap: download instead.
          }
        }
        downloadBlob(blob, file.name)
      } catch (e) {
        console.error(e)
        if (live) setExportFailed(true)
      } finally {
        if (live) setCapturing(false)
      }
    })()
    return () => {
      live = false
    }
  }, [capturing, docT.title, today])

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <div className="flex items-center gap-2 -ml-2">
        <button type="button" onClick={onBack} aria-label={t.back} className="w-11 h-11 rounded-[var(--radius-control)] flex items-center justify-center shrink-0" style={{ color: 'var(--color-brand)' }}>
          <IconArrowLeft size={22} aria-hidden />
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="text-title font-semibold outline-none">
          {t.title}
        </h1>
      </div>

      <p className="text-body px-1" style={{ color: 'var(--color-ink-muted)' }}>
        {t.intro}
      </p>

      <Segmented label={t.languageLabel} options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} value={language} onChange={setLanguage} />

      {input && <CareSheetDocument input={input} onAdd={() => setEditing(true)} />}

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setEditing(true)} className="btn-secondary w-full">
          <IconPencil size={18} aria-hidden />
          {t.edit}
        </button>
        <button type="button" onClick={() => { setExportFailed(false); setCapturing(true) }} disabled={!input || capturing} aria-describedby={`${ids}-help`} className="btn-primary w-full">
          <IconFileTypePdf size={18} aria-hidden />
          {capturing ? t.exporting : t.exportPdf}
        </button>
        {canPrint && (
          <button type="button" onClick={() => window.print()} disabled={!input} className="btn-secondary w-full">
            <IconPrinter size={18} aria-hidden />
            {t.print}
          </button>
        )}
        <p id={`${ids}-help`} className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
          {t.exportHelper}
        </p>
        <p role="alert" className="text-caption text-center font-medium" style={{ color: 'var(--color-weather-5-text)' }}>
          {exportFailed ? t.exportFailed : ''}
        </p>
      </div>

      {editing && <CareSheetForm info={settings.careSheet} onClose={() => setEditing(false)} />}

      {/* The copy that gets printed: full size, hidden on screen. */}
      {input &&
        createPortal(
          <div className="report report-print" lang={language}>
            <div className="report-page">
              <CareSheetDocument input={input} paper />
            </div>
          </div>,
          document.body
        )}
      {/* The copy the PDF is made from. */}
      {input &&
        capturing &&
        createPortal(
          <div ref={captureRef} className="report cs-capture" lang={language} aria-hidden="true">
            <div className="report-page">
              <CareSheetDocument input={input} paper />
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
