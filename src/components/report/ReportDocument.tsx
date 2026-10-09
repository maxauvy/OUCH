import { createContext, createElement, useContext, useLayoutEffect, useRef, type ReactNode } from 'react'
import './report.css'
import type { LoggedEntry } from '../../db/types'
import { periodOn } from '../../lib/medications'
import { formatIllnessList } from '../../lib/childView'
import {
  association,
  pressureChange,
  collapseDoublePeriod,
  compareContext,
  daysWithRescueMedication,
  meanOf,
  medicationReports,
  strengthIndex,
  tagShares,
  weeklyRows,
  type Association,
  type ContextComparison,
  type PainStats,
  type WeekRow,
} from '../../lib/report'
import type { FlareEpisode } from '../../lib/flares'
import type { TreatmentReview } from '../../lib/treatmentReview'
import { CONTEXT_KEYS, type ContextKey, type TreatmentEvent } from '../../lib/flareContext'
import { PainCalendar, PainChart, PainHistogram, SmallMultiple, TreatmentTimeline } from './ReportCharts'
import { MIX_COLORS, R, RELIEF_COLORS, rampColor } from './reportColors'
import { SYMPTOMS, type ReportData } from './reportData'
import type { ReportFormat } from './reportFormat'
import { REFERENCES } from '../../lib/references'
import { buildSheets, findCut, rowsBlock, type Block, type Cut } from './pagination'


/** The dashboard chart's viewBox width: its card's inner width in CSS pixels
 * (two thirds of the 182 mm text width, less the gap and padding), so the
 * chart prints at the same scale as the full-width ones. */
const DASH_CHART_WIDTH = 430

/** How many levels the report's headings sit below the page's own: 0 when
 * printed (the report is the whole document), 2 in the on-screen preview,
 * where it lives under the page title and the "Preview" heading. */
const HeadingOffset = createContext(0)

function H({ level, children }: { level: 1 | 2 | 3; children: ReactNode }) {
  const offset = useContext(HeadingOffset)
  return createElement(`h${Math.min(6, level + offset)}`, { className: `r-h${level}` }, children)
}

/** The report as A4 page sections, to wrap in an element with class "report".
 * `cuts` move overflowing content to continuation sheets; the instance given
 * `onCut` measures its sheets (so it must be laid out) and reports the next
 * cut needed, until everything fits. */
export function ReportDocument({
  data,
  headingOffset = 0,
  cuts = [],
  onCut,
}: {
  data: ReportData
  headingOffset?: number
  cuts?: Cut[]
  onCut?: (cut: Cut) => void
}) {
  const { options, f, p } = data
  const pages = options.variant === 'gp' ? gpPages(data) : painClinicPages(data)
  const running = options.variant === 'gp' ? f.t.runningGp : f.t.runningPainClinic
  const sheets = buildSheets(pages, cuts)
  const sectionRefs = useRef<HTMLElement[]>([])
  useLayoutEffect(() => {
    if (!onCut) return
    const cut = findCut(sectionRefs.current, sheets, cuts)
    if (cut) onCut(cut)
  })

  return (
    <HeadingOffset.Provider value={headingOffset}>
      {sheets.map((sheet, i) => (
        <section
          className="report-page"
          key={i}
          ref={(el) => {
            if (el) sectionRefs.current[i] = el
          }}
        >
          <div className="r-running">
            <span>
              OUCH · {running}
              {options.patientName && (
                <>
                  {' · '}
                  <span className="r-who">{options.patientName}</span>
                </>
              )}
            </span>
            <span className="num">
              {f.fullDate(p.start)} → {f.fullDate(p.end)}
            </span>
          </div>
          <div className="r-body">
            {sheet.parts.map((part) => (
              <div className="r-part" data-part key={`${part.page}-${part.block}-${part.from}`}>
                {part.node}
              </div>
            ))}
          </div>
          <div className="r-foot">
            <span>{f.format(f.t.footer, { date: f.fullDate(p.end) })}</span>
            <span className="num">{f.format(f.t.page, { n: i + 1, total: sheets.length })}</span>
          </div>
        </section>
      ))}
    </HeadingOffset.Provider>
  )
}

/** " (continued)" after the heading of a list or table split across sheets. */
function Continued({ f, on }: { f: ReportFormat; on: boolean }) {
  return on ? <span className="r-hint"> ({f.t.continued})</span> : null
}

// ---------------------------------------------------------------------------
// Variants

// Pages are lists of blocks, not rendered as arrays: each block is placed in
// its own keyed wrapper (see ReportDocument), so the blocks need no key.
/* oxlint-disable react/jsx-key */

function gpPages(d: ReportData): Block[][] {
  const { f } = d
  const keyPoints = keyPointItems(d)
  const notes = noteItems(d, false)
  return [
    [
      <Header d={d} />,
      <div className="r-dash">
        <div className="r-card r-chart">
          <H level={2}>{f.t.painChart}</H>
          <p className="r-small" style={{ marginTop: -4 }}>
            {f.t.chartHint}
            {chartFlares(d).length > 0 && f.t.chartHintFlares}
          </p>
          <PainChart entries={d.all} p={d.p} f={f} width={DASH_CHART_WIDTH} height={250} summary={painSummary(d)} flares={chartFlares(d)} />
        </div>
        <GpFigures d={d} />
        <DayMix d={d} />
      </div>,
      rowsBlock(keyPoints.length, (from, to, continued) => (
        <div className="r-card r-after-dash">
          <H level={2}>
            {f.t.keyPoints}
            <Continued f={f} on={continued} />
          </H>
          <KeyPointList items={keyPoints} from={from} to={to} />
        </div>
      )),
      <Agenda d={d} />,
    ],
    [
      d.meds.length > 0 &&
        rowsBlock(d.meds.length, (from, to, continued) => (
          <>
            <H level={2}>
              {f.t.treatments}
              <Continued f={f} on={continued} />
            </H>
            <TreatmentsTable d={d} detailed={false} from={from} to={to} />
          </>
        )),
      d.reviews.length > 0 && reviewBlock(d),
      <div className="r-grid2 wide-left">
        <div>
          <H level={2}>{f.t.symptoms}</H>
          <SymptomsTable d={d} />
        </div>
        <div>
          <H level={2}>{f.t.zones}</H>
          <ZoneBars d={d} limit={6} />
        </div>
      </div>,
      d.options.includeNotes && notes.length > 0 && rowsBlock(notes.length, (from, to, continued) => <Notes d={d} all={false} list={notes} from={from} to={to} continued={continued} />),
      <>
        <H level={2}>{f.t.method}</H>
        <div className="r-method">
          <p>{f.t.methodGp}</p>
        </div>
      </>,
      <References numbers={GP_REFERENCES} title={f.t.references} />,
    ],
  ]
}

function painClinicPages(d: ReportData): Block[][] {
  const { f, p } = d
  const symptoms = SYMPTOMS.filter((s) => meanOf(d.current, s.key))
  const keyPoints = keyPointItems(d)
  const weeks = weeklyRows(d.current, p)
  const notes = noteItems(d, true)
  return [
    [
      <Header d={d} />,
      <Completeness d={d} />,
      rowsBlock(keyPoints.length, (from, to, continued) => (
        <>
          <H level={2}>
            {f.t.keyPoints}
            <Continued f={f} on={continued} />
          </H>
          <KeyPointList items={keyPoints} from={from} to={to} />
        </>
      )),
      <>
        <H level={2}>{f.t.intensity}</H>
        <Tiles d={d} detailed />
      </>,
      <>
        <H level={3}>{f.t.distribution}</H>
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
      </>,
      <>
        <PainStatsTable d={d} />
        <p className="r-small">{f.t.categoriesNote}</p>
      </>,
    ],
    [
      <>
        <H level={2}>
          {f.t.evolution}{' '}
          <span className="r-hint">
            {f.t.chartHint}
            {chartFlares(d).length > 0 && f.t.chartHintFlares}
          </span>
        </H>
        <H level={3}>{f.t.painChart}</H>
        <PainChart entries={d.all} p={p} f={f} height={170} summary={painSummary(d)} flares={chartFlares(d)} />
      </>,
      d.flares.current.length > 0 &&
        rowsBlock(d.flares.current.length, (from, to, continued) => (
          <>
            <H level={3}>
              {f.t.flaresTitle}
              <Continued f={f} on={continued} />
            </H>
            <FlaresTable d={d} from={from} to={to} />
            {to === d.flares.current.length && <p className="r-small">{f.t.flaresTableNote}</p>}
          </>
        )),
      hasFlareContext(d) &&
        rowsBlock(d.flares.current.length, (from, to, continued) => (
          <>
            <H level={3}>
              {f.t.flareContextTitle}
              <Continued f={f} on={continued} />
            </H>
            <FlareContextTable d={d} from={from} to={to} />
            {to === d.flares.current.length && <p className="r-small">{f.t.flareContextNote}</p>}
          </>
        )),
      d.meds.length > 0 ? (
        <>
          <H level={3}>{f.t.treatments}</H>
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
      ) : (
        <>
          <H level={3}>{f.t.treatments}</H>
          <p className="r-small">{f.t.noTreatments}</p>
        </>
      ),
      d.reviews.length > 0 && reviewBlock(d),
      symptoms.length > 0 &&
        rowsBlock(symptoms.length, (from, to, continued) => (
          <>
            <H level={3}>
              {f.t.symptoms}
              <Continued f={f} on={continued} />
            </H>
            {symptoms.slice(from, to).map((s, i) => {
              const [label, hint] = f.t.symptomLabels[s.key]
              const cur = meanOf(d.current, s.key)!
              const prev = meanOf(d.previous, s.key)
              const summary = prev ? `${f.format(f.t.before, { v: f.nf(prev.mean) })} → ${f.nf(cur.mean)}` : f.nf(cur.mean)
              return (
                <div key={s.key} data-row>
                  <SmallMultiple
                    entries={d.all}
                    get={(e) => e[s.key]}
                    label={label}
                    hint={hint}
                    max={s.max}
                    summary={summary}
                    // The date axis goes under the last chart of each sheet.
                    last={from + i === to - 1}
                    p={p}
                    f={f}
                  />
                </div>
              )
            })}
          </>
        )),
    ],
    // Everything on this page is optional: with no agenda, no medication and
    // no positive action, it would print blank but for its header and footer.
    ...(agendaItems(d).length || d.meds.length || nonDrugShares(d).length
      ? [
          [
            <Agenda d={d} />,
            d.meds.length > 0 &&
              rowsBlock(d.meds.length, (from, to, continued) => (
                <>
                  <H level={2}>
                    {f.t.treatments} <span className="r-hint">{f.t.treatmentsSince}</span>
                    <Continued f={f} on={continued} />
                  </H>
                  <TreatmentsTable d={d} detailed from={from} to={to} />
                </>
              )),
            d.meds.length > 0 &&
              rowsBlock(weeks.length, (from, to, continued) => (
                <>
                  <H level={3}>
                    {f.t.weekly}
                    <Continued f={f} on={continued} />
                  </H>
                  <WeeklyTable d={d} weeks={weeks} from={from} to={to} />
                </>
              )),
            <NonDrug d={d} />,
          ],
        ]
      : []),
    [
      <>
        <H level={2}>{f.t.calendar}</H>
        <PainCalendar entries={d.all} p={p} f={f} />
        <div className="r-legend" style={{ marginTop: 4 }}>
          0
          {[0, 2, 4, 6, 8, 10].map((v) => (
            <i key={v} style={{ background: rampColor(v), marginRight: 0, boxShadow: v <= 3 ? 'inset 0 0 0 0.5px var(--r-prev)' : undefined }} />
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
      </>,
      <>
        <H level={2}>{f.t.zones}</H>
        <ZoneBars d={d} limit={13} columns={2} />
        <p className="r-small">{f.t.zonesWpi}</p>
      </>,
      <Associations d={d} />,
    ],
    [
      d.options.includeNotes && notes.length > 0 && rowsBlock(notes.length, (from, to, continued) => <Notes d={d} all list={notes} from={from} to={to} continued={continued} />),
      <>
        <H level={2}>{f.t.method}</H>
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
      </>,
      <References numbers={REFERENCES.map((_, i) => i + 1)} title={f.t.references} uses={f.t} />,
    ],
  ]
}

/* oxlint-enable react/jsx-key */

// ---------------------------------------------------------------------------
// Blocks

/** What the pain chart shows, in words: mean pain before and since. */
function painSummary({ f, pain, painPrev }: ReportData): string {
  const tile = f.t.tileMeanPain.toLocaleLowerCase()
  if (!pain) return ''
  return painPrev ? `${tile} ${f.format(f.t.before, { v: f.nf(painPrev.mean) })} → ${f.nf(pain.mean)}/10` : `${tile} ${f.nf(pain.mean)}/10`
}

function Header({ d }: { d: ReportData }) {
  const { f, p, options } = d
  return (
    <>
      <H level={1}>{options.variant === 'gp' ? f.t.titleGp : f.t.titlePainClinic}</H>
      <div className="r-sub">{f.t.subtitle}</div>
      <div className="r-id">
        <div>
          <div className="r-k">{f.t.patient}</div>
          <div className="r-v">
            {options.patientName || '—'}
            {options.birthDate && <small> · {f.format(f.t.bornOn, { date: f.fullDate(options.birthDate) })}</small>}
          </div>
          {options.illnesses.length > 0 && (
            <div className="r-note">
              {f.format(options.illnesses.length === 1 ? f.t.declaredIllness : f.t.declaredIllnesses, {
                list: formatIllnessList(options.language, options.illnesses),
              })}
            </div>
          )}
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

/** What the flare detection found in the reported period, in one or two sentences. */
function flareSentence(d: ReportData): string {
  const { f, p, flares } = d
  if (!flares.detectable) return f.t.flaresNotAssessable
  if (!flares.current.length) return f.t.flaresNone
  const longest = flares.current.reduce((a, b) => (b.days > a.days ? b : a))
  const prev = d.painPrev ? f.format(f.t.flaresPrev, { n: flares.previous.length, days: flares.previousDays }) : ''
  const sentences = [
    f.format(f.t.flares, { n: flares.current.length, days: flares.currentDays, share: f.pct(flares.currentDays / p.periodDays), prev }),
    f.format(f.t.flareLongest, {
      range: f.format(f.t.flareRange, { start: f.dayMonth(longest.start), end: f.dayMonth(longest.end) }),
      peak: longest.peak,
      base: f.nfx(longest.baseline),
    }),
  ]
  if (flares.current.some((e) => e.ongoing)) sentences.push(f.t.flareOngoing)
  return sentences.join(' ')
}

/** The key points, one sentence each. */
function keyPointItems(d: ReportData): string[] {
  const { f, pain, painPrev, p } = d
  if (!pain) return []
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
  items.push(severe, flareSentence(d))

  // Treatment events inside the reported period, then what was reported about them.
  for (const m of d.meds) {
    m.med.periods.forEach((per, i) => {
      if (per.start >= p.start && per.start <= p.end) {
        const [from, to] = f.posologyChange(m.regimen, m.med.periods[i - 1], per)
        items.push(
          i > 0
            ? f.format(f.t.doseChange, {
                name: m.med.name,
                from,
                to,
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

  // An abbreviated month ends a sentence: "23 sept.." → "23 sept."
  return items.map(collapseDoublePeriod)
}

function KeyPointList({ items, from, to }: { items: string[]; from: number; to: number }) {
  return (
    <ul className="r-key">
      {items.slice(from, to).map((text, i) => (
        <li key={from + i} data-row>
          {text}
        </li>
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

/** The GP dashboard's figures: mean pain, then sleep when it is logged, or
 * else the median. */
function GpFigures({ d }: { d: ReportData }) {
  const { f, pain, painPrev } = d
  if (!pain) return null
  const sleep = meanOf(d.current, 'sleepHours')
  const sleepPrev = meanOf(d.previous, 'sleepHours')
  const quality = meanOf(d.current, 'sleepQuality')
  return (
    <div className="r-card tint">
      <div className="r-kpi">
        <div className="r-k">{f.t.tileMeanPain}</div>
        <div className="r-big num">
          {f.nf(pain.mean)}
          <small> /10</small>
        </div>
        {painPrev && painPrev.mean > 0 && (
          <div className="r-cmp">
            {f.format(f.t.before, { v: f.nf(painPrev.mean) })} · {f.signedPct((pain.mean - painPrev.mean) / painPrev.mean)}
          </div>
        )}
      </div>
      {sleep ? (
        <div className="r-kpi">
          <div className="r-k">{f.t.tileSleep}</div>
          <div className="r-big num">
            {f.nf(sleep.mean)}
            <small> h</small>
          </div>
          <div className="r-cmp">
            {[sleepPrev && f.format(f.t.before, { v: f.format(f.t.hours, { v: f.nf(sleepPrev.mean) }) }), quality && f.format(f.t.sleepQuality, { v: f.nf(quality.mean) })]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
      ) : (
        <div className="r-kpi">
          <div className="r-k">{f.t.tileMedian}</div>
          <div className="r-big num">
            {f.nfx(pain.median)}
            <small>
              {' '}
              [{f.nf(pain.q1)}–{f.nf(pain.q3)}]
            </small>
          </div>
        </div>
      )}
    </div>
  )
}

/** Share of mild, moderate and severe days, with the previous period's. */
function DayMix({ d }: { d: ReportData }) {
  const { f, pain, painPrev } = d
  if (!pain) return null
  const rows = [
    [f.t.mixMild, pain.mild, painPrev?.mild],
    [f.t.mixModerate, pain.moderate, painPrev?.moderate],
    [f.t.mixSevere, pain.severe, painPrev?.severe],
  ] as const
  return (
    <div className="r-card">
      <div className="r-k">{f.t.dayMix}</div>
      <div className="r-mix" aria-hidden>
        {rows.map(([label, share], i) => (
          <span key={label} style={{ flex: share, background: MIX_COLORS[i] }} />
        ))}
      </div>
      <ul className="r-mix-rows">
        {rows.map(([label, share, prev], i) => (
          <li key={label}>
            <span>
              <i style={{ background: MIX_COLORS[i] }} aria-hidden />
              {label}
            </span>
            <span className="num">
              <b>{f.pct(share)}</b>
              {prev !== undefined && <span className="r-faint"> · {f.format(f.t.before, { v: f.pct(prev) })}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PainStatsTable({ d }: { d: ReportData }) {
  const { f } = d
  const rows: [string, PainStats | null, number | null][] = [
    [f.t.previousPeriod, d.painPrev, d.flares.detectable ? d.flares.previous.length : null],
    [f.format(f.t.sinceConsultation, { date: f.dayMonth(d.p.start) }), d.pain, d.flares.detectable ? d.flares.current.length : null],
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
        {rows.map(([label, s, flareCount]) => (
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
                <td className="r">{flareCount ?? '—'}</td>
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
  const fields: [string, (e: LoggedEntry) => unknown][] = [
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

/** Rows `from` to `to` of the treatments table; the legend goes with the last row. */
function TreatmentsTable({ d, detailed, from, to }: { d: ReportData; detailed: boolean; from: number; to: number }) {
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
          {d.meds.slice(from, to).map((m) => {
            const current = periodOn(m.med, p.end) ?? m.med.periods[m.med.periods.length - 1]
            const index = current ? m.med.periods.indexOf(current) : -1
            const earlier = index > 0 && current.start > p.prevStart ? m.med.periods[index - 1] : undefined
            const ratedTotal = m.relief.reduce((a, b) => a + b, 0)
            const explicitDays = m.daysTaken + m.daysMissed
            return (
              <tr key={m.med.id} data-row>
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
      {detailed && to === d.meds.length && d.meds.some((m) => m.relief.some(Boolean)) && (
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

/** Episodes drawn on the pain chart, previous period included. */
function chartFlares(d: ReportData): FlareEpisode[] {
  return [...d.flares.previous, ...d.flares.current]
}

function FlaresTable({ d, from, to }: { d: ReportData; from: number; to: number }) {
  const { f } = d
  return (
    <table className="r-flares">
      <thead>
        <tr>
          <th scope="col">{f.t.colFlareDates}</th>
          <th scope="col" className="r">{f.t.colFlareLength}</th>
          <th scope="col" className="r">{f.t.colFlarePeak}</th>
          <th scope="col" className="r">{f.t.colFlareUsual}</th>
          <th scope="col" className="r">{f.t.colFlareBack}</th>
          <th scope="col" className="r">{f.t.colFlareRescue}</th>
        </tr>
      </thead>
      <tbody>
        {d.flares.current.slice(from, to).map((e) => {
          const logged = d.all.filter((x) => x.date >= e.start && x.date <= e.end)
          return (
            <tr key={e.start} data-row>
              <th scope="row" className="num">{f.format(f.t.flareRange, { start: f.dayMonth(e.start), end: f.dayMonth(e.end) })}</th>
              <td className="r">{f.format(f.t.flareDays, { n: e.days })}</td>
              <td className="r">{e.peak}/10</td>
              <td className="r">{f.nfx(e.baseline)}</td>
              <td className="r">
                {e.ongoing ? f.t.flareBackOngoing : e.recoveryDays === null ? f.t.flareBackUnknown : f.format(f.t.flareDays, { n: e.recoveryDays })}
              </td>
              <td className="r">
                {d.medications.length ? f.format(f.t.flareRescue, { n: daysWithRescueMedication(logged, d.medications), total: logged.length }) : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Measures with at least one figure before some flare: one that is not
 * tracked would be a column of dashes. */
function contextKeys(d: ReportData): ContextKey[] {
  return CONTEXT_KEYS.filter((k) => d.flares.context.some((c) => c.values[k].window !== null || c.values[k].usual !== null))
}

/** Nothing to describe: no flare, or none with a figure or a treatment change. */
function hasFlareContext(d: ReportData): boolean {
  return d.flares.context.some((c) => c.events.length > 0) || (d.flares.current.length > 0 && contextKeys(d).length > 0)
}

/** The table of changes of background treatment, split between sheets by rows. */
function reviewBlock(d: ReportData) {
  const { f } = d
  return rowsBlock(d.reviews.length, (from, to, continued) => (
    <>
      <H level={3}>
        {f.t.reviewTitle}
        <Continued f={f} on={continued} />
      </H>
      <ReviewTable d={d} from={from} to={to} />
      {to === d.reviews.length && <p className="r-small">{f.t.reviewNote}</p>}
      {to === d.reviews.length && <ReviewUsual d={d} />}
    </>
  ))
}

/** How much two periods in a row usually differ for this patient, so that a
 * difference in the table can be read against it. Taken from the latest
 * review that has it. */
function ReviewUsual({ d }: { d: ReportData }) {
  const { f } = d
  const gap = [...d.reviews].reverse().find((r) => r.measures.pain.usualGap !== null)?.measures.pain.usualGap
  if (gap == null) return null
  return <p className="r-small">{f.format(f.t.reviewUsual, { gap: f.nf(gap), n: gap })}</p>
}

function ReviewTable({ d, from, to }: { d: ReportData; from: number; to: number }) {
  const { f } = d
  const pair = (c: { before: number | null; after: number | null }, show: (v: number) => string) =>
    c.before === null || c.after === null ? '—' : `${show(c.before)} → ${show(c.after)}`
  const perDay = (v: number) => f.format(f.t.reviewPerDay, { v: f.nf(v) })
  const asList = (events: TreatmentEvent[]) => events.map((e) => eventText(d, e).replace(/\.$/, '')).join(' ; ')
  const effects = (r: TreatmentReview) =>
    r.sideEffects.after.map((e) => f.format(f.t.reviewSideEffect, { effect: e.effect, n: e.days })).join(', ')
  return (
    <table className="r-reviews">
      <thead>
        <tr>
          <th scope="col">{f.t.colReviewChange}</th>
          <th scope="col" className="r">{f.t.colReviewPain}</th>
          <th scope="col" className="r">{f.t.colReviewFlares}</th>
          <th scope="col" className="r">{f.t.colReviewRescue}</th>
          <th scope="col" className="r">{f.t.colReviewDays}</th>
          <th scope="col">{f.t.colReviewNotes}</th>
        </tr>
      </thead>
      <tbody>
        {d.reviews.slice(from, to).map((r) => {
          const m = r.measures
          const notes = [
            r.status === 'tooFewDays' ? f.format(f.t.reviewTooFew, { before: r.nBefore, after: r.nAfter }) : null,
            r.status === 'inProgress' ? f.format(f.t.reviewInProgress, { n: r.daysAfter }) : null,
            r.alsoChanged.length ? f.format(f.t.reviewAlsoChanged, { list: asList(r.alsoChanged) }) : null,
            r.duringFlare ? f.t.reviewDuringFlare : null,
            r.comparable && r.sideEffects.after.length ? f.format(f.t.reviewSideEffects, { list: effects(r) }) : null,
          ].filter((x): x is string => x !== null)
          return (
            <tr key={`${r.event.med.id}-${r.event.kind}-${r.date}`} data-row>
              <th scope="row">{asList([r.event])}</th>
              <td className="r num">{pair(m.pain, f.nf)}</td>
              <td className="r num">{pair(m.flareDays, (v) => String(v))}</td>
              <td className="r num">{pair(m.rescue, perDay)}</td>
              <td className="r num">{`${r.nBefore} · ${r.nAfter}`}</td>
              <td>{notes.length ? notes.map((n) => <span key={n} className="sm-line">{n}</span>) : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function eventText(d: ReportData, ev: TreatmentEvent): string {
  const { f } = d
  const name = ev.med.name
  const date = f.dayMonth(ev.date)
  if (ev.kind === 'started') return f.format(f.t.medStarted, { name, date })
  if (ev.kind === 'doseChanged') {
    const [from, to] = f.posologyChange(ev.med.regimen, ev.previous, ev.period)
    return f.format(f.t.doseChange, { name, from, to, date })
  }
  const reason = ev.period.stopReason ? ` (${f.all.medications.stopReasons[ev.period.stopReason].toLocaleLowerCase()})` : ''
  return f.format(f.t.medStopped, { name, date, reason })
}

function FlareContextTable({ d, from, to }: { d: ReportData; from: number; to: number }) {
  const { f } = d
  const keys = contextKeys(d)
  const figure = (v: number | null) => (v === null ? '—' : f.nf(v))
  return (
    <table className="r-flare-context">
      <thead>
        <tr>
          <th scope="col">{f.t.colFlareStart}</th>
          {keys.map((k) => (
            <th key={k} scope="col" className="r">
              {f.t.symptomLabels[k][0]}
            </th>
          ))}
          <th scope="col">{f.t.colFlareTreatment}</th>
        </tr>
      </thead>
      <tbody>
        {d.flares.current.slice(from, to).map((e, i) => {
          const c = d.flares.context[from + i]!
          return (
            <tr key={e.start} data-row>
              <th scope="row" className="num">{f.dayMonth(e.start)}</th>
              {keys.map((k) => (
                <td key={k} className="r">
                  {figure(c.values[k].window)}
                  <span className="sm">{f.format(f.t.flareContextUsual, { v: figure(c.values[k].usual) })}</span>
                </td>
              ))}
              <td>
                {c.events.length === 0 ? '—' : c.events.map((ev) => <span key={`${ev.med.id}-${ev.kind}-${ev.date}`} className="sm-line">{collapseDoublePeriod(eventText(d, ev))}</span>)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function WeeklyTable({ d, weeks, from, to }: { d: ReportData; weeks: WeekRow[]; from: number; to: number }) {
  const { f } = d
  // At most five medication columns: those actually taken, ongoing ones first.
  const columns = d.meds.filter((m) => m.daysTaken > 0).slice(0, 5)
  return (
    <table className="r-weekly">
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
        {weeks.slice(from, to).map((w) => (
          <tr key={w.start} data-row>
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
              const total = m.regimen === 'asNeeded' && dose && n ? ` (${f.nfx(n * dose.amount)} ${f.unit(dose.unit, n * dose.amount)})` : ''
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

function nonDrugShares(d: ReportData) {
  return tagShares(d.current, (e) => e.positiveActions)
}

function NonDrug({ d }: { d: ReportData }) {
  const { f } = d
  const shares = nonDrugShares(d)
  if (!shares.length) return null
  return (
    <>
      <H level={2}>
        {f.t.nonDrug} <span className="r-hint">{f.t.nonDrugHint}</span>
      </H>
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

function agendaItems(d: ReportData): string[] {
  return d.options.agenda.map((a) => a.trim()).filter(Boolean)
}

function Agenda({ d }: { d: ReportData }) {
  const items = agendaItems(d)
  if (!items.length) return null
  return (
    <>
      <H level={2}>{d.f.t.agenda}</H>
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

/** Notes on the report: all of them, or the GP's last three on hard days. */
function noteItems(d: ReportData, all: boolean): LoggedEntry[] {
  const withNotes = d.current.filter((e) => e.notes?.trim())
  const hard = withNotes.filter((e) => e.painLevel >= 6)
  return all ? withNotes : (hard.length ? hard : withNotes).slice(-3)
}

function Notes({ d, all, list, from, to, continued }: { d: ReportData; all: boolean; list: LoggedEntry[]; from: number; to: number; continued: boolean }) {
  const { f } = d
  return (
    <>
      <H level={2}>
        {f.t.notes} <span className="r-hint">{all ? f.t.notesHintAll : f.t.notesHintGp}</span>
        <Continued f={f} on={continued} />
      </H>
      <ul className="r-notes">
        {list.slice(from, to).map((e) => (
          <li key={e.date} data-row>
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
    association(all, 'pressure', pressureChange(all)),
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
      <H level={2}>{t.associations}</H>
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
                      <line x1={50} x2={50} y1={0} y2={10} stroke={R.axis} />
                      <rect x={a.rho < 0 ? 50 + a.rho * 50 : 50} y={2} width={Math.abs(a.rho) * 50} height={6} rx={2} fill={a.rho < 0 ? R.blue : R.orange} />
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

/** Numbers (1-based) of the references the 2-page GP summary cites. Footnote
 * numbers are positions in REFERENCES, so the list keeps them with `value`. */
const GP_REFERENCES = [1, 2, 8, 9]

function References({
  numbers,
  title,
  uses,
}: {
  numbers: number[]
  title: string
  /** When given, each reference is followed by how OUCH uses it. */
  uses?: Pick<ReportData['f']['t'], 'referenceUses' | 'referenceUsesLabel'>
}) {
  return (
    <>
      <H level={3}>{title}</H>
      <ol className="r-refs">
      {numbers.map((n) => (
          <li key={n} value={n}>
            {REFERENCES[n - 1].citation}
            {uses && (
              <span className="r-ref-use">
                {uses.referenceUsesLabel} {uses.referenceUses[n - 1]}
              </span>
            )}
          </li>
        ))}
      </ol>
    </>
  )
}
