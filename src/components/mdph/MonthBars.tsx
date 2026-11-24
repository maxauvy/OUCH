import { CERTIFICATE_LINE, type MdphMonth } from '../../lib/mdph'

const H = 96
const TOP = 16
const BOTTOM = 18

/** Flare days per month, with a dashed line at the certificate's 15 days. Colours are given: the same drawing goes on screen and on paper. */
export function MonthBars({ months, label, lineLabel, monthLabel, ink = 'var(--color-ink)', muted = 'var(--color-ink-muted)', bar = 'color-mix(in srgb, var(--color-brand) 55%, transparent)' }: {
  months: readonly MdphMonth[]
  label: string
  lineLabel: string
  monthLabel: (m: MdphMonth) => string
  ink?: string
  muted?: string
  bar?: string
}) {
  const max = 31
  const LEFT = 46
  const width = Math.max(240, LEFT + months.length * 44)
  const step = (width - LEFT) / months.length
  const y = (n: number) => TOP + H - (n / max) * H
  return (
    <svg viewBox={`0 0 ${width} ${TOP + H + BOTTOM}`} width="100%" role="img" aria-label={`${label} : ${months.map((m) => `${monthLabel(m)} ${m.flareDays}`).join(', ')}`} style={{ display: 'block', maxWidth: months.length < 5 ? 360 : undefined }}>
      <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke={muted} strokeOpacity={0.35} />
      <line x1={0} x2={width} y1={y(CERTIFICATE_LINE)} y2={y(CERTIFICATE_LINE)} stroke={muted} strokeDasharray="4 3" />
      <text x={2} y={y(CERTIFICATE_LINE) - 4} textAnchor="start" fontSize={10} fill={muted}>
        {lineLabel}
      </text>
      {months.map((m, i) => {
        const w = Math.min(36, step * 0.62)
        const x = LEFT + i * step + (step - w) / 2
        return (
          <g key={m.month}>
            <rect x={x} y={y(m.flareDays)} width={w} height={Math.max(0, y(0) - y(m.flareDays))} rx={5} fill={bar} />
            <text x={x + w / 2} y={y(m.flareDays) - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={ink}>
              {m.flareDays}
            </text>
            <text x={x + w / 2} y={TOP + H + 13} textAnchor="middle" fontSize={9.5} fill={muted}>
              {monthLabel(m)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
