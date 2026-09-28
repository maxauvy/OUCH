import type { ReactNode } from 'react'
import './report.css'
import type { DailyEntry } from '../../db/types'
import { periodOn } from '../../lib/medications'
import {
  association,
  compareContext,
  daysWithRescueMedication,
  flares,
  meanOf,
  medicationReports,
  strengthIndex,
  tagShares,
  weeklyRows,
  type Association,
  type ContextComparison,
  type PainStats,
} from '../../lib/report'
import { PainCalendar, PainChart, PainHistogram, SmallMultiple, TreatmentTimeline } from './ReportCharts'
import { RELIEF_COLORS, rampColor } from './reportColors'
import { SYMPTOMS, type ReportData } from './reportData'

// Cited by number in the method sections and key points. Kept in their
// original language, as a bibliography would be.
const REFERENCES = [
  'Dworkin RH, Turk DC, Farrar JT, et al. Core outcome measures for chronic pain clinical trials: IMMPACT recommendations. Pain. 2005;113(1-2):9-19.',
  'Farrar JT, Young JP Jr, LaMoreaux L, Werth JL, Poole RM. Clinical importance of changes in chronic pain intensity measured on an 11-point numerical pain rating scale. Pain. 2001;94(2):149-158.',
  'Haute Autorité de santé. Douleur chronique : reconnaître le syndrome douloureux chronique, l’évaluer et orienter le patient. Recommandations professionnelles, décembre 2008.',
  'Dworkin RH, Turk DC, Wyrwich KW, et al. Interpreting the clinical importance of treatment outcomes in chronic pain clinical trials: IMMPACT recommendations. J Pain. 2008;9(2):105-121.',
  'Boonstra AM, Stewart RE, Köke AJA, et al. Cut-off points for mild, moderate, and severe pain on the numeric rating scale for pain in patients with chronic musculoskeletal pain. Front Psychol. 2016;7:1466.',
  'Broderick JE, Schwartz JE, Vikingstad G, et al. The accuracy of pain and fatigue items across different reporting periods. Pain. 2008;139(1):146-157.',
  'Dixon WG, Beukenhorst AL, Yimer BB, et al. How the weather affects the pain of citizen scientists using a smartphone app. NPJ Digit Med. 2019;2:105.',
]

/** The report as A4 page sections, to wrap in an element with class "report". */
export function ReportDocument({ data }: { data: ReportData }) {
  const { options, f, p } = data
  const pages = options.variant === 'gp' ? gpPages(data) : painClinicPages(data)
  const running = options.variant === 'gp' ? f.t.runningGp : f.t.runningPainClinic
  return (
    <>
      {pages.map((body, i) => (
        <section className="report-page" key={i}>
          <div className="r-running">
            <span>{['OUCH', running, options.patientName].filter(Boolean).join(' · ')}</span>
            <span className="num">
              {f.fullDate(p.start)} → {f.fullDate(p.end)}
            </span>
          </div>
          <div className="r-body">{body}</div>
          <div className="r-foot">
            <span>{f.format(f.t.footer, { date: f.fullDate(p.end) })}</span>
            <span className="num">{f.format(f.t.page, { n: i + 1, total: pages.length })}</span>
          </div>
        </section>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Variants

function gpPages(d: ReportData): ReactNode[] {
  const { f } = d
  return [
    <>
      <Header d={d} />
      <Agenda d={d} />
      <h2>{f.t.keyPoints}</h2>
      <KeyPoints d={d} />
      <h2>
        {f.t.keyFigures} <span className="r-hint">{f.t.keyFiguresHint}</span>
      </h2>
      <Tiles d={d} detailed={false} />
      <h2>
        {f.t.painChart} <span className="r-hint">{f.t.chartHint}</span>
      </h2>
      <PainChart entries={d.all} p={d.p} f={f} height={200} />
    </>,
    <>
      {d.meds.length > 0 && (
        <>
          <h2>{f.t.treatments}</h2>
          <TreatmentsTable d={d} detailed={false} />
        </>
      )}
      <div className="r-grid2 wide-left">
        <div>
          <h2>{f.t.symptoms}</h2>
          <SymptomsTable d={d} />
        </div>
        <div>
          <h2>{f.t.zones}</h2>
          <ZoneBars d={d} limit={6} />
        </div>
      </div>
      {d.options.includeNotes && <Notes d={d} all={false} />}
      <h2>{f.t.method}</h2>
      <div className="r-method">
        <p>{f.t.methodGp}</p>
      </div>
      <References count={3} title={f.t.references} />
    </>,
  ]
}

function painClinicPages(d: ReportData): ReactNode[] {
  const { f, p } = d
  const symptoms = SYMPTOMS.filter((s) => meanOf(d.current, s.key))
  return [
    <>
      <Header d={d} />
      <Completeness d={d} />
      <h2>{f.t.keyPoints}</h2>
      <KeyPoints d={d} />
      <h2>{f.t.intensity}</h2>
      <Tiles d={d} detailed />
      <h3>{f.t.distribution}</h3>
      <div className="r-legend">
        {d.painPrev && (
          <span>
            <i style={{ background: 'var(--r-prev)' }} />
            {f.format(f.t.distPrev, { n: d.painPrev.n })}
          </span>
        )}
        <span>
          <i style={{ background: 'var(--r-blue)' }} />
          {f.format(f.t.distCur, { n: d.pain?.n ?? 0 })}
        </span>
      </div>
      <PainHistogram prev={d.painPrev?.distribution ?? null} cur={d.pain?.distribution ?? []} f={f} />
      <PainStatsTable d={d} />
      <p className="r-small">{f.t.categoriesNote}</p>
    </>,
    <>
      <h2>
        {f.t.evolution} <span className="r-hint">{f.t.chartHint}</span>
      </h2>
      <h3>{f.t.painChart}</h3>
      <PainChart entries={d.all} p={p} f={f} height={170} />
      {d.meds.length > 0 && (
        <>
          <h3>{f.t.treatments}</h3>
          <div className="r-legend">
            <span>
              <i style={{ background: 'var(--r-blue)' }} />
              {f.t.timelineScheduled}
            </span>
            <span>
              <i style={{ background: 'var(--r-orange)' }} />
              {f.t.timelineAsNeeded}
            </span>
          </div>
          <TreatmentTimeline entries={d.all} meds={medicationReports(d.all, d.medications, p)} p={p} f={f} />
        </>
      )}
      {symptoms.length > 0 && <h3>{f.t.symptoms}</h3>}
      {symptoms.map((s, i) => {
        const [label, hint] = f.t.symptomLabels[s.key]
        const cur = meanOf(d.current, s.key)!
        const prev = meanOf(d.previous, s.key)
        const summary = prev ? `${f.format(f.t.before, { v: f.nf(prev.mean) })} → ${f.nf(cur.mean)}` : f.nf(cur.mean)
        return (
          <SmallMultiple
            key={s.key}
            entries={d.all}
            get={(e) => e[s.key]}
            label={label}
            hint={hint}
            max={s.max}
            summary={summary}
            last={i === symptoms.length - 1}
            p={p}
            f={f}
          />
        )
      })}
    </>,
    <>
      <Agenda d={d} />
      {d.meds.length > 0 && (
        <>
          <h2>
            {f.t.treatments} <span className="r-hint">{f.t.treatmentsSince}</span>
          </h2>
          <TreatmentsTable d={d} detailed />
          <h3>{f.t.weekly}</h3>
          <WeeklyTable d={d} />
        </>
      )}
      <NonDrug d={d} />
    </>,
    <>
      <h2>{f.t.calendar}</h2>
      <PainCalendar entries={d.all} p={p} f={f} />
      <div className="r-legend" style={{ marginTop: 4 }}>
        0
        {[0, 2, 4, 6, 8, 10].map((v) => (
          <i key={v} style={{ background: rampColor(v), marginRight: 0 }} />
        ))}
        10 ·
        <span>
          <i style={{ border: '1px dashed var(--r-axis)', background: 'none' }} />
          {f.t.notLogged}
        </span>
        <span>
          <i style={{ border: '1.5px solid var(--r-ink)', background: 'none' }} />
          {f.t.consultation}
        </span>
      </div>
      <h2>{f.t.zones}</h2>
      <ZoneBars d={d} limit={13} columns={2} />
      <p className="r-small">{f.t.zonesWpi}</p>
      <Associations d={d} />
    </>,
    <>
      {d.options.includeNotes && <Notes d={d} all />}
      <h2>{f.t.method}</h2>
      <div className="r-method">
        {[f.t.methodCollect, f.t.methodCalc, f.t.methodLimits].map((text) => {
          // "Collection. Daily diary…": the first word is a run-in heading.
          const cut = text.indexOf('. ') + 1
          return (
            <p key={cut + text.slice(0, 12)}>
              <b>{text.slice(0, cut)}</b>
              {text.slice(cut)}
            </p>
          )
        })}
      </div>
      <References count={REFERENCES.length} title={f.t.references} />
    </>,
  ]
}

// ---------------------------------------------------------------------------
// Blocks

function Header({ d }: { d: ReportData }) {
  const { f, p, options } = d
  return (
    <>
      <h1>{options.variant === 'gp' ? f.t.titleGp : f.t.titlePainClinic}</h1>
      <div className="r-sub">{f.t.subtitle}</div>
      <div className="r-id">
        <div>
          <div className="r-k">{f.t.patient}</div>
          <div className="r-v">
            {options.patientName || '—'}
            {options.birthDate && <small> · {f.format(f.t.bornOn, { date: f.fullDate(options.birthDate) })}</small>}
          </div>
        </div>
        <div>
          <div className="r-k">{f.t.period}</div>
          <div className="r-v num">
            {f.fullDate(p.start)} → {f.fullDate(p.end)} <small>· {f.format(f.t.periodDays, { n: p.periodDays })}</small>
          </div>
          <div className="r-note">{f.format(f.t.comparedTo, { n: p.periodDays })}</div>
        </div>
        <div>
          <div className="r-k">{f.t.logged}</div>
          <div className="r-v num">
            {d.current.length} / {p.periodDays} <small>· {f.pct(d.current.length / p.periodDays)}</small>
          </div>
          <div className="r-note">{f.format(f.t.loggedPrev, { n: d.previous.length, days: p.periodDays })}</div>
        </div>
      </div>
      <div className="r-caveat">{f.t.caveat}</div>
    </>
  )
}

function KeyPoints({ d }: { d: ReportData }) {
  const { f, pain, painPrev, p } = d
  if (!pain) return null
  const items: string[] = []

  if (painPrev && painPrev.mean > 0) {
    const delta = (pain.mean - painPrev.mean) / painPrev.mean
    items.push(
      `${f.format(f.t.painChange, { mean: f.nf(pain.mean), median: f.nfx(pain.median), prev: f.nf(painPrev.mean), delta: f.signedPct(delta) })} ${
        Math.abs(delta) >= 0.3 ? f.t.painChangeAbove : f.t.painChangeBelow
      }`
    )
  } else {
    items.push(f.format(f.t.painOnly, { mean: f.nf(pain.mean), median: f.nfx(pain.median) }))
  }

  const severeN = Math.round(pain.severe * pain.n)
  const severe = painPrev
    ? f.format(f.t.severeDays, { n: severeN, share: f.pct(pain.severe), prev: f.pct(painPrev.severe) })
    : f.format(f.t.severeDaysNoPrev, { n: severeN, share: f.pct(pain.severe) })
  const flareList = flares(d.current)
  const flareText = flareList.length
    ? f.format(f.t.flares, {
        n: flareList.length,
        list: flareList.map((r) => f.format(f.t.flareRange, { start: f.dayMonth(r.start), end: f.dayMonth(r.end) })).join(', '),
      })
    : f.t.flaresNone
  items.push(`${severe} ${flareText}`)

  // Treatment events inside the reported period, then what was reported about them.
  for (const m of d.meds) {
    m.med.periods.forEach((per, i) => {
      if (per.start >= p.start && per.start <= p.end) {
        items.push(
          i > 0
            ? f.format(f.t.doseChange, {
                name: m.med.name,
                from: f.posology(m.regimen, m.med.periods[i - 1]) || '?',
                to: f.posology(m.regimen, per) || '?',
                date: f.dayMonth(per.start),
              })
            : f.format(f.t.medStarted, { name: m.med.name, date: f.dayMonth(per.start) })
        )
      }
      const isLast = i === m.med.periods.length - 1
      if (isLast && per.end && per.end >= p.start && per.end <= p.end) {
        const reason = per.stopReason ? ` (${f.all.medications.stopReasons[per.stopReason].toLocaleLowerCase()})` : ''
        items.push(f.format(f.t.medStopped, { name: m.med.name, date: f.dayMonth(per.end), reason }))
      }
    })
    for (const [effect, dates] of m.sideEffects) {
      items.push(
        dates.length === 1
          ? f.format(f.t.sideEffectReportedOnce, { name: m.med.name, effect, date: f.dayMonth(dates[0]) })
          : f.format(f.t.sideEffectReported, { name: m.med.name, effect, n: dates.length, start: f.dayMonth(dates[0]), end: f.dayMonth(dates[dates.length - 1]) })
      )
    }
    if (m.regimen === 'scheduled' && m.daysMissed > 0) items.push(f.format(f.t.missedDoses, { name: m.med.name, n: m.daysMissed }))
  }

  const rescue = d.meds.filter((m) => m.regimen !== 'scheduled' && m.daysTaken > 0)
  if (rescue.length) {
    items.push(
      f.format(f.t.rescueDays, {
        n: daysWithRescueMedication(d.current, d.medications),
        total: d.current.length,
        list: rescue
          .map((m) =>
            m.daysWithoutCount === m.daysTaken
              ? f.format(f.t.rescueItemNoCount, { name: m.med.name, days: m.daysTaken })
              : f.format(f.t.rescueItem, { name: m.med.name, days: m.daysTaken, doses: m.doses })
          )
          .join(', '),
      })
    )
  }

  return (
    <ul className="r-key">
      {items.map((text, i) => (
        // An abbreviated month ends a sentence: "23 sept.." → "23 sept."
        <li key={i}>{text.replace(/\.\.(?=\s|$)/g, '.')}</li>
      ))}
    </ul>
  )
}

function Tile({ label, value, compare }: { label: string; value: ReactNode; compare?: string }) {
  return (
    <div className="r-tile">
      <div className="r-k">{label}</div>
      <div className="r-big">{value}</div>
      {compare && <div className="r-cmp">{compare}</div>}
    </div>
  )
}

function Tiles({ d, detailed }: { d: ReportData; detailed: boolean }) {
  const { f, pain, painPrev } = d
  if (!pain) return null
  const before = (v: string) => (painPrev ? f.format(f.t.before, { v }) : undefined)
  const sleep = meanOf(d.current, 'sleepHours')
  const sleepPrev = meanOf(d.previous, 'sleepHours')
  const quality = meanOf(d.current, 'sleepQuality')
  const tiles = [
    <Tile
      key="mean"
      label={f.t.tileMeanPain}
      value={
        <>
          {f.nf(pain.mean)}
          <small> /10</small>
        </>
      }
      compare={painPrev && painPrev.mean > 0 ? `${before(f.nf(painPrev.mean))} · ${f.signedPct((pain.mean - painPrev.mean) / painPrev.mean)}` : undefined}
    />,
    <Tile key="severe" label={f.t.tileSevere} value={f.pct(pain.severe)} compare={painPrev ? before(f.pct(painPrev.severe)) : undefined} />,
    <Tile key="mild" label={f.t.tileMild} value={f.pct(pain.mild)} compare={painPrev ? before(f.pct(painPrev.mild)) : undefined} />,
  ]
  if (sleep)
    tiles.push(
      <Tile
        key="sleep"
        label={f.t.tileSleep}
        value={
          <>
            {f.nf(sleep.mean)}
            <small> h</small>
          </>
        }
        compare={[sleepPrev && before(f.format(f.t.hours, { v: f.nf(sleepPrev.mean) })), quality && f.format(f.t.sleepQuality, { v: f.nf(quality.mean) })]
          .filter(Boolean)
          .join(' · ')}
      />
    )
  if (detailed)
    tiles.push(
      <Tile
        key="median"
        label={f.t.tileMedian}
        value={
          <>
            {f.nfx(pain.median)}
            <small>
              {' '}
              [{f.nf(pain.q1)}–{f.nf(pain.q3)}]
            </small>
          </>
        }
        compare={f.format(f.t.range, { min: pain.min, max: pain.max })}
      />,
      <Tile key="sd" label={f.t.tileVariability} value={f.nf(pain.sd)} compare={painPrev ? before(f.nf(painPrev.sd)) : undefined} />
    )
  return <div className={`r-tiles${detailed ? ' six' : ''}`}>{tiles}</div>
}

function PainStatsTable({ d }: { d: ReportData }) {
  const { f } = d
  const rows: [string, PainStats | null, DailyEntry[]][] = [
    [f.t.previousPeriod, d.painPrev, d.previous],
    [f.format(f.t.sinceConsultation, { date: f.dayMonth(d.p.start) }), d.pain, d.current],
  ]
  return (
    <table style={{ marginTop: 10 }}>
      <thead>
        <tr>
          <th>
            <span className="sr-only">{f.t.period}</span>
          </th>
          <th className="r">{f.t.colMeanSd}</th>
          <th className="r">{f.t.colMedianIqr}</th>
          <th className="r">{f.t.colMinMax}</th>
          <th className="r">≤ 3</th>
          <th className="r">4–6</th>
          <th className="r">≥ 7</th>
          <th className="r">{f.t.colFlares}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, s, entries]) => (
          <tr key={label}>
            <td>{label}</td>
            {s ? (
              <>
                <td className="r">
                  {f.nf(s.mean)} ({f.nf(s.sd)})
                </td>
                <td className="r">
                  {f.nfx(s.median)} [{f.nf(s.q1)}–{f.nf(s.q3)}]
                </td>
                <td className="r">
                  {s.min}–{s.max}
                </td>
                <td className="r">{f.pct(s.mild)}</td>
                <td className="r">{f.pct(s.moderate)}</td>
                <td className="r">{f.pct(s.severe)}</td>
                <td className="r">{flares(entries).length}</td>
              </>
            ) : (
              <td className="r" colSpan={7}>
                —
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Completeness({ d }: { d: ReportData }) {
  const { f, current } = d
  if (!current.length) return null
  const fields: [string, (e: DailyEntry) => unknown][] = [
    [f.t.symptomLabels.fatigueLevel[0], (e) => e.fatigueLevel],
    [f.t.symptomLabels.sleepQuality[0], (e) => e.sleepQuality],
    [f.t.symptomLabels.brainFog[0], (e) => e.brainFog],
    [f.t.symptomLabels.moodLevel[0], (e) => e.moodLevel],
    [f.t.symptomLabels.activityLevel[0], (e) => e.activityLevel],
    [f.all.factors.painLocations.label, (e) => e.painLocations?.length || undefined],
    [f.all.factors.medications.label, (e) => e.intakes?.length || undefined],
  ]
  const list = fields
    .map(([label, get]) => [label, current.filter((e) => get(e) !== undefined).length / current.length] as const)
    .filter(([, share]) => share > 0)
    .map(([label, share]) => `${label.toLocaleLowerCase()} ${f.pct(share)}`)
    .join(' · ')
  return list ? <p className="r-small">{f.format(f.t.completeness, { list })}</p> : null
}

function TreatmentsTable({ d, detailed }: { d: ReportData; detailed: boolean }) {
  const { f, p } = d
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>{f.t.colTreatment}</th>
            <th>{f.t.colPosology}</th>
            <th>{f.t.colUse}</th>
            <th>{f.t.colRelief}</th>
            <th>{f.t.colSideEffects}</th>
          </tr>
        </thead>
        <tbody>
          {d.meds.map((m) => {
            const current = periodOn(m.med, p.end) ?? m.med.periods[m.med.periods.length - 1]
            const index = current ? m.med.periods.indexOf(current) : -1
            const earlier = index > 0 && current.start > p.prevStart ? m.med.periods[index - 1] : undefined
            const ratedTotal = m.relief.reduce((a, b) => a + b, 0)
            const explicitDays = m.daysTaken + m.daysMissed
            return (
              <tr key={m.med.id}>
                <td>
                  <b>{m.med.name}</b>
                  <span className={`r-pill ${m.regimen}`}>{f.t.regimens[m.regimen]}</span>
                  {detailed && m.med.reason && <span className="sm">{m.med.reason}</span>}
                </td>
                <td>
                  {m.regimen === 'unspecified' ? (
                    <span className="r-faint">{f.t.notDescribed}</span>
                  ) : m.regimen === 'scheduled' ? (
                    <>
                      {f.posology(m.regimen, current) || '—'}
                      {earlier && earlier.end && (
                        <span className="sm">{f.format(f.t.until, { dose: f.posology(m.regimen, earlier), date: f.dayMonth(earlier.end) })}</span>
                      )}
                    </>
                  ) : (
                    <>
                      {current?.dose ? f.format(f.t.perIntake, { dose: f.posology(m.regimen, { ...current, perDay: undefined }) }) : '—'}
                      {current?.perDay && <span className="sm">{f.format(f.t.maxPrescribed, { n: current.perDay })}</span>}
                    </>
                  )}
                </td>
                <td>
                  {m.regimen === 'scheduled' ? (
                    <>
                      {f.format(f.t.takenDays, { n: m.daysTaken, total: explicitDays })}
                      {explicitDays > 0 && <span className="sm">{f.format(f.t.adherence, { v: f.pct(m.daysTaken / explicitDays) })}</span>}
                    </>
                  ) : m.daysWithoutCount === m.daysTaken ? (
                    f.format(f.t.usedDays, { days: m.daysTaken })
                  ) : (
                    <>
                      {f.format(f.t.prnUse, { days: m.daysTaken, doses: m.doses })}
                      <span className="sm">
                        {f.format(f.t.maxUsed, { n: m.maxDosesInADay })}
                        {current?.perDay && m.maxDosesInADay > current.perDay ? ` ${f.t.aboveMax}` : ''}
                      </span>
                      {m.daysWithoutCount > 0 && <span className="sm">{f.format(f.t.withoutCount, { n: m.daysWithoutCount })}</span>}
                    </>
                  )}
                </td>
                <td>
                  {m.regimen === 'scheduled' ? (
                    <span className="r-faint">{f.t.notAsked}</span>
                  ) : !ratedTotal ? (
                    '—'
                  ) : detailed ? (
                    <>
                      <div className="r-stack" aria-hidden>
                        {m.relief.map((n, level) => (n ? <span key={level} style={{ flex: n, background: RELIEF_COLORS[level] }} /> : null))}
                      </div>
                      <span className="sm">
                        {m.relief
                          .map((n, level) => (n ? `${f.t.reliefLevels[level]} ${n}` : ''))
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </>
                  ) : (
                    <>
                      {f.format(f.t.reliefModStrong, { v: f.pct((m.relief[2] + m.relief[3]) / ratedTotal) })}
                      <span className="sm">{f.t.ofIntakes}</span>
                    </>
                  )}
                </td>
                <td>
                  {m.sideEffects.size ? (
                    [...m.sideEffects].map(([effect, dates]) => `${effect} (${f.format(f.t.usedDays, { days: dates.length })})`).join(', ')
                  ) : (
                    <span className="r-faint">{f.t.none}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {detailed && d.meds.some((m) => m.relief.some(Boolean)) && (
        <div className="r-legend" style={{ marginTop: 6 }}>
          {f.t.reliefLegend}
          {f.t.reliefLevels.map((label, level) => (
            <span key={label}>
              <i style={{ background: RELIEF_COLORS[level] }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </>
  )
}

function WeeklyTable({ d }: { d: ReportData }) {
  const { f, p } = d
  const weeks = weeklyRows(d.current, p)
  // At most five medication columns: those actually taken, ongoing ones first.
  const columns = d.meds.filter((m) => m.daysTaken > 0).slice(0, 5)
  return (
    <table>
      <thead>
        <tr>
          <th>{f.t.colWeek}</th>
          <th className="r">{f.t.colDays}</th>
          <th className="r">{f.t.colMeanPain}</th>
          {columns.map((m) => (
            <th key={m.med.id} className="r">
              {m.med.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((w) => (
          <tr key={w.start}>
            <td className="num">
              {f.dayMonth(w.start)} – {f.dayMonth(w.end)}
            </td>
            <td className="r">
              {w.logged}/{w.days}
            </td>
            <td className="r">{w.meanPain === null ? '—' : f.nf(w.meanPain)}</td>
            {columns.map((m) => {
              const n = w.byMedication.get(m.med.id) ?? 0
              const dose = periodOn(m.med, w.start)?.dose
              const total = m.regimen === 'asNeeded' && dose && n ? ` (${f.nfx(n * dose.amount)} ${f.all.medications.units[dose.unit]})` : ''
              return (
                <td key={m.med.id} className="r">
                  {m.regimen === 'scheduled' ? `${n}/${w.logged}` : n}
                  {total && <span className="r-faint">{total}</span>}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SymptomsTable({ d }: { d: ReportData }) {
  const { f } = d
  const rows = SYMPTOMS.filter((s) => s.max === 10 && meanOf(d.current, s.key))
  if (!rows.length) return <p className="r-faint">—</p>
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>{f.t.colSymptom}</th>
            <th className="r">{f.t.colBefore}</th>
            <th className="r">{f.t.colPeriod}</th>
            <th className="r">{f.t.colDiff}</th>
            <th>{f.t.colTrend}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const [label, hint] = f.t.symptomLabels[s.key]
            const cur = meanOf(d.current, s.key)!
            const prev = meanOf(d.previous, s.key)
            const diff = prev ? cur.mean - prev.mean : null
            const trend =
              diff === null ? '—' : Math.abs(diff) < 0.5 ? f.t.trendStable : diff * s.better > 0 ? f.t.trendBetter : f.t.trendWorse
            return (
              <tr key={s.key}>
                <td>
                  {label}
                  <span className="sm">{hint}</span>
                </td>
                <td className="r">{prev ? f.nf(prev.mean) : '—'}</td>
                <td className="r">
                  <b>{f.nf(cur.mean)}</b>
                </td>
                <td className="r">{diff === null ? '—' : f.signed(diff, 1)}</td>
                <td>{trend}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="r-small">{f.t.symptomsNote}</p>
    </>
  )
}

function ZoneBars({ d, limit, columns = 1 }: { d: ReportData; limit: number; columns?: 1 | 2 }) {
  const { f } = d
  const shares = tagShares(d.current, (e) => e.painLocations).slice(0, limit)
  if (!shares.length) return <p className="r-faint">—</p>
  return (
    <>
      <div className={`r-bars${columns === 2 ? ' cols2' : ''}`}>
        {shares.map(([zone, share]) => (
          <div className="r-row" key={zone}>
            <span>{f.all.bodyZones[zone as keyof typeof f.all.bodyZones] ?? zone}</span>
            <div>
              <div className="r-fill" style={{ width: `${share * 100}%` }} />
            </div>
            <span className="r-pct">{f.pct(share)}</span>
          </div>
        ))}
      </div>
      <p className="r-small">{f.t.zonesNote}</p>
    </>
  )
}

function NonDrug({ d }: { d: ReportData }) {
  const { f } = d
  const shares = tagShares(d.current, (e) => e.positiveActions)
  if (!shares.length) return null
  return (
    <>
      <h2>
        {f.t.nonDrug} <span className="r-hint">{f.t.nonDrugHint}</span>
      </h2>
      <div className="r-bars wide">
        {shares.map(([action, share]) => (
          <div className="r-row" key={action}>
            <span>{action}</span>
            <div>
              <div className="r-fill" style={{ width: `${share * 100}%` }} />
            </div>
            <span className="r-pct">{f.pct(share)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function Agenda({ d }: { d: ReportData }) {
  const items = d.options.agenda.map((a) => a.trim()).filter(Boolean)
  if (!items.length) return null
  return (
    <>
      <h2>{d.f.t.agenda}</h2>
      <div className="r-quote">
        <ul>
          {items.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>
    </>
  )
}

function Notes({ d, all }: { d: ReportData; all: boolean }) {
  const { f } = d
  const withNotes = d.current.filter((e) => e.notes?.trim())
  const hard = withNotes.filter((e) => e.painLevel >= 6)
  const list = all ? withNotes : (hard.length ? hard : withNotes).slice(-3)
  if (!list.length) return null
  return (
    <>
      <h2>
        {f.t.notes} <span className="r-hint">{all ? f.t.notesHintAll : f.t.notesHintGp}</span>
      </h2>
      <ul className="r-notes">
        {list.map((e) => (
          <li key={e.date}>
            <span className="r-muted">{f.weekdayDate(e.date)}</span>
            <span className="num">{e.painLevel}/10</span>
            <span>{e.notes}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function Associations({ d }: { d: ReportData }) {
  const { f, all, options } = d
  const t = f.t
  const rows = [
    association(all, 'sleepQuality', (e) => e.sleepQuality),
    association(all, 'sleepHours', (e) => e.sleepHours),
    association(all, 'stress', (e) => e.stressLevel),
    association(all, 'activityPrev', (_, prev) => prev?.activityLevel),
    association(all, 'positiveActions', (e) => e.positiveActions?.length),
    association(all, 'pressure', (e) => e.weather?.pressureDeltaFromPrevious),
    association(all, 'fatigue', (e) => e.fatigueLevel),
  ].filter((a): a is Association => a !== null)

  const contexts = [
    compareContext(all, 'afterActive', (_, prev) => (prev?.activityLevel === undefined ? undefined : prev.activityLevel >= 8)),
    compareContext(all, 'actions', (e) => {
      const n = e.positiveActions?.length
      return n === undefined ? undefined : n >= 2 ? true : n === 0 ? false : undefined
    }),
    options.includeCycle && all.some((e) => e.periodDay) ? compareContext(all, 'period', (e) => !!e.periodDay) : null,
  ].filter((c): c is ContextComparison => c !== null)

  if (!rows.length && !contexts.length) return null
  const median = (v: number, n: number) => (
    <>
      {f.nfx(v)}/10 <span className="r-faint">(n = {n})</span>
    </>
  )
  return (
    <>
      <h2>{t.associations}</h2>
      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>{t.colFactor}</th>
              {/* Not uppercased like other headers: a capital rho reads as a P. */}
              <th className="r" style={{ textTransform: 'none' }}>
                ρ
              </th>
              <th aria-hidden>−1 · 0 · +1</th>
              <th>{t.colStrength}</th>
              <th className="r">n</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const key = a.key as keyof typeof t.factorLabels
              const note = t.factorNotes[key as keyof typeof t.factorNotes]
              return (
                <tr key={a.key}>
                  <td>
                    {t.factorLabels[key]}
                    {note && <span className="sm">{note}</span>}
                  </td>
                  <td className="r">{f.signed(a.rho, 2)}</td>
                  <td aria-hidden>
                    <svg viewBox="0 0 100 10" style={{ width: 100 }}>
                      <line x1={50} x2={50} y1={0} y2={10} stroke="var(--r-axis)" />
                      <rect x={a.rho < 0 ? 50 + a.rho * 50 : 50} y={2} width={Math.abs(a.rho) * 50} height={6} rx={2} fill={a.rho < 0 ? 'var(--r-blue)' : 'var(--r-orange)'} />
                    </svg>
                  </td>
                  <td>{t.strengths[strengthIndex(a.rho)]}</td>
                  <td className="r">{a.n}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {contexts.length > 0 && (
        <table style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>{t.contexts}</th>
              <th className="r">{t.yes}</th>
              <th className="r">{t.otherwise}</th>
            </tr>
          </thead>
          <tbody>
            {contexts.map((c) => (
              <tr key={c.key}>
                <td>{t.contextLabels[c.key as keyof typeof t.contextLabels]}</td>
                <td className="r">{median(c.withMedian, c.withN)}</td>
                <td className="r">{median(c.withoutMedian, c.withoutN)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="r-small">{t.associationsNote}</p>
    </>
  )
}

function References({ count, title }: { count: number; title: string }) {
  return (
    <>
      <h3>{title}</h3>
      <ol className="r-refs">
      {REFERENCES.slice(0, count).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
    </>
  )
}
