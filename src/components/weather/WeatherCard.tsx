import { forwardRef } from 'react'
import type { DailyEntry } from '../../db/types'
import { computePainWeather } from '../../lib/painWeather'
import { WeatherIcon } from '../ui/WeatherIcon'
import { theme } from '../../lib/theme'
import { format, useLocale, useTranslation, type Translations } from '../../i18n'

function formatCardDate(date: string, intlLocale: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })
}

/** 0–2 low, 3–5 moderate, 6–8 high, 9–10 very high. */
function intensityIndex(value: number): 0 | 1 | 2 | 3 {
  if (value <= 2) return 0
  if (value <= 5) return 1
  if (value <= 8) return 2
  return 3
}

function factorRows(t: Translations, entry: DailyEntry) {
  return (
    [
      { key: 'brainFog', label: t.factors.brainFog.label, words: t.factorIntensity.brainFog, icon: 'brainFog' },
      { key: 'fatigueLevel', label: t.factors.fatigue.label, words: t.factorIntensity.fatigue, icon: 'fatigue' },
      { key: 'stressLevel', label: t.factors.stress.label, words: t.factorIntensity.stress, icon: 'stress' },
    ] as const
  )
    .map((f) => ({ ...f, value: entry[f.key as keyof DailyEntry] as number | undefined }))
    .filter((f): f is typeof f & { value: number } => f.value != null)
}

function FactorGlyph({ kind }: { kind: 'brainFog' | 'fatigue' | 'stress' }) {
  const common = { width: 14, height: 14 }
  switch (kind) {
    case 'brainFog':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 8h11" />
          <path d="M3 12h18" />
          <path d="M3 16h14" />
        </svg>
      )
    case 'fatigue':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="17" height="10" rx="2" />
          <rect x="20" y="10" width="2" height="4" fill="currentColor" stroke="none" />
          <rect x="4.5" y="9.5" width="6" height="5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'stress':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2 6 14h5l-1 8 9-13h-6l1-7z" />
        </svg>
      )
  }
}

/** Rendered off-screen at a fixed size and captured to PNG via html-to-image.
 * Every color here is a literal hex from theme.ts (not a CSS var) so the
 * exported image looks identical to the on-screen preview regardless of how
 * the capture library resolves custom properties. */
export const WeatherCard = forwardRef<
  HTMLDivElement,
  { entry: DailyEntry; displayName?: string; message?: string }
>(function WeatherCard({ entry, displayName, message }, ref) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const weather = computePainWeather(entry)
  const rows = factorRows(t, entry)

  return (
    <div
      ref={ref}
      style={{
        width: 420,
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(165deg, ${weather.soft} 0%, ${theme.surface} 60%)`,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        color: theme.ink,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -70,
          right: -60,
          width: 300,
          height: 300,
          color: weather.color,
          opacity: 0.17,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <WeatherIcon name={weather.icon as never} size={300} />
      </div>

      <div
        style={{
          position: 'relative',
          padding: '36px 32px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: theme.inkMuted }}>
            {displayName ? format(t.weatherCard.weatherOfName, { name: displayName }) : t.weatherCard.weatherOfDay}
          </span>
          <span style={{ fontSize: 13, color: theme.inkMuted }}>{formatCardDate(entry.date, intlLocale)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            style={{
              alignSelf: 'flex-start',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: weather.color,
              background: 'rgba(255,255,255,0.65)',
              borderRadius: 999,
              padding: '5px 12px',
            }}
          >
            {t.painWeatherLevels[weather.level]}
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 96, fontWeight: 800, color: weather.color, lineHeight: 0.8, letterSpacing: -3 }}>
              {entry.painLevel}
            </span>
            <span style={{ fontSize: 22, fontWeight: 600, color: theme.inkMuted, paddingBottom: 10 }}>/10</span>
          </div>
          <span style={{ fontSize: 14, color: theme.inkMuted }}>{t.weatherCard.painCaption}</span>
        </div>

        {rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((r) => {
              const idx = intensityIndex(r.value)
              return (
                <div
                  key={r.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    background: theme.surface,
                    borderRadius: 10,
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.inkMuted }}>
                      <FactorGlyph kind={r.icon} />
                      {r.label}
                    </div>
                    <div style={{ fontSize: 12, color: theme.ink }}>
                      <strong>{r.words[idx]}</strong>{' '}
                      <span style={{ color: theme.inkMuted, fontWeight: 400 }}>· {r.value}/10</span>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(43,39,51,0.1)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(r.value / 10) * 100}%`,
                        height: '100%',
                        background: weather.color,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              )
            })}
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
          OUCH <span style={{ fontStyle: 'italic' }}>– Ouch, Understand, Chart, Heal</span>
        </div>
      </div>
    </div>
  )
})
