import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { format as formatDate } from 'date-fns'
import { IconArrowLeft, IconCheck, IconCopy, IconFileTypePdf, IconPrinter } from '@tabler/icons-react'
import { useAllEntries } from '../hooks/useEntries'
import { useMedications } from '../hooks/useMedications'
import { useSettings } from '../hooks/useSettings'
import { db, updateSettings } from '../db'
import { buildImagePdf } from '../lib/pdf'
import { capturePages } from '../lib/capturePages'
import { downloadBlob } from '../lib/backup'
import { todayISO } from '../lib/dates'
import { formatPosology } from '../lib/medicationFormat'
import { GESTURES, GESTURE_ANSWERS, MIN_TRACKED, PERIODS, cleanMdphGestures, mdphData, type MdphGesture, type MdphPeriod } from '../lib/mdph'
import { format, getTranslations, useLanguage, useLocale, useTranslation } from '../i18n'
import { fr as dateFr } from 'date-fns/locale'
import { Segmented } from '../components/ui/Segmented'
import { MdphDocument, type MdphInput } from '../components/mdph/MdphDocument'
import { MonthBars } from '../components/mdph/MonthBars'
import { ParcoursCard } from '../components/mdph/ParcoursCard'
import { b3Sentence, d1Sentence, monthLabeller } from '../components/mdph/sentences'
import '../components/report/report.css'

// An app installed from Safari on iPhone has no print dialog: window.print() does nothing there.
const canPrint = !(navigator as Navigator & { standalone?: boolean }).standalone

/** A card named after the box of the form or of the certificate it helps to fill in. */
function BoxCard({ box, title, anchor, children }: { box: string; title: string; anchor?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section id={anchor ? `mdph-${anchor}` : undefined} aria-labelledby={id} className="scroll-mt-20 rounded-[var(--radius-card)] p-4 flex flex-col gap-2" style={{ background: 'var(--color-surface)', border: 'var(--card-border, 1px solid var(--color-hairline))', boxShadow: 'var(--card-shadow)' }}>
      <span className="self-start text-caption font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
        {box}
      </span>
      <h2 id={id} className="text-body font-bold">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** A sentence to paste into the form, and the button that copies it. Keyed on the text, so « Copié » goes when the period changes it. */
function CopyText({ text }: { text: string }) {
  const t = useTranslation().mdph
  const ref = useRef<HTMLParagraphElement>(null)
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = () => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => setState('copied'))
      .catch(() => {
        // No clipboard: the text is selected, for the phone's own copy.
        const range = document.createRange()
        if (ref.current) range.selectNodeContents(ref.current)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
        setState('failed')
      })
  }
  return (
    <>
      <p ref={ref} className="text-body rounded-[14px] px-3 py-2.5 leading-[1.5] select-text" style={{ background: 'var(--color-brand-soft)' }}>
        {text}
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={copy} className="btn-secondary">
          {state === 'copied' ? <IconCheck size={18} aria-hidden /> : <IconCopy size={18} aria-hidden />}
          {state === 'copied' ? t.copied : t.copy}
        </button>
        <span role="status" className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {state === 'failed' ? t.copyFailed : ''}
        </span>
      </div>
    </>
  )
}

/** « Mon dossier MDPH »: the journal for the boxes of the request form and for the doctor who fills in the certificate. Everything is made on the phone; nothing is sent. */
export function MdphPage({ onBack }: { onBack: () => void }) {
  const i18n = useTranslation()
  const t = i18n.mdph
  const language = useLanguage()
  const { intlLocale, dateFnsLocale } = useLocale()
  const settings = useSettings()
  const entries = useAllEntries()
  const medications = useMedications()
  const ids = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const [months, setMonths] = useState<MdphPeriod>(12)
  const [capturing, setCapturing] = useState(false)
  const [exportFailed, setExportFailed] = useState(false)
  const today = todayISO()

  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [])

  const data = useMemo(() => (entries && medications ? mdphData({ entries, medications, today, months }) : null), [entries, medications, today, months])
  const gestures = cleanMdphGestures(settings.mdphGestures)
  const input: MdphInput | null = data && { language, today, name: settings.displayName.trim(), data, gestures }
  const long = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMMM yyyy', { locale: dateFnsLocale })
  const fileTitle = `${t.title} ${today}`
  // The texts written into the form are French whatever the app's language: the form is French.
  const formTexts = useMemo(() => {
    if (!data || data.logged < MIN_TRACKED) return null
    const fr = getTranslations('fr').mdph
    const from = formatDate(new Date(data.start + 'T00:00:00'), 'd MMMM yyyy', { locale: dateFr })
    return { b3: b3Sentence(data, fr, 'fr', from), d1: d1Sentence(data, fr, 'fr'), months }
  }, [data, months])

  // Browsers name the saved PDF after the page title.
  useEffect(() => {
    const previous = document.title
    document.title = fileTitle
    return () => {
      document.title = previous
    }
  }, [fileTitle])

  // The PDF is made from a copy of the paper sheet laid out out of sight, only while it is being made.
  useEffect(() => {
    if (!capturing) return
    let live = true
    void (async () => {
      try {
        await document.fonts?.ready
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
        if (!captureRef.current) return
        const blob = buildImagePdf(await capturePages(captureRef.current), fileTitle)
        const file = new File([blob], `${t.title.replace(/\s+/g, '-').toLowerCase()}-${today}.pdf`, { type: 'application/pdf' })
        const phone = window.matchMedia('(pointer: coarse)').matches
        if (phone && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: t.title })
            return
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return
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
  }, [capturing, fileTitle, t.title, today])

  // Read from the stored settings, not from this render: two quick taps must not write over each other.
  const answer = (g: MdphGesture, a: (typeof GESTURE_ANSWERS)[number]) =>
    void db.transaction('rw', db.settings, async () => {
      const stored = cleanMdphGestures((await db.settings.get(1))?.mdphGestures)
      await updateSettings({ mdphGestures: { ...stored, [g]: a } })
    })

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

      <ParcoursCard cardsShown={!!data && data.logged >= MIN_TRACKED} texts={formTexts} today={today} />

      <h2 className="section-title text-heading font-bold px-1 mt-2">{t.parcours.boxesTitle}</h2>

      <Segmented label={t.periodLabel} options={PERIODS.map((n) => ({ value: n, label: format(t.periodOption, { n }, language) }))} value={months} onChange={setMonths} />

      {data && (
        <p className="text-caption px-1" style={{ color: 'var(--color-ink-muted)' }}>
          {format(data.shorter ? t.spanShorter : t.span, { from: long(data.start), logged: data.logged, span: data.span }, language)}
        </p>
      )}

      {data && data.logged < MIN_TRACKED && <p className="text-body px-1">{t.tooFew}</p>}

      {data && data.logged >= MIN_TRACKED && (
        <>
          <BoxCard anchor="B3" box={format(t.refForm, { box: 'B3', page: 8 }, language)} title={t.b3Title}>
            <CopyText key={`b3-${months}`} text={b3Sentence(data, t, language, long(data.start))} />
          </BoxCard>

          <BoxCard anchor="D1" box={format(t.refForm, { box: 'D1', page: 13 }, language)} title={t.d1Title}>
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {t.d1Hint}
            </p>
            <CopyText key={`d1-${months}`} text={d1Sentence(data, t, language)} />
          </BoxCard>

          <BoxCard anchor="B2" box={format(t.refForm, { box: 'B2', page: '6-7' }, language)} title={t.b2Title}>
            <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>
              {t.b2Intro}
            </p>
            <div className="flex flex-col gap-2.5 mt-1">
              {GESTURES.map((g) => (
                <div key={g} role="radiogroup" aria-label={t.gestures[g]} className="flex items-center justify-between gap-2">
                  <span className="text-body min-w-0">{t.gestures[g]}</span>
                  <span className="flex gap-1 shrink-0">
                    {GESTURE_ANSWERS.map((a) => {
                      const on = gestures?.[g] === a
                      return (
                        <button
                          key={a}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => answer(g, a)}
                          className="text-caption font-semibold min-h-9 px-2.5 rounded-full"
                          style={on ? { background: 'var(--color-brand)', color: 'var(--color-on-brand)' } : { background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
                        >
                          {t.answers[a]}
                        </button>
                      )
                    })}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {t.b2Kept}
            </p>
          </BoxCard>

          <BoxCard box={format(t.refCert, { box: '3' }, language)} title={t.c3Title}>
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {data.flares.length ? t.c3Intro : t.c3None}
            </p>
            {data.flares.length > 0 && <MonthBars months={data.months} label={t.doc.chartLabel} lineLabel={format(t.doc.lineLabel, { n: 15 }, language)} monthLabel={monthLabeller(data.months, intlLocale)} />}
          </BoxCard>

          <BoxCard box={format(t.refCert, { box: '5' }, language)} title={t.c5Title}>
            {data.treatments.length === 0 && <p className="text-body">{t.c5None}</p>}
            {data.treatments.map((m) => {
              const effects = data.effects.find((e) => e.name === m.name)
              const detail = [formatPosology(i18n, m.regimen, m.period, intlLocale), m.regimen === 'asNeeded' ? t.doc.asNeeded : '', effects?.effects.length ? `${t.doc.effectsNoted} : ${effects.effects.join(', ')}` : ''].filter(Boolean).join(' · ')
              return (
                <p key={m.name} className="text-body">
                  <strong>{m.name}</strong>{' '}
                  {detail && (
                    <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                      {detail}
                    </span>
                  )}
                </p>
              )
            })}
            {data.effects
              .filter((e) => e.stoppedForEffects && !data.treatments.some((m) => m.name === e.name))
              .map((e) => (
                <p key={e.name} className="text-body">
                  <strong>{e.name}</strong>{' '}
                  <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                    {t.doc.stoppedForEffects}
                  </span>
                </p>
              ))}
            {data.careDays > 0 && <p className="text-body">{format(t.doc.careRow, { n: data.careDays }, language)}</p>}
          </BoxCard>

          <div className="flex flex-col gap-2">
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

          <h2 className="text-caption font-semibold px-1 mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {t.docPreview}
          </h2>
          {input && <MdphDocument input={input} />}
        </>
      )}

      {/* The copy that gets printed: full size, hidden on screen. */}
      {input &&
        createPortal(
          <div className="report report-print" lang={language}>
            <div className="report-page">
              <MdphDocument input={input} paper />
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
              <MdphDocument input={input} paper />
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
