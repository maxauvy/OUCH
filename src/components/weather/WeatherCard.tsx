import { forwardRef, type CSSProperties } from 'react'
import type { LoggedEntry, PainWeather, PainWeatherLevel } from '../../db/types'
import { colorForPainValue, computePainWeather, painWeatherByLevel } from '../../lib/painWeather'
import { useRichLook } from '../../lib/look'
import { shiftISO } from '../../lib/dates'
import { AppLogo } from '../ui/AppLogo'
import { WeatherIcon } from '../ui/WeatherIcon'
import { IconArrowDownRight, IconArrowRight, IconArrowUpRight } from '@tabler/icons-react'
import { theme } from '../../lib/theme'
import { painTrend, painTrendText, painWordIndex, type PainTrend } from '../../lib/painTrend'
import { useLoggedEntries } from '../../hooks/useEntries'
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
/** The weather's name, in the face of the app's titles. ShareSheet waits for it to be loaded before the capture. */
const CARD_TITLE_FONT = '"Bricolage Grotesque Variable", "Public Sans Variable", system-ui, sans-serif'
const LEVELS: PainWeatherLevel[] = [1, 2, 3, 4, 5]
const GAUGE = { on: '#4d5a64', off: '#d5dde2' }
/** The weather look's card: its ink, and the first colour of each weather's sky (index.css, --sky-1 to --sky-5, light). */
const CARD_INK = '#1d2433'
const SKY_TOP_LIGHT = ['#fbe2b4', '#f6e5c1', '#e2dee9', '#d4e0ec', '#ddd4ec']

/** Five notches for a 0–10 score. Decorative: the word next to it carries
 * the meaning (and the direction, since a full mood gauge is a good day). */
function CardGauge({ value, size = 11 }: { value: number; size?: number }) {
  const filled = Math.ceil(value / 2)
  return (
    <span style={{ display: 'flex', gap: size > 11 ? 4 : 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ width: size, height: size, borderRadius: size > 11 ? 4 : 3, background: i < filled ? GAUGE.on : GAUGE.off }} />
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

/** The five weathers as a rule with today's segment full and thicker, topped
 * by a bubble with its icon, so someone who doesn't know the app can place the
 * day. The ends are worded as pain. */
function CardScale({ level, t }: { level: PainWeatherLevel; t: Translations }) {
  const current = painWeatherByLevel(level)
  return (
    <div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
        {LEVELS.map((l) => {
          const w = painWeatherByLevel(l)
          const active = l === level
          return (
            <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {active ? (
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    background: current.color,
                    // Dark icon on the light weathers (1–3), white on the dark ones.
                    color: l <= 3 ? theme.ink : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WeatherIcon name={w.icon as never} size={24} />
                </span>
              ) : (
                <span style={{ height: 38 }} />
              )}
              <span
                style={{ width: '100%', height: active ? 14 : 8, borderRadius: 999, background: active ? w.color : `${w.color}4d` }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: CARD_MUTED, marginTop: 6 }}>
        <span>{t.weatherCard.scaleLow}</span>
        <span>{t.weatherCard.scaleHigh}</span>
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
  { entry: LoggedEntry; displayName?: string; message?: string }
>(function WeatherCard({ entry, displayName, message }, ref) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const weather = computePainWeather(entry)
  const c = theme

  const logged = useLoggedEntries() ?? []
  const trend = painTrend(entry, logged)
  const rich = useRichLook()

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

  // The weather look: the day's sky over the whole image, the pain with its scale, the gauges, then the last seven days as in the Journal.
  if (rich) {
    const byDate = new Map(logged.map((e) => [e.date, e]))
    const days = Array.from({ length: 7 }, (_, i) => shiftISO(entry.date, i - 6))
    const box: CSSProperties = { background: 'rgba(255, 255, 255, 0.82)', borderRadius: 20, padding: '14px 16px' }
    const label: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: CARD_MUTED }
    return (
      <div
        ref={ref}
        style={{
          width: 420,
          boxSizing: 'border-box',
          padding: '24px 24px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: `linear-gradient(180deg, ${SKY_TOP_LIGHT[weather.level - 1]} 0%, ${weather.soft} 38%, #f7f8fa 100%)`,
          fontFamily: '"Public Sans Variable", system-ui, -apple-system, "Segoe UI", sans-serif',
          color: CARD_INK,
          // The image is always light: the two-tone icons get their light-mode cloud and drops whatever the phone's theme.
          ['--wx-cloud' as string]: '#ffffff',
          ['--wx-rain' as string]: '#5e9bd6',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 14, fontWeight: 600, color: CARD_MUTED }}>
          <span>{displayName ? format(t.weatherCard.weatherOfName, { name: displayName }) : t.weatherCard.weatherOfDay}</span>
          <span style={{ fontSize: 13 }}>{capitalizeFirst(shortDate)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: weather.ink, display: 'flex', flexShrink: 0 }}>
            <WeatherIcon name={weather.icon as never} size={96} />
          </span>
          <div>
            <div style={{ fontFamily: CARD_TITLE_FONT, fontWeight: 800, fontSize: 42, lineHeight: 1, letterSpacing: '-0.015em' }}>{t.painWeatherLevels[weather.level]}</div>
            <div style={{ fontSize: 15, color: CARD_MUTED, marginTop: 6 }}>{format(t.weatherCard.levelOf, { n: weather.level })}</div>
          </div>
        </div>

        <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1, flexShrink: 0 }}>
            <span style={{ fontFamily: CARD_TITLE_FONT, fontWeight: 800, fontSize: 50 }}>{entry.painLevel}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: CARD_MUTED }}> /10</span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={label}>{t.entryForm.pain}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t.weatherCard.painWords[painWordIndex(entry.painLevel)]}</div>
            {trend && (
              <div style={{ display: 'flex', gap: 3, fontSize: 13, color: CARD_MUTED, lineHeight: 1.3, marginTop: 2 }}>
                <TrendIcon trend={trend} />
                {painTrendText(t, trend)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
              {Array.from({ length: 11 }, (_, i) => (
                <span key={i} style={{ flex: 1, height: 7, borderRadius: 4, background: i <= entry.painLevel ? colorForPainValue(i) : '#e1e5ec' }} />
              ))}
            </div>
          </div>
        </div>

        {others.length > 0 && (
          <div style={{ ...box, padding: '6px 16px' }}>
            {others.map((m, i) => (
              <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid #e6e9ef' : 'none' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 13, color: CARD_MUTED }}>{m.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{m.word}</span>
                </span>
                <CardGauge value={m.value} size={14} />
              </div>
            ))}
          </div>
        )}

        <div style={box}>
          <div style={{ ...label, marginBottom: 8 }}>{t.weatherCard.weekLabel}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5 }}>
            {days.map((date) => {
              const e = byDate.get(date)
              const w = e ? computePainWeather(e) : null
              const d = new Date(date + 'T00:00:00')
              return (
                <div
                  key={date}
                  style={{
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    padding: '3.5px 0',
                    fontSize: 12,
                    fontWeight: 700,
                    background: w ? w.soft : '#eef1f5',
                    color: w ? w.ink : CARD_MUTED,
                    // A border, not an inset shadow: the image is drawn by the browser through SVG, and Safari on iPhone leaves shadows out there.
                    border: `2.5px solid ${date === entry.date ? CARD_INK : 'transparent'}`,
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{capitalizeFirst(d.toLocaleDateString(intlLocale, { weekday: 'narrow' }))}</span>
                  {w ? <WeatherIcon name={w.icon as never} size={26} /> : <span style={{ height: 26 }} />}
                  <span>{d.getDate()}</span>
                </div>
              )
            })}
          </div>
        </div>

        {message && (
          <p style={{ margin: 0, background: 'rgba(255, 255, 255, 0.82)', borderRadius: '16px 16px 16px 4px', padding: '11px 14px', fontSize: 16, lineHeight: 1.45 }}>
            {message}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: CARD_MUTED }}>
          <AppLogo size={22} />
          <span>
            <strong style={{ color: CARD_INK }}>OUCH</strong> · Ouch, Understand, Chart, Heal
          </span>
        </div>
      </div>
    )
  }

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
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15, marginTop: 4, fontFamily: CARD_TITLE_FONT, letterSpacing: '-0.01em' }}>
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
              // The pain wears the day's weather, like the pain scale in the app: no red.
              background: c.weather[weather.level].soft,
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: c.weather[weather.level].ink }}>{t.entryForm.pain}</span>
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
