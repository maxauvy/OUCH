import { useEffect, useId, useRef } from 'react'
import { IconFileDownload } from '@tabler/icons-react'
import { getTranslations, LANGUAGES, useLanguage, useTranslation, type Language } from '../../i18n'
import { startDemo } from '../../lib/demoSession'
import { AppLogo } from '../ui/AppLogo'
import { Acronym } from '../about/Acronym'
import { Card } from '../ui/Card'

// For a healthcare professional who opens OUCH on a patient's phone, or on
// their own, for the first time: what the app is, and the documents written
// for them. It sits on top of the setup, so nothing is saved by looking at it.

/** The PDFs in public/soignants/ (rebuilt by scripts/build-clinician-docs.sh), one per language. */
const DOCS = [
  { key: 'guide', file: 'lire-un-rapport' },
  { key: 'leaflet', file: 'plaquette' },
  { key: 'note', file: 'note-methodologique' },
] as const

const pdfUrl = (file: string, language: Language) => `${import.meta.env.BASE_URL}soignants/${file}.${language}.pdf`

export function ClinicianPage({ onBack }: { onBack: () => void }) {
  const t = useTranslation()
  const language = useLanguage()
  const ids = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const other = LANGUAGES.find((l) => l.code !== language)!

  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [])

  const c = t.clinician
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${ids}-title`}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'var(--look-bg, var(--color-paper))' }}
    >
      <div className="min-h-full flex justify-center px-5 pt-5">
        <div className="w-full max-w-sm flex flex-col gap-4 pb-8">
          <div className="flex items-center min-h-11">
            <button
              type="button"
              onClick={onBack}
              className="min-h-11 pr-2 text-control font-semibold underline underline-offset-4"
              style={{ color: 'var(--color-brand)' }}
            >
              {c.back}
            </button>
          </div>
          <AppLogo size={64} className="self-center" />
          <div className="text-center">
            <h1 id={`${ids}-title`} ref={headingRef} tabIndex={-1} className="text-title font-semibold outline-none">
              {c.title}
            </h1>
            <Acronym className="text-caption mt-1" />
          </div>
          <p className="text-control leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
            {c.intro}
          </p>

          <Card>
            <ul className="flex flex-col gap-4">
              {(Object.keys(c.points) as (keyof typeof c.points)[]).map((key) => (
                <li key={key}>
                  <p className="text-control font-semibold">{c.points[key].title}</p>
                  <p className="text-caption leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                    {c.points[key].body}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="text-heading font-semibold">{c.docsTitle}</h2>
            <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
              {c.docsHelper}
            </p>
            <ul className="flex flex-col gap-2">
              {DOCS.map(({ key, file }) => (
                <li key={key}>
                  <a
                    href={pdfUrl(file, language)}
                    download
                    className="flex items-center gap-3 min-h-11 rounded-[var(--radius-control)] px-3 py-2"
                    style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
                  >
                    <IconFileDownload size={22} aria-hidden="true" className="shrink-0" />
                    <span>
                      <span className="block text-control font-semibold">{c.docs[key].title}</span>
                      <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                        {c.docs[key].meta}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-caption mt-3" style={{ color: 'var(--color-ink-muted)' }}>
              {c.otherLanguage}{' '}
              {DOCS.map(({ key, file }, i) => (
                <span key={key}>
                  {i > 0 && ' · '}
                  <a
                    href={pdfUrl(file, other.code)}
                    download
                    lang={other.code}
                    className="underline underline-offset-2 font-medium"
                    style={{ color: 'var(--color-brand)' }}
                  >
                    {getTranslations(other.code).clinician.docs[key].title}
                  </a>
                </span>
              ))}
            </p>
          </Card>

          <Card>
            <h2 className="text-heading font-semibold">{c.demoTitle}</h2>
            <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
              {c.demoText}
            </p>
            <button
              type="button"
              onClick={() => startDemo(language)}
              className="w-full min-h-11 rounded-[var(--radius-control)] py-3 text-control font-semibold"
              style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
            >
              {c.demoButton}
            </button>
          </Card>
          <p className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
            {c.note}
          </p>
        </div>
      </div>
    </div>
  )
}
