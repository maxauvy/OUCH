import { forwardRef, type CSSProperties } from 'react'
import type { DailyEntry, PainWeather, PainWeatherLevel } from '../../db/types'
import { computePainWeather, painWeatherByLevel } from '../../lib/painWeather'
import { WeatherIcon } from '../ui/WeatherIcon'
import { IconArrowDownRight, IconArrowRight, IconArrowUpRight } from '@tabler/icons-react'
import { healthTheme, theme } from '../../lib/theme'
import { painTrend, painTrendText, painWordIndex, type PainTrend } from '../../lib/painTrend'
import { useAllEntries } from '../../hooks/useEntries'
import { format, useLocale, useTranslation, type Translations } from '../../i18n'

function formatCardDate(date: string, intlLocale: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
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
              color: weather.ink,
              background: 'rgba(255,255,255,0.65)',
              borderRadius: 999,
              padding: '5px 12px',
            }}
          >
            {t.painWeatherLevels[weather.level]}
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 96, fontWeight: 800, color: weather.ink, lineHeight: 0.8, letterSpacing: -3 }}>
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

/** Muted text on the card's tinted surfaces: the app's muted grey drops to
 * 4.3:1 on the storm tint, this one stays above 5.5:1 on every tint. */
const CARD_MUTED = '#4d5a64'
/** The pain tile reuses the health design's pain category colors. */
const PAIN = { color: '#b3261e', soft: '#fdeaea' }
const LEVELS: PainWeatherLevel[] = [1, 2, 3, 4, 5]
const GAUGE = { on: '#4d5a64', off: '#d5dde2' }

/** Five notches for a 0–10 score. Decorative: the word next to it carries
 * the meaning (and the direction, since a full mood gauge is a good day). */
function CardGauge({ value }: { value: number }) {
  const filled = Math.ceil(value / 2)
  return (
    <span style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ width: 11, height: 11, borderRadius: 3, background: i < filled ? GAUGE.on : GAUGE.off }} />
      ))}
    </span>
  )
}

function TrendIcon({ trend }: { trend: PainTrend }) {
  const props = { size: 14, stroke: 2.2, style: { flexShrink: 0, marginTop: 1 } }
  if (trend === 'lower') return <IconArrowDownRight {...props} />
  if (trend === 'higher') return <IconArrowUpRight {...props} />
  return <IconArrowRight {...props} />
}

/** Flat illustrated sky, as on the Kids tab: clear on the easiest day, then
 * the sun hides and clouds gather as the day gets harder. Decorative; the level is spelled out below. */
function CardSky({ weather }: { weather: PainWeather }) {
  const puff = (style: CSSProperties) => (
    <span style={{ position: 'absolute', borderRadius: 999, background: '#ffffff', ...style }} />
  )
  return (
    <div style={{ position: 'relative', height: 140, overflow: 'hidden', background: weather.soft }}>
      {weather.level <= 3 && (
        <span
          style={{ position: 'absolute', left: 30, top: 22, width: 52, height: 52, borderRadius: 999, background: '#f0cf93' }}
        />
      )}
      {weather.level >= 2 && puff({ right: 30, top: 56, width: 80, height: 26 })}
      {weather.level >= 2 && puff({ right: 60, top: 40, width: 34, height: 34 })}
      {weather.level >= 3 && puff({ left: 26, top: 92, width: 58, height: 18 })}
      {weather.level >= 4 && puff({ left: 70, top: 30, width: 46, height: 16 })}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: 26,
          transform: 'translateX(-50%)',
          width: 88,
          height: 88,
          borderRadius: 999,
          background: '#ffffff',
          color: weather.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WeatherIcon name={weather.icon as never} size={54} />
      </span>
    </div>
  )
}

/** The five weathers side by side with today's one highlighted, so someone
 * who doesn't know the app can place the day on the scale. */
function CardScale({ level, t }: { level: PainWeatherLevel; t: Translations }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 5 }}>
        {LEVELS.map((l) => {
          const w = painWeatherByLevel(l)
          const active = l === level
          return (
            <span
              key={l}
              style={{
                flex: active ? 1.5 : 1,
                height: active ? 40 : 32,
                alignSelf: 'center',
                borderRadius: 8,
                background: active ? w.color : w.soft,
                // Dark icon on the light weathers (1–3), white on the dark ones.
                color: active ? (l <= 3 ? healthTheme.ink : '#ffffff') : w.ink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WeatherIcon name={w.icon as never} size={active ? 26 : 20} />
            </span>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: CARD_MUTED, marginTop: 5 }}>
        <span>{t.painWeatherLevels[1]}</span>
        <span>{t.painWeatherLevels[5]}</span>
      </div>
    </div>
  )
}

/** Health-design version of the shared card: an illustrated sky, the day
 * placed on the 5-step weather scale, the pain score in its own tile (with a
 * word and the trend against the previous days), other measures as words
 * with a gauge, and the personal note in a speech bubble. Same capture constraints as above:
 * literal colors only. Text is 12px minimum since messaging apps show the
 * image scaled down. */
export const HealthWeatherCard = forwardRef<
  HTMLDivElement,
  { entry: DailyEntry; displayName?: string; message?: string }
>(function HealthWeatherCard({ entry, displayName, message }, ref) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const weather = computePainWeather(entry)
  const c = healthTheme

  const trend = painTrend(entry, useAllEntries() ?? [])

  // Scores are told in words with a gauge rather than as "6/10", which means
  // little to someone who doesn't use the app.
  const others = (
    [
      [t.factors.fatigue.label, entry.fatigueLevel, t.factorIntensity.fatigue],
      [t.factors.mood.label, entry.moodLevel, t.weatherCard.moodWords],
      [t.factors.brainFog.label, entry.brainFog, t.factorIntensity.brainFog],
      [t.factors.stress.label, entry.stressLevel, t.factorIntensity.stress],
    ] as const
  )
    .filter((m): m is typeof m & [string, number, readonly string[]] => m[1] != null)
    .map(([label, value, words]) => ({ label, value, word: words[intensityIndex(value)] }))
    .slice(0, 3)

  const shortDate = new Date(entry.date + 'T00:00:00').toLocaleDateString(intlLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div
      ref={ref}
      style={{
        width: 420,
        background: c.surface,
        fontFamily: '"Public Sans Variable", system-ui, -apple-system, "Segoe UI", sans-serif',
        color: c.ink,
        boxSizing: 'border-box',
      }}
    >
      <CardSky weather={weather} />

      <div style={{ padding: '18px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: CARD_MUTED }}>
              {displayName ? format(t.weatherCard.weatherOfName, { name: displayName }) : t.weatherCard.weatherOfDay}
            </span>
            <span style={{ fontSize: 13, color: CARD_MUTED }}>{capitalizeFirst(shortDate)}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, marginTop: 4 }}>
            {t.painWeatherLevels[weather.level]}
          </div>
          <div style={{ fontSize: 13, color: CARD_MUTED, marginTop: 2 }}>
            {format(t.weatherCard.levelOf, { n: weather.level })}
          </div>
        </div>

        <CardScale level={weather.level} t={t} />

        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <div
            style={{
              flex: others.length ? '0 0 150px' : 1,
              background: PAIN.soft,
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: PAIN.color }}>{t.entryForm.pain}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginTop: 6 }}>
              <span style={{ fontSize: 44, fontWeight: 800 }}>{entry.painLevel}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: CARD_MUTED }}> /10</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
              {t.weatherCard.painWords[painWordIndex(entry.painLevel)]}
            </span>
            {trend && (
              <span style={{ display: 'flex', gap: 3, fontSize: 12, lineHeight: 1.3, marginTop: 4 }}>
                <TrendIcon trend={trend} />
                {painTrendText(t, trend)}
              </span>
            )}
          </div>
          {others.length > 0 && (
            <div
              style={{
                flex: 1,
                background: c.paper,
                borderRadius: 12,
                padding: '4px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              {others.map((m, i) => (
                <div
                  key={m.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 0',
                    borderTop: i ? `1px solid ${c.hairline}` : 'none',
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12, color: CARD_MUTED }}>{m.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{m.word}</span>
                  </span>
                  <CardGauge value={m.value} />
                </div>
              ))}
            </div>
          )}
        </div>

        {message && (
          <p
            style={{
              margin: 0,
              background: weather.soft,
              borderRadius: '14px 14px 14px 4px',
              padding: '11px 14px',
              fontSize: 16,
              lineHeight: 1.45,
              color: c.ink,
            }}
          >
            {message}
          </p>
        )}

        <div style={{ fontSize: 12, color: CARD_MUTED, letterSpacing: 0.3 }}>
          <strong>OUCH</strong> · Ouch, Understand, Chart, Heal
        </div>
      </div>
    </div>
  )
})
