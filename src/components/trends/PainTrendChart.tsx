import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import type { DailyEntry } from '../../db/types'
import { themeFor } from '../../lib/theme'
import { shiftISO } from '../../lib/medications'
import { daysBetween, trailingMeans } from '../../lib/report'
import { usePalette } from '../../hooks/usePalette'
import { useLocale, useTranslation, type Translations } from '../../i18n'

/** Same window as the doctor report's curve. */
const WINDOW = 7

/** One point per calendar day, logged or not, so gaps in the diary show as
 * gaps rather than being closed up. */
interface Point {
  day: number
  date: string
  pain: number | null
  mean: number | null
}

const nf = (v: number) => v.toFixed(1)

function CustomTooltip({
  active,
  payload,
  t,
  i18n,
  dateFnsLocale,
}: {
  active?: boolean
  payload?: { payload: Point }[]
  t: ReturnType<typeof themeFor>
  i18n: Translations
  dateFnsLocale: Locale
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.hairline}`,
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 'var(--text-caption)',
        boxShadow: '0 4px 12px rgba(20,15,35,0.24)',
      }}
    >
      <div style={{ color: t.inkMuted, marginBottom: 2 }}>
        {format(new Date(p.date + 'T00:00:00'), 'EEEE d MMMM', { locale: dateFnsLocale })}
      </div>
      <div style={{ color: t.ink, fontWeight: 600 }}>
        {p.pain === null ? i18n.trends.notLogged : `${i18n.weatherCard.painLabel} ${p.pain}/10`}
      </div>
      {p.mean !== null && (
        <div style={{ color: t.inkMuted }}>
          {i18n.trends.weeklyMean} {nf(p.mean)}
        </div>
      )}
    </div>
  )
}

export interface ChartMarker {
  date: string
  label: string
}

export function PainTrendChart({
  entries,
  from,
  to,
  markers = [],
  showMean,
}: {
  /** Every entry: the mean of the range's first days reaches back before it. */
  entries: DailyEntry[]
  /** ISO dates, inclusive */
  from: string
  to: string
  markers?: ChartMarker[]
  /** Off for a one-week range, where a 7-day mean would say nothing more. */
  showMean: boolean
}) {
  const t = usePalette()
  const i18n = useTranslation()
  const { dateFnsLocale } = useLocale()

  const byDate = new Map(entries.map((e) => [e.date, e.painLevel]))
  const total = daysBetween(from, to) + 1
  // Starts WINDOW - 1 days early so the range's first day already has its mean.
  const values = Array.from({ length: total + WINDOW - 1 }, (_, i) => byDate.get(shiftISO(from, i - WINDOW + 1)))
  const means = trailingMeans(values, WINDOW)
  const data: Point[] = Array.from({ length: total }, (_, day) => ({
    day,
    date: shiftISO(from, day),
    pain: values[day + WINDOW - 1] ?? null,
    mean: showMean ? (means[day + WINDOW - 1] ?? null) : null,
  }))
  const logged = data.filter((d) => d.pain !== null).length
  const dateOf = (day: number) => format(new Date(shiftISO(from, day) + 'T00:00:00'), 'd MMM', { locale: dateFnsLocale })

  if (logged < 2) {
    return (
      <p className="text-control py-6 text-center" style={{ color: t.inkMuted }}>
        {i18n.trends.notEnoughData}
      </p>
    )
  }

  return (
    <>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={t.hairline} strokeDasharray="0" />
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, total - 1]}
              tickFormatter={dateOf}
              tick={{ fontSize: 13, fill: t.inkMuted }}
              axisLine={{ stroke: t.hairline }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 5, 10]}
              tick={{ fontSize: 13, fill: t.inkMuted }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              content={<CustomTooltip t={t} i18n={i18n} dateFnsLocale={dateFnsLocale} />}
              cursor={{ stroke: t.brand, strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            {markers
              .filter((m) => m.date >= from && m.date <= to)
              .map((m) => {
                const day = daysBetween(from, m.date)
                // In the right half, the label goes left of the line so it
                // isn't cut off at the edge of the chart.
                const toLeft = day > total / 2
                return (
                  <ReferenceLine
                    key={`${m.date}-${m.label}`}
                    x={day}
                    stroke={t.inkMuted}
                    strokeDasharray="3 3"
                    label={{ value: m.label, position: toLeft ? 'insideTopRight' : 'insideTopLeft', fontSize: 12, fill: t.inkMuted }}
                  />
                )
              })}
            {/* Daily ratings: dots only on longer ranges, where the mean
                carries the trend; joined on a one-week range. Dimmed to stay
                behind the mean, still 3:1 against the card. */}
            <Line
              dataKey="pain"
              stroke={showMean ? 'none' : t.brand}
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: showMean ? 2.5 : 3, fill: t.brand, fillOpacity: showMean ? 0.65 : 1, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: t.brand, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            {showMean && (
              <Line
                dataKey="mean"
                type="monotone"
                stroke={t.brand}
                strokeWidth={2.5}
                strokeLinecap="round"
                connectNulls={false}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-caption" style={{ color: t.inkMuted }}>
        <li className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: t.brand, opacity: showMean ? 0.65 : 1 }} aria-hidden />
          {i18n.trends.dailyRating}
        </li>
        {showMean && (
          <li className="flex items-center gap-1.5">
            <span className="w-4 h-[2.5px] rounded-full" style={{ background: t.brand }} aria-hidden />
            {i18n.trends.weeklyMeanLegend}
          </li>
        )}
      </ul>
    </>
  )
}
