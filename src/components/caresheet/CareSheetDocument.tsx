import { format as formatDate } from 'date-fns'
import { fr as dateFr, enUS as dateEn } from 'date-fns/locale'
import type { CareSheetInfo, Illness, IllnessDetails } from '../../db/types'
import { ageOn, painRange, type CareSheetData } from '../../lib/careSheet'
import { getIllnessLabel } from '../../lib/childView'
import { formatPosology } from '../../lib/medicationFormat'
import { IS_DEMO } from '../../lib/demoMode'
import { format, getTranslations, type Language } from '../../i18n'
import './caresheet.css'

const INTL: Record<Language, string> = { fr: 'fr-FR', en: 'en-US' }

/** The first letter up, for a name that opens a line; a name typed by the person stays as typed. */
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export interface CareSheetInput {
  language: Language
  today: string
  name: string
  birthDate?: string
  illnesses: Illness[]
  illnessDetails: IllnessDetails
  data: CareSheetData
  info?: CareSheetInfo
}

/**
 * The sheet: a band with the person, then rubrics, in the language chosen for
 * it. The same markup serves the screen and the paper copy; `onAdd`, only given
 * on screen, shows a prompt where the person has not said anything yet.
 */
export function CareSheetDocument({ input, paper = false, onAdd }: { input: CareSheetInput; paper?: boolean; onAdd?: () => void }) {
  const { language, today, name, birthDate, illnesses, illnessDetails, data, info } = input
  const t = getTranslations(language)
  const d = t.careSheet.doc
  const intl = INTL[language]
  const age = ageOn(birthDate, today)
  const filled = formatDate(new Date(today + 'T00:00:00'), 'd MMMM yyyy', { locale: language === 'en' ? dateEn : dateFr })
  // "Other" with no name typed says nothing to a reader: it is left out.
  const shownIllnesses = illnesses.filter((i) => i !== 'autre' || illnessDetails.otherName?.trim())
  const allergies = info?.allergies ?? []
  const contacts = info?.contacts ?? []
  const note = info?.note

  const illnessLine = (illness: Illness) => {
    const typed = illness === 'autre' ? illnessDetails.otherName?.trim() : undefined
    const label = typed || capital(getIllnessLabel(language, illness))
    const status = illnessDetails.status?.[illness]
    const year = status === 'diagnosed' ? illnessDetails.year?.[illness] : undefined
    const statusText = status === 'diagnosed' ? (year ? format(d.diagnosedIn, { year }, language) : d.diagnosed) : status === 'suspected' ? d.suspected : ''
    return { label, statusText }
  }

  const zones = data.zones.map((z) => t.bodyZones[z]).join(', ')
  const add = (label: string) =>
    onAdd && (
      <button type="button" className="cs-add" data-cs-add onClick={onAdd}>
        {label}
      </button>
    )

  const rub = (title: string, children: React.ReactNode) => (
    <div className="cs-rub">
      <h3 className="cs-rub-t">{title}</h3>
      <div>{children}</div>
    </div>
  )

  return (
    <article className={`cs ${paper ? 'cs-paper' : ''}`} lang={language}>
      {IS_DEMO && <div className="cs-demo">{t.report.demoBand}</div>}
      <header className="cs-head">
        <p className="cs-kicker">{d.heading}</p>
        {name && <h2 className="cs-name">{name}</h2>}
        <p className="cs-meta">
          {[age !== null ? format(d.age, { n: age }, language) : '', format(d.filledOn, { date: filled }, language)].filter(Boolean).join(' · ')}
        </p>
      </header>
      <div className="cs-body">
        {shownIllnesses.length > 0 &&
          rub(
            d.illnesses,
            shownIllnesses.map((i) => {
              const { label, statusText } = illnessLine(i)
              return (
                <p key={i} className="cs-line">
                  <strong>{label}</strong> {statusText && <span className="cs-sub">{statusText}</span>}
                </p>
              )
            })
          )}
        {data.treatments.length > 0 &&
          rub(
            d.treatments,
            data.treatments.map((m) => {
              const detail = [formatPosology(t, m.regimen, m.period, intl), m.regimen === 'asNeeded' ? d.asNeeded : ''].filter(Boolean).join(' · ')
              return (
                <p key={m.name} className="cs-line">
                  <strong>{m.name}</strong> {detail && <span className="cs-sub">{detail}</span>}
                </p>
              )
            })
          )}
        {(allergies.length > 0 || onAdd) &&
          rub(
            d.allergies,
            allergies.length > 0
              ? allergies.map((a) => (
                  <p key={a} className="cs-line">
                    <strong className="cs-mark">{a}</strong>
                  </p>
                ))
              : add(t.careSheet.addAllergies)
          )}
        {data.effects.length > 0 &&
          rub(
            d.sideEffects,
            data.effects.map((e) => (
              <p key={e.name} className="cs-line">
                <strong>{e.name}</strong>{' '}
                <span className="cs-sub">{[e.effects.join(', '), e.stoppedForEffects ? d.effectStopped : ''].filter(Boolean).join(' · ')}</span>
              </p>
            ))
          )}
        {(data.pain || zones) &&
          rub(
            d.pain,
            <>
              {data.pain && (
                <p className="cs-line">
                  <strong>{format(d.painUsual, { range: painRange(data.pain, d.rangeTo) }, language)}</strong> <span className="cs-sub">{d.painUsualNote}</span>
                </p>
              )}
              {zones && <p className="cs-line cs-sub">{format(d.painZones, { list: zones }, language)}</p>}
            </>
          )}
        {data.helpers.length > 0 && rub(d.helps, <p className="cs-line">{data.helpers.join(', ')}</p>)}
        {(note || onAdd) && rub(d.note, note ? <p className="cs-line cs-note">{note}</p> : add(t.careSheet.addNote))}
        {(contacts.length > 0 || onAdd) &&
          rub(
            d.contacts,
            contacts.length > 0
              ? contacts.map((c, i) => (
                  <p key={i} className="cs-line">
                    {c.label}
                    {c.phone && (
                      <>
                        {' · '}
                        {onAdd ? (
                          <a className="cs-tel" href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>
                            <strong>{c.phone}</strong>
                          </a>
                        ) : (
                          <strong>{c.phone}</strong>
                        )}
                      </>
                    )}
                  </p>
                ))
              : add(t.careSheet.addContacts)
          )}
      </div>
      <p className="cs-foot">{d.disclaimer}</p>
    </article>
  )
}
