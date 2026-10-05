import { forwardRef, type CSSProperties } from 'react'
import type { DailyEntry, PainWeather, PainWeatherLevel } from '../../db/types'
import { computePainWeather, painWeatherByLevel } from '../../lib/painWeather'
import { WeatherIcon } from '../ui/WeatherIcon'
import { IconArrowDownRight, IconArrowRight, IconArrowUpRight } from '@tabler/icons-react'
import { theme } from '../../lib/theme'
import { painTrend, painTrendText, painWordIndex, type PainTrend } from '../../lib/painTrend'
import { useAllEntries } from '../../hooks/useEntries'
import { format, useLocale, useTranslation, type Translations } from '../../i18n'

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

/** Muted text on the card's tinted surfaces: the app's muted grey drops to
 * 4.3:1 on the storm tint, this one stays above 5.5:1 on every tint. */
const CARD_MUTED = '#4d5a64'
/** The pain tile reuses the pain category colors. */
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
                color: active ? (l <= 3 ? theme.ink : '#ffffff') : w.ink,
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

/** The shareable weather card: an illustrated sky, the day placed on the
 * 5-step weather scale, the pain score in its own tile (with a word and the
 * trend against the previous days), other measures as words with a gauge, and
 * the personal note in a speech bubble.
 *
 * Rendered off-screen at a fixed size and captured to PNG via html-to-image.
 * Every color is a literal hex from theme.ts (not a CSS var) so the exported
 * image looks identical to the on-screen preview regardless of how the
 * capture library resolves custom properties. Text is 12px minimum since
 * messaging apps show the image scaled down. */
export const WeatherCard = forwardRef<
  HTMLDivElement,
  { entry: DailyEntry; displayName?: string; message?: string }
>(function WeatherCard({ entry, displayName, message }, ref) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const weather = computePainWeather(entry)
  const c = theme

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
