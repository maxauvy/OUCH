import type { DailyEntry } from '../../db/types'
import type { FlareEpisode } from '../../lib/flares'
import { shiftISO } from '../../lib/medications'
import { rollingMean, type ReportPeriods } from '../../lib/report'
import type { MedicationReport } from '../../lib/report'
import { periodOn } from '../../lib/medications'
import type { ReportFormat } from './reportFormat'
import { R, rampColor } from './reportColors'

// Every time chart shares this frame, so pain, treatments and symptoms line
// up day for day when stacked. viewBox units; the SVG scales to the page.
const W = 680
const LEFT = 34
const RIGHT = 12

// `w` narrows the frame for a chart that only gets part of the page's width
// (the GP dashboard), so its text keeps its printed size.
function frame(p: ReportPeriods, w = W) {
  const x = (i: number) => LEFT + (i * (w - LEFT - RIGHT)) / Math.max(1, p.totalDays - 1)
  // Where the previous period ends and the reported one begins.
  const split = (x(p.periodDays - 1) + x(p.periodDays)) / 2
  return { x, split }
}

function linePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = ''
  let pen = false
  values.forEach((v, i) => {
    if (v === null) {
      pen = false
      return
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`
    pen = true
  })
  return d
}

function XTicks({ p, f, y, w = W }: { p: ReportPeriods; f: ReportFormat; y: number; w?: number }) {
  const { x } = frame(p, w)
  // Ticks on the 1st and 15th only while they have room.
  const everyFortnight = (p.totalDays * W) / w <= 120
  const ticks: { i: number; date: string }[] = []
  for (let i = 0; i < p.totalDays; i++) {
    const date = shiftISO(p.prevStart, i)
    const day = Number(date.slice(8))
    if (day === 1 || (everyFortnight && day === 15)) ticks.push({ i, date })
  }
  return (
    <g>
      {ticks.map(({ i, date }) => (
        <g key={date}>
          <line x1={x(i)} x2={x(i)} y1={y} y2={y + 4} stroke={R.axis} />
          <text x={x(i)} y={y + 15} fontSize={10} fill={R.faint} textAnchor="middle">
            {f.dayMonth(date)}
          </text>
        </g>
      ))}
    </g>
  )
}

function PeriodBand({ p, top, bottom, labels, f, w = W }: { p: ReportPeriods; top: number; bottom: number; labels?: boolean; f: ReportFormat; w?: number }) {
  const { split } = frame(p, w)
  return (
    <g>
      <rect x={LEFT} y={top} width={split - LEFT} height={bottom - top} fill={R.band} />
      <line x1={split} x2={split} y1={top - (labels ? 14 : 0)} y2={bottom} stroke={R.ink} strokeDasharray="3 3" />
      {labels && (
        <>
          <text x={LEFT + 4} y={top - 5} fontSize={10} fill={R.muted}>
            {f.t.previousPeriod}
          </text>
          <text x={split + 5} y={top - 5} fontSize={10} fill={R.ink} fontWeight={600}>
            {f.format(f.t.sinceConsultation, { date: f.dayMonth(p.start) })}
          </text>
        </>
      )}
    </g>
  )
}

export function PainChart({
  entries,
  p,
  f,
  height = 190,
  width = W,
  summary,
  flares = [],
}: {
  entries: DailyEntry[]
  p: ReportPeriods
  f: ReportFormat
  height?: number
  /** viewBox width: the page's by default, less for a chart set in a column */
  width?: number
  /** Read by screen readers instead of the plot, e.g. the means per period */
  summary: string
  /** Episodes to shade behind the data */
  flares?: FlareEpisode[]
}) {
  const { x } = frame(p, width)
  const top = 20
  const bottom = height - 22
  const y = (v: number) => top + ((10 - v) * (bottom - top)) / 10
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${f.t.painChart} : ${summary}${flares.length ? f.format(f.t.chartSummaryFlares, { n: flares.length }) : ''}`}>
      <PeriodBand p={p} top={top} bottom={bottom} labels f={f} w={width} />
      {/* Tint plus a solid rule on top, so a flare still shows in greyscale. */}
      {flares.map((e) => {
        const x0 = x(p.dayIndex(e.start) - 0.5)
        const x1 = x(p.dayIndex(e.end) + 0.5)
        return (
          <g key={e.start}>
            <rect x={x0} y={top} width={x1 - x0} height={bottom - top} fill={R.orange} opacity={0.14} />
            <line x1={x0} x2={x1} y1={top} y2={top} stroke={R.orange} strokeWidth={2.5} />
          </g>
        )
      })}
      {[0, 2, 4, 6, 8, 10].map((v) => (
        <g key={v}>
          <line x1={LEFT} x2={width - RIGHT} y1={y(v)} y2={y(v)} stroke={R.hair} />
          <text x={LEFT - 6} y={y(v) + 3.5} fontSize={10} fill={R.faint} textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      <line x1={LEFT} x2={width - RIGHT} y1={y(7)} y2={y(7)} stroke={R.severe} strokeDasharray="3 3" />
      {entries.map((e) => (
        <circle key={e.date} cx={x(p.dayIndex(e.date))} cy={y(e.painLevel)} r={2.75} fill={R.blue350}>
          <title>{`${f.dayMonth(e.date)} : ${e.painLevel}/10`}</title>
        </circle>
      ))}
      <path d={linePath(rollingMean(entries, (e) => e.painLevel, p), x, y)} fill="none" stroke={R.blue550} strokeWidth={2} strokeLinejoin="round" />
      <line x1={LEFT} x2={width - RIGHT} y1={bottom} y2={bottom} stroke={R.axis} />
      {/* A white outline keeps the label readable over the data, drawn
          after it for that reason. */}
      <text x={width - RIGHT} y={y(7) - 4} fontSize={10} fill={R.severe} textAnchor="end" stroke="#fff" strokeWidth={3} paintOrder="stroke">
        {f.t.severeThreshold}
      </text>
      <XTicks p={p} f={f} y={bottom} w={width} />
    </svg>
  )
}

export function SmallMultiple({
  entries,
  get,
  label,
  hint,
  max = 10,
  summary,
  last,
  p,
  f,
}: {
  entries: DailyEntry[]
  get: (e: DailyEntry) => number | undefined
  label: string
  hint: string
  max?: number
  summary: string
  last?: boolean
  p: ReportPeriods
  f: ReportFormat
}) {
  const { x } = frame(p)
  const height = last ? 78 : 60
  const top = 16
  const bottom = height - (last ? 22 : 4)
  const y = (v: number) => top + ((max - v) * (bottom - top)) / max
  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`${label} (${hint}) : ${summary}`}>
      <PeriodBand p={p} top={top} bottom={bottom} f={f} />
      <text x={0} y={10} fontSize={11} fontWeight={600} fill={R.ink}>
        {label}
        <tspan fontWeight={400} fill={R.faint} fontSize={10}>{`  ${hint}`}</tspan>
      </text>
      <text x={W - RIGHT} y={10} fontSize={10.5} fill={R.muted} textAnchor="end">
        {summary}
      </text>
      <line x1={LEFT} x2={W - RIGHT} y1={y(0)} y2={y(0)} stroke={R.axis} />
      <line x1={LEFT} x2={W - RIGHT} y1={y(max)} y2={y(max)} stroke={R.hair} />
      <text x={LEFT - 6} y={y(0) + 3} fontSize={9.5} fill={R.faint} textAnchor="end">
        0
      </text>
      <text x={LEFT - 6} y={y(max) + 3} fontSize={9.5} fill={R.faint} textAnchor="end">
        {max}
      </text>
      {entries.map((e) => {
        const v = get(e)
        return typeof v === 'number' ? (
          <circle key={e.date} cx={x(p.dayIndex(e.date))} cy={y(Math.min(max, v))} r={2} fill={R.blue350}>
            <title>{`${f.dayMonth(e.date)} : ${v}`}</title>
          </circle>
        ) : null
      })}
      <path d={linePath(rollingMean(entries, get, p).map((v) => (v === null ? null : Math.min(max, v))), x, y)} fill="none" stroke={R.blue550} strokeWidth={2} strokeLinejoin="round" />
      {last && <XTicks p={p} f={f} y={bottom} />}
    </svg>
  )
}

export function TreatmentTimeline({ entries, meds, p, f }: { entries: DailyEntry[]; meds: MedicationReport[]; p: ReportPeriods; f: ReportFormat }) {
  const { x } = frame(p)
  const rowH = 30
  const top = 6
  const rows = meds.filter((m) => m.regimen !== 'unspecified' || m.daysTaken > 0)
  const height = top + rows.length * rowH + 22
  const dayW = (W - LEFT - RIGHT) / Math.max(1, p.totalDays - 1)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={f.t.treatments}>
      <PeriodBand p={p} top={top} bottom={top + rows.length * rowH} f={f} />
      {rows.map((m, r) => {
        const y0 = top + r * rowH
        const barY = y0 + 14
        const barH = 12
        const current = periodOn(m.med, p.end) ?? m.med.periods[m.med.periods.length - 1]
        const label =
          m.regimen === 'asNeeded' && current?.dose
            ? `${m.med.name} · ${f.posology(m.med.regimen, current)}`
            : m.med.name
        const max = current?.perDay || Math.max(1, m.maxDosesInADay)
        return (
          <g key={m.med.id}>
            <text x={LEFT + 4} y={y0 + 10} fontSize={10.5} fill={R.ink} fontWeight={600}>
              {label}
            </text>
            <line x1={LEFT} x2={W - RIGHT} y1={barY + barH} y2={barY + barH} stroke={R.hair} />
            {m.regimen === 'scheduled'
              ? m.med.periods.map((per) => {
                  const a = Math.max(0, p.dayIndex(per.start))
                  const b = Math.min(p.totalDays - 1, per.end ? p.dayIndex(per.end) : p.totalDays - 1)
                  if (b < 0 || a > p.totalDays - 1 || b < a) return null
                  const x1 = x(a) - (a === 0 ? 0 : dayW / 2)
                  const x2 = x(b) + (b === p.totalDays - 1 ? 0 : dayW / 2)
                  const text = f.posology('scheduled', per)
                  return (
                    <g key={per.start}>
                      <rect x={x1 + 1} y={barY} width={Math.max(2, x2 - x1 - 2)} height={barH} rx={3} fill={R.blue}>
                        <title>{`${m.med.name} ${text}`}</title>
                      </rect>
                      {x2 - x1 > text.length * 5.5 + 12 && (
                        <text x={x1 + 7} y={barY + 9.5} fontSize={9.5} fill="#fff" fontWeight={600}>
                          {text}
                        </text>
                      )}
                    </g>
                  )
                })
              : null}
            {entries.map((e) =>
              (e.intakes ?? [])
                .filter((i) => i.medicationId === m.med.id)
                .map((i) => {
                  const cx = x(p.dayIndex(e.date))
                  if (m.regimen === 'scheduled') {
                    return i.doses === 0 ? (
                      <rect key={e.date} x={cx - 1.5} y={barY - 1} width={3} height={barH + 2} fill="#fff" />
                    ) : null
                  }
                  const h = Math.max(3, (barH * Math.min(max, i.doses ?? 1)) / max)
                  return (
                    <rect key={e.date} x={cx - 2.5} y={barY + barH - h} width={5} height={h} rx={1} fill={R.orange}>
                      <title>{`${f.dayMonth(e.date)} : ${i.doses ?? '?'}`}</title>
                    </rect>
                  )
                })
            )}
          </g>
        )
      })}
      <XTicks p={p} f={f} y={top + rows.length * rowH} />
    </svg>
  )
}

export function PainHistogram({ prev, cur, f }: { prev: number[] | null; cur: number[]; f: ReportFormat }) {
  const height = 130
  const top = 8
  const bottom = height - 22
  const groupW = (W - LEFT - RIGHT) / 11
  const max = Math.max(0.3, ...cur, ...(prev ?? []))
  const y = (v: number) => top + (bottom - top) * (1 - v / max)
  const grid: number[] = []
  for (let g = 0.1; g <= max + 1e-9; g += 0.1) grid.push(g)
  const barW = Math.min(18, groupW / 2 - 3)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={f.t.distribution}>
      {grid.map((g) => (
        <g key={g}>
          <line x1={LEFT} x2={W - RIGHT} y1={y(g)} y2={y(g)} stroke={R.hair} />
          <text x={LEFT - 6} y={y(g) + 3.5} fontSize={10} fill={R.faint} textAnchor="end">
            {f.pct(g)}
          </text>
        </g>
      ))}
      {cur.map((c, level) => {
        const cx = LEFT + level * groupW + groupW / 2
        const pv = prev?.[level] ?? 0
        return (
          <g key={level}>
            {pv > 0 && (
              <rect x={cx - barW - 1} y={y(pv)} width={barW} height={y(0) - y(pv)} rx={3} fill={R.prev}>
                <title>{`${f.t.previousPeriod}, ${level}/10 : ${f.pct(pv)}`}</title>
              </rect>
            )}
            {c > 0 && (
              <rect x={prev ? cx + 1 : cx - barW / 2} y={y(c)} width={barW} height={y(0) - y(c)} rx={3} fill={R.blue}>
                <title>{`${level}/10 : ${f.pct(c)}`}</title>
              </rect>
            )}
            <text x={cx} y={height - 6} fontSize={10} fill={R.faint} textAnchor="middle">
              {level}
            </text>
          </g>
        )
      })}
      <line x1={LEFT} x2={W - RIGHT} y1={y(0)} y2={y(0)} stroke={R.axis} />
    </svg>
  )
}

export function PainCalendar({ entries, p, f }: { entries: DailyEntry[]; p: ReportPeriods; f: ReportFormat }) {
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const first = new Date(`${p.prevStart}T12:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7 // Monday first
  const weeks = Math.ceil((p.totalDays + offset) / 7)
  const left = 16
  const top = 16
  const gap = 3
  // Cells shrink for long spans so the calendar always fits the page width.
  const cell = Math.max(6, Math.min(17, (W - left) / weeks - gap))
  const width = left + weeks * (cell + gap)
  const height = top + 7 * (cell + gap) + 4
  const months: { x: number; label: string }[] = []
  const cells: { date: string; cx: number; cy: number; entry: DailyEntry | undefined }[] = []
  for (let i = 0; i < p.totalDays; i++) {
    const date = shiftISO(p.prevStart, i)
    const k = i + offset
    const cx = left + Math.floor(k / 7) * (cell + gap)
    const cy = top + (k % 7) * (cell + gap)
    // Month label above the first column that starts in that month.
    // Skipped when too close to the previous label (a span starting at a month's end).
    const previous = months.at(-1)
    if (k % 7 <= 1 && previous?.label !== f.month(date) && (!previous || cx - previous.x >= 30)) months.push({ x: cx, label: f.month(date) })
    cells.push({ date, cx, cy, entry: byDate.get(date) })
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: width }} role="img" aria-label={f.t.calendar}>
      {f.t.weekdayInitials.map((d, r) =>
        r % 2 === 0 ? (
          <text key={r} x={0} y={top + r * (cell + gap) + cell * 0.72} fontSize={9.5} fill={R.faint}>
            {d}
          </text>
        ) : null
      )}
      {months.map((m) => (
        <text key={m.x} x={m.x} y={10} fontSize={9.5} fill={R.faint}>
          {m.label}
        </text>
      ))}
      {cells.map(({ date, cx, cy, entry }) =>
        entry ? (
          // The lightest steps nearly vanish on white: a thin outline keeps
          // low-pain days visible as logged.
          <rect
            key={date}
            x={cx + 0.25}
            y={cy + 0.25}
            width={cell - 0.5}
            height={cell - 0.5}
            rx={3}
            fill={rampColor(entry.painLevel)}
            stroke={entry.painLevel <= 3 ? R.prev : 'none'}
            strokeWidth={0.5}
          >
            <title>{`${f.dayMonth(date)} : ${entry.painLevel}/10`}</title>
          </rect>
        ) : (
          <rect key={date} x={cx + 0.5} y={cy + 0.5} width={cell - 1} height={cell - 1} rx={3} fill="none" stroke={R.prev} strokeDasharray="2 2">
            <title>{`${f.dayMonth(date)} : ${f.t.notLogged}`}</title>
          </rect>
        )
      )}
      {cells
        .filter((c) => c.date === p.start)
        .map((c) => (
          <rect key="consult" x={c.cx - 1.5} y={c.cy - 1.5} width={cell + 3} height={cell + 3} rx={4} fill="none" stroke={R.ink} strokeWidth={1.5} />
        ))}
    </svg>
  )
}
