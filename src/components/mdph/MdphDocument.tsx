import { format as formatDate } from 'date-fns'
import { fr as dateFr, enUS as dateEn } from 'date-fns/locale'
import { GESTURES, enough, type MdphData, type MdphGestures, type MdphMonth } from '../../lib/mdph'
import { formatPosology } from '../../lib/medicationFormat'
import { IS_DEMO } from '../../lib/demoMode'
import { format, getTranslations, type Language } from '../../i18n'
import { MonthBars } from './MonthBars'
import { monthLabeller } from './sentences'
import '../caresheet/caresheet.css'
import './mdph.css'

const INTL: Record<Language, string> = { fr: 'fr-FR', en: 'en-US' }

export interface MdphInput {
  language: Language
  today: string
  name: string
  data: MdphData
  gestures?: MdphGestures
}

/**
 * The page for the doctor who fills in the MDPH certificate: what the journal
 * shows, in the order of the certificate's parts 3, 5 and 6, then what the
 * person declared for the form's part B2. Always a light sheet of paper, like
 * the sheet for a health professional, whose layout it shares.
 */
export function MdphDocument({ input, paper = false }: { input: MdphInput; paper?: boolean }) {
  const { language, today, name, data, gestures } = input
  const t = getTranslations(language)
  const d = t.mdph.doc
  const intl = INTL[language]
  const locale = language === 'en' ? dateEn : dateFr
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale })
  const long = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMMM yyyy', { locale })
  const monthLabel = monthLabeller(data.months, intl)
  const monthName = (m: MdphMonth) => new Date(`${m.month}-15T12:00:00`).toLocaleDateString(intl, { month: 'long', year: 'numeric' })
  const often = GESTURES.filter((g) => gestures?.[g] === 'often').map((g) => t.mdph.gestures[g].toLocaleLowerCase(language))
  const sometimes = GESTURES.filter((g) => gestures?.[g] === 'sometimes').map((g) => t.mdph.gestures[g].toLocaleLowerCase(language))
  // Some gestures hold a comma (« vie sociale, loisirs »): a semicolon keeps them apart.
  const list = (items: string[]) => items.join(language === 'fr' ? ' ; ' : '; ')

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
    <tr>
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
        {rub(
          d.frequency,
          format(d.certPart, { n: 3 }, language),
          <>
            <MonthBars months={data.months} label={d.chartLabel} lineLabel={format(d.lineLabel, { n: 15 }, language)} monthLabel={monthLabel} ink="#1f1d44" muted="#5e5a80" bar="#8d86b8" />
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
        {(often.length > 0 || sometimes.length > 0) &&
          rub(
            d.gestures,
            d.formPart,
            <>
              {often.length > 0 && <p className="cs-line">{format(d.often, { list: list(often) }, language)}</p>}
              {sometimes.length > 0 && <p className="cs-line">{format(d.sometimes, { list: list(sometimes) }, language)}</p>}
              <p className="cs-line cs-sub">{d.declared}</p>
            </>
          )}
      </div>
      <p className="cs-foot">{d.foot}</p>
    </article>
  )
}
