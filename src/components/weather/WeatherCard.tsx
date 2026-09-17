import { forwardRef } from 'react'
import type { DailyEntry } from '../../db/types'
import { computePainWeather } from '../../lib/painWeather'
import { WeatherIcon } from '../ui/WeatherIcon'
import { theme } from '../../lib/theme'

function formatCardDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const FACTOR_ROWS: {
  key: keyof DailyEntry
  label: string
  format: (e: DailyEntry) => string | null
}[] = [
  { key: 'sleepQuality', label: 'Sommeil', format: (e) => (e.sleepQuality != null ? `${e.sleepQuality}/10` : null) },
  { key: 'fatigueLevel', label: 'Fatigue', format: (e) => (e.fatigueLevel != null ? `${e.fatigueLevel}/10` : null) },
  { key: 'stressLevel', label: 'Stress', format: (e) => (e.stressLevel != null ? `${e.stressLevel}/10` : null) },
]

/** Rendered off-screen at a fixed size and captured to PNG via html-to-image.
 * Every color here is a literal hex from theme.ts (not a CSS var) so the
 * exported image looks identical to the on-screen preview regardless of how
 * the capture library resolves custom properties. */
export const WeatherCard = forwardRef<
  HTMLDivElement,
  { entry: DailyEntry; displayName?: string; message?: string }
>(function WeatherCard({ entry, displayName, message }, ref) {
  const weather = computePainWeather(entry)
  const rows = FACTOR_ROWS.map((f) => ({ label: f.label, value: f.format(entry) })).filter((r) => r.value)

  return (
    <div
      ref={ref}
      style={{
        width: 420,
        padding: '36px 32px 28px',
        background: `linear-gradient(160deg, ${weather.soft}, ${theme.surface})`,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        color: theme.ink,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: theme.inkMuted }}>
          Météo{displayName ? ` de ${displayName}` : ' du jour'}
        </span>
        <span style={{ fontSize: 13, color: theme.inkMuted }}>{formatCardDate(entry.date)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            background: theme.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: weather.color,
            flexShrink: 0,
          }}
        >
          <WeatherIcon name={weather.icon as never} size={64} />
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: weather.color, lineHeight: 1.15 }}>
            {weather.label}
          </div>
          <div style={{ fontSize: 15, color: theme.inkMuted, marginTop: 4 }}>
            Douleur : <strong style={{ color: theme.ink }}>{entry.painLevel}/10</strong>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                background: theme.surface,
                borderRadius: 12,
                padding: '8px 12px',
                fontSize: 13,
                color: theme.inkMuted,
              }}
            >
              {r.label} <strong style={{ color: theme.ink }}>{r.value}</strong>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div
          style={{
            background: theme.surface,
            borderRadius: 14,
            padding: '14px 16px',
            fontSize: 15,
            lineHeight: 1.45,
            fontStyle: 'italic',
            color: theme.ink,
          }}
        >
          « {message} »
        </div>
      )}

      <div style={{ fontSize: 12, color: theme.inkMuted, textAlign: 'right', letterSpacing: 0.3 }}>
        Accalmie
      </div>
    </div>
  )
})
