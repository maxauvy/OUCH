import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { DailyEntry } from '../../db/types'
import { themeFor } from '../../lib/theme'
import { useSettings } from '../../hooks/useSettings'
import { useIsDark } from '../../hooks/useIsDark'

interface Point {
  date: string
  pain: number
}

function CustomTooltip({ active, payload, t }: { active?: boolean; payload?: { payload: Point }[]; t: ReturnType<typeof themeFor> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.hairline}`,
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 13,
        boxShadow: '0 4px 12px rgba(20,15,35,0.24)',
      }}
    >
      <div style={{ color: t.inkMuted, marginBottom: 2 }}>
        {format(new Date(p.date + 'T00:00:00'), 'EEEE d MMMM', { locale: fr })}
      </div>
      <div style={{ color: t.ink, fontWeight: 600 }}>Douleur : {p.pain}/10</div>
    </div>
  )
}

export function PainTrendChart({ entries }: { entries: DailyEntry[] }) {
  const settings = useSettings()
  const isDark = useIsDark(settings.theme)
  const t = themeFor(isDark)

  const data: Point[] = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, pain: e.painLevel }))

  if (data.length < 2) {
    return (
      <p className="text-[14px] py-6 text-center" style={{ color: t.inkMuted }}>
        Encore quelques jours de suivi et ta courbe apparaîtra ici.
      </p>
    )
  }

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="painFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.brand} stopOpacity={0.22} />
              <stop offset="100%" stopColor={t.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={t.hairline} strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => format(new Date(d + 'T00:00:00'), 'd MMM', { locale: fr })}
            tick={{ fontSize: 11, fill: t.inkMuted }}
            axisLine={{ stroke: t.hairline }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 5, 10]}
            tick={{ fontSize: 11, fill: t.inkMuted }}
            axisLine={false}
            tickLine={false}
            width={24}
          />
          <Tooltip content={<CustomTooltip t={t} />} cursor={{ stroke: t.brand, strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey="pain"
            stroke={t.brand}
            strokeWidth={2}
            fill="url(#painFill)"
            dot={false}
            activeDot={{ r: 4, fill: t.brand, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
