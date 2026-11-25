import { format as formatDate } from 'date-fns'
import { fr as dateFr, enUS as dateEn } from 'date-fns/locale'
import { GESTURES, enough, type MdphData, type MdphGestures, type MdphMonth } from '../../lib/mdph'
import { formatPosology } from '../../lib/medicationFormat'
import { IS_DEMO } from '../../lib/demoMode'
import { format, getTranslations, type Language } from '../../i18n'
import { frequencyClasses } from '../../lib/mdphCertificate'
import '../caresheet/caresheet.css'
import './mdph.css'

const INTL: Record<Language, string> = { fr: 'fr-FR', en: 'en-US' }

export interface MdphInput {
  language: Language
  today: string
  name: string
  data: MdphData
  gestures?: MdphGestures
  /** The illnesses as declared in Settings, as one sentence in the sheet's language */
  illnesses?: string
}

/**
 * The page for the doctor who fills in the MDPH certificate: what the journal
 * shows, in the order of the certificate's parts 3, 5 and 6, then what the
 * person declared for the form's part B2. Always a light sheet of paper, like
 * the sheet for a health professional, whose layout it shares.
 */
export function MdphDocument({ input, paper = false }: { input: MdphInput; paper?: boolean }) {
  const { language, today, name, data, gestures, illnesses } = input
  const t = getTranslations(language)
  const d = t.mdph.doc
  const intl = INTL[language]
  const locale = language === 'en' ? dateEn : dateFr
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale })
  const long = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMMM yyyy', { locale })
  const monthName = (m: MdphMonth) => new Date(`${m.month}-15T12:00:00`).toLocaleDateString(intl, { month: 'long', year: 'numeric' })
  const classes = frequencyClasses(data.months)
  // Part 6 of the certificate names some gestures itself: those are shown under its words, the others under the form's.
  const inCertificate = Object.keys(d.certGestures) as (keyof typeof d.certGestures)[]
  const declared = GESTURES.filter((g) => gestures?.[g] === 'often' || gestures?.[g] === 'sometimes')
  const certRows = declared.filter((g): g is (typeof inCertificate)[number] => (inCertificate as string[]).includes(g))
  const otherRows = declared.filter((g) => !(inCertificate as string[]).includes(g))
  const answer = (g: (typeof GESTURES)[number]) => t.mdph.answers[gestures![g]!]

  const rub = (title: string, ref: string, children: React.ReactNode) => (
    <div className="cs-rub">
      <h3 className="cs-rub-t">
        {title}
        <span className="md-ref">{ref}</span>
      </h3>
      <div>{children}</div>
    </div>
  )
  const row = (label: string, value: string) => (
    <tr key={label}>
      <td>{label}</td>
      <td className="md-n">{value}</td>
    </tr>
  )

  return (
    <article className={`cs md ${paper ? 'cs-paper' : ''}`} lang={language}>
      {IS_DEMO && <div className="cs-demo">{t.report.demoBand}</div>}
      <header className="cs-head md-head">
        <p className="cs-kicker">{d.heading}</p>
        <h2 className="cs-name md-title">{name ? format(d.titleNamed, { name }, language) : d.title}</h2>
        <p className="cs-meta">{format(d.meta, { from: long(data.start), to: long(today), logged: data.logged, span: data.span }, language)}</p>
      </header>
      <div className="cs-body">
        {illnesses &&
          rub(
            d.pathology,
            format(d.certPart, { n: 1 }, language),
            <>
              <p className="cs-line">{format(d.pathologyLine, { list: illnesses }, language)}</p>
              <p className="cs-line cs-sub">{d.pathologyNote}</p>
            </>
          )}
        {rub(
          d.frequency,
          format(d.certPart, { n: 3 }, language),
          <>
            <p className="cs-line">{d.classesIntro}</p>
            <table className="md-table">
              <tbody>
                {row(d.over15, format(d.monthsCount, { n: classes.over15 }, language))}
                {row(d.upTo15, format(d.monthsCount, { n: classes.upTo15 }, language))}
                {row(d.noneMonth, format(d.monthsCount, { n: classes.none }, language))}
              </tbody>
            </table>
            <table className="md-table">
              <thead>
                <tr>
                  <th scope="col">{d.month}</th>
                  <th scope="col" className="md-n">{d.logged}</th>
                  <th scope="col" className="md-n">{d.flareDays}</th>
                  <th scope="col" className="md-n">{d.strongDays}</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={m.month}>
                    <th scope="row">
                      {monthName(m)}
                      {m.calendarDays < new Date(Number(m.month.slice(0, 4)), Number(m.month.slice(5, 7)), 0).getDate() && <span className="cs-sub"> ({format(d.partialMonth, { n: m.calendarDays }, language)})</span>}
                    </th>
                    <td className="md-n">{m.logged}</td>
                    <td className="md-n">{m.flareDays}</td>
                    <td className="md-n">{m.strongDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {rub(
          d.evolution,
          format(d.certPart, { n: 3 }, language),
          data.flares.length ? (
            <p className="cs-line">
              {format(d.flaresSummary, { n: data.flares.length, total: data.flareDayCount }, language)}{' '}
              {data.flares.map((f) => format(d.flare, { from: day(f.start), to: f.ongoing ? d.ongoing : day(f.end), days: f.days }, language)).join(' · ')}
            </p>
          ) : (
            <p className="cs-line">{d.noFlare}</p>
          )
        )}
        {(data.treatments.length > 0 || data.effects.length > 0 || data.careDays > 0) &&
          rub(
            d.treatments,
            format(d.certPart, { n: 5 }, language),
            <>
              {data.treatments.map((m) => {
                const effects = data.effects.find((e) => e.name === m.name)
                const detail = [formatPosology(t, m.regimen, m.period, intl), m.regimen === 'asNeeded' ? d.asNeeded : '', effects?.effects.length ? `${d.effectsNoted} : ${effects.effects.join(', ')}` : ''].filter(Boolean).join(' · ')
                return (
                  <p key={m.name} className="cs-line">
                    <strong>{m.name}</strong> {detail && <span className="cs-sub">{detail}</span>}
                  </p>
                )
              })}
              {data.effects
                .filter((e) => e.stoppedForEffects && !data.treatments.some((m) => m.name === e.name))
                .map((e) => (
                  <p key={e.name} className="cs-line">
                    <strong>{e.name}</strong> <span className="cs-sub">{[d.stoppedForEffects, e.effects.join(', ')].filter(Boolean).join(' · ')}</span>
                  </p>
                ))}
              {data.careDays > 0 && <p className="cs-line">{format(d.careRow, { n: data.careDays }, language)}</p>}
            </>
          )}
        {(enough(data.nights) || enough(data.stiffness) || enough(data.interference) || data.sleep) &&
          rub(
            d.nights,
            d.nightsPart,
            <table className="md-table">
              <tbody>
                {enough(data.nights) && row(d.nightsRow, format(d.ofTracked, { n: data.nights.days, tracked: data.nights.tracked }, language))}
                {data.sleep && row(d.sleepRow, format(d.hours, { h: data.sleep.hours.toLocaleString(intl, { maximumFractionDigits: 1 }) }, language))}
                {enough(data.stiffness) && row(d.stiffnessRow, format(d.ofTracked, { n: data.stiffness.days, tracked: data.stiffness.tracked }, language))}
                {enough(data.interference) && row(d.interferenceRow, format(d.ofTracked, { n: data.interference.days, tracked: data.interference.tracked }, language))}
              </tbody>
            </table>
          )}
        {declared.length > 0 &&
          rub(
            d.gestures,
            format(d.certPart, { n: 6 }, language),
            <>
              {certRows.length > 0 && (
                <table className="md-table">
                  <thead>
                    <tr>
                      <th scope="col">{d.certRubric}</th>
                      <th scope="col" className="md-n">
                        {d.answer}
                      </th>
                    </tr>
                  </thead>
                  <tbody>{certRows.map((g) => row(d.certGestures[g], answer(g)))}</tbody>
                </table>
              )}
              {otherRows.length > 0 && (
                <>
                  <p className="cs-line" style={{ marginTop: 6 }}>
                    {d.otherGestures}
                  </p>
                  <table className="md-table">
                    <tbody>{otherRows.map((g) => row(t.mdph.gestures[g], answer(g)))}</tbody>
                  </table>
                </>
              )}
              <p className="cs-line cs-sub">{d.declared}</p>
            </>
          )}
      </div>
      <p className="cs-foot">{d.foot}</p>
    </article>
  )
}
