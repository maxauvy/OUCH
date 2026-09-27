import { useState, type CSSProperties } from 'react'
import {
  IconBasket,
  IconBook,
  IconBowl,
  IconBrush,
  IconBulb,
  IconConfetti,
  IconDice5,
  IconHeadphones,
  IconHeart,
  IconHeartHandshake,
  IconHorseToy,
  IconMailHeart,
  IconMessageCircle,
  IconMoodHappy,
  IconMoodSmile,
  IconPalette,
  IconPencil,
  IconPizza,
  IconPuzzle,
  IconSparkles,
  IconToolsKitchen2,
  IconVolume2,
  IconVolume3,
  IconWalk,
  IconZzz,
  type Icon,
} from '@tabler/icons-react'
import type { PainWeather, PainWeatherLevel } from '../../db/types'
import { CHILD_TONES, type ChildTone } from '../../lib/childView'
import { painWeatherByLevel } from '../../lib/painWeather'
import { WeatherIcon } from '../ui/WeatherIcon'
import { format, useTranslation } from '../../i18n'
import { radioGroupProps, radioProps, splitLeadingEmoji } from '../../lib/a11y'

// The help texts are shared with the classic design, where they open with an
// emoji. The health design swaps that emoji for a line icon.
const HELP_ICONS: Record<string, Icon> = {
  '🤗': IconHeartHandshake,
  '🤫': IconVolume3,
  '🔉': IconVolume2,
  '💬': IconMessageCircle,
  '💤': IconZzz,
  '🚶': IconWalk,
  '💌': IconMailHeart,
  '😄': IconMoodHappy,
  '😊': IconMoodSmile,
  '🙂': IconMoodSmile,
  '🎲': IconDice5,
  '🎧': IconHeadphones,
  '🙌': IconSparkles,
  '🎉': IconConfetti,
  '🧸': IconHorseToy,
  '📖': IconBook,
  '🧺': IconBasket,
  '🧩': IconPuzzle,
  '🍕': IconPizza,
  '🍽': IconToolsKitchen2,
  '🍝': IconBowl,
  '🎨': IconPalette,
  '✏': IconPencil,
  '🖍': IconBrush,
  '🫶': IconHeart,
}

function splitHelp(text: string): { icon: Icon; label: string } {
  const { emoji, label } = splitLeadingEmoji(text)
  return { icon: (emoji && HELP_ICONS[emoji.replace(/️/g, '')]) || IconHeart, label }
}

// One hue per help card, borrowed from the measure categories.
const HELP_HUES = ['cycle', 'sleep', 'mood', 'fatigue'] as const

const LEVELS: PainWeatherLevel[] = [1, 2, 3, 4, 5]

const card: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-hairline)',
}

function Puff({ style }: { style: CSSProperties }) {
  return <span className="absolute rounded-full" style={{ background: 'var(--color-surface)', ...style }} />
}

/** Flat illustrated sky behind the day's weather icon. The sun hides and the
 * sky greys as the day gets harder. */
function Sky({ weather }: { weather: PainWeather }) {
  const sky =
    weather.level <= 2
      ? 'var(--color-brand-soft)'
      : `color-mix(in srgb, var(--color-brand-soft) ${weather.level === 3 ? 85 : 65}%, ${weather.color})`
  return (
    <div className="relative h-[112px] overflow-hidden" style={{ background: sky }} aria-hidden>
      {weather.level <= 3 && (
        <span
          className="absolute rounded-full w-11 h-11 left-6 top-4"
          style={{ background: 'color-mix(in srgb, var(--color-weather-1) 55%, var(--color-surface))' }}
        />
      )}
      <Puff style={{ right: 22, top: 44, width: 60, height: 20 }} />
      <Puff style={{ right: 44, top: 32, width: 26, height: 26 }} />
      {weather.level >= 3 && <Puff style={{ left: 18, top: 72, width: 44, height: 14 }} />}
      <span
        className="absolute left-1/2 top-[18px] -translate-x-1/2 w-[76px] h-[76px] rounded-full flex items-center justify-center"
        style={{ background: 'var(--color-surface)', color: weather.text }}
      >
        <WeatherIcon name={weather.icon as never} size={46} />
      </span>
    </div>
  )
}

/** The five weathers side by side, today's one filled, so a child can place
 * the day on the scale ("cloudy is the middle one"). */
function WeatherScale({ level }: { level: PainWeatherLevel }) {
  const t = useTranslation()
  return (
    <div role="img" aria-label={format(t.childView.scaleLevel, { level: t.painWeatherLevels[level], n: level })}>
      <div className="flex items-center gap-1">
        {LEVELS.map((l) => {
          const w = painWeatherByLevel(l)
          const active = l === level
          return (
            <span
              key={l}
              className="flex items-center justify-center rounded-[8px]"
              style={{
                flex: active ? 1.4 : 1,
                height: active ? 44 : 34,
                background: active ? w.color : `color-mix(in srgb, ${w.color} 16%, transparent)`,
                // Dark icon on the light weathers (1–3), white on the dark ones.
                color: active ? (l <= 3 ? '#14212b' : '#ffffff') : w.text,
              }}
            >
              <WeatherIcon name={w.icon as never} size={active ? 26 : 20} />
            </span>
          )
        })}
      </div>
      <div className="flex justify-between text-[11px] mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
        <span>{t.painWeatherLevels[1]}</span>
        <span>{t.painWeatherLevels[5]}</span>
      </div>
    </div>
  )
}

function AgeControl({ tone, onChange }: { tone: ChildTone; onChange: (tone: ChildTone) => void }) {
  const t = useTranslation()
  return (
    <div {...radioGroupProps(t.childView.ageToggleLabel)} className="flex gap-1 rounded-[var(--radius-control)] p-1" style={{ background: 'var(--color-brand-soft)' }}>
      {CHILD_TONES.map((value) => {
        const active = tone === value
        return (
          <button
            key={value}
            {...radioProps(active)}
            onClick={() => onChange(value)}
            className="flex-1 rounded-[calc(var(--radius-control)-2px)] py-2 text-[14px] font-semibold"
            style={{
              background: active ? 'var(--color-brand)' : 'transparent',
              color: active ? 'var(--color-on-brand)' : 'var(--color-brand)',
            }}
          >
            {t.childView.ages[value]}
          </button>
        )
      })}
    </div>
  )
}

export function HealthChildView({
  tone,
  onToneChange,
  weather,
  copy,
  illnessQuestion,
  illnessText,
  closing,
}: {
  tone: ChildTone
  onToneChange: (tone: ChildTone) => void
  weather: PainWeather | null
  copy: { headline: string; body: string; help: string[] } | null
  illnessQuestion: string
  illnessText: string
  closing: string
}) {
  const t = useTranslation()
  const [illnessOpen, setIllnessOpen] = useState(true)
  const { icon: ClosingIcon, label: closingText } = splitHelp(closing)

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-28">
      <h1 className="text-[22px] font-bold leading-tight px-1">{t.childView.pageTitle}</h1>

      {!weather || !copy ? (
        <p className="text-[14px] text-center mt-10 leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
          {t.childView.noEntry}
        </p>
      ) : (
        <>
          <AgeControl tone={tone} onChange={onToneChange} />

          <div className="rounded-[var(--radius-card)] overflow-hidden" style={card}>
            <Sky weather={weather} />
            <div className="px-5 pt-4 pb-5 text-center">
              <div className="text-[19px] font-bold leading-snug">{copy.headline}</div>
              <div className="text-[15px] mt-2 leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                {copy.body}
              </div>
            </div>
            <div className="px-5 pt-4 pb-4" style={{ borderTop: '1px solid var(--color-hairline)' }}>
              <WeatherScale level={weather.level} />
            </div>
          </div>

          <p
            className="text-[12px] font-semibold uppercase tracking-[0.06em] px-1 -mb-1 mt-1"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            {t.childView.howToHelp}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {copy.help.map((text, i) => {
              const { icon: I, label } = splitHelp(text)
              const hue = HELP_HUES[i % HELP_HUES.length]
              return (
                <div
                  key={text}
                  className="rounded-[var(--radius-card)] px-3 pt-3 pb-3.5 flex flex-col gap-2"
                  style={{ background: `var(--cat-${hue}-soft)` }}
                >
                  <I size={26} stroke={1.8} style={{ color: `var(--cat-${hue})` }} aria-hidden />
                  <span
                    className="text-[14px] font-semibold leading-snug"
                    style={{ color: `color-mix(in srgb, var(--cat-${hue}) 65%, var(--color-ink))` }}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="rounded-[var(--radius-card)] px-4 py-3.5 mt-1" style={card}>
            <button
              onClick={() => setIllnessOpen((v) => !v)}
              aria-expanded={illnessOpen}
              className="w-full flex items-center gap-2.5 text-left"
            >
              <span
                className="inline-flex items-center justify-center shrink-0 rounded-[7px] w-7 h-7"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
                aria-hidden
              >
                <IconBulb size={18} stroke={1.8} />
              </span>
              <span className="flex-1 text-[15px] font-semibold">{illnessQuestion}</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 transition-transform"
                style={{ transform: illnessOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {illnessOpen && (
              <div className="text-[14px] mt-3 leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                {illnessText}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5 px-3 mt-2 text-center">
            <ClosingIcon size={22} stroke={1.8} style={{ color: 'var(--color-brand)' }} aria-hidden />
            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
              {closingText}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
