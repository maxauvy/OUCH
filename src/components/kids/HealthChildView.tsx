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
import { WeatherFriend } from './WeatherFriend'
import { format, useTranslation } from '../../i18n'
import { splitLeadingEmoji } from '../../lib/a11y'
import { Segmented } from '../ui/Segmented'

// The help texts open with an emoji, which is swapped for a line icon here.
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

/** The five weathers as a rule: today's segment is full and thicker, with a
 * bubble holding its icon, the others fade. The ends are worded as pain so
 * the sky reads as a pain scale, not a forecast. */
function WeatherScale({ level }: { level: PainWeatherLevel }) {
  const t = useTranslation()
  const current = painWeatherByLevel(level)
  return (
    <div role="img" aria-label={format(t.childView.scaleLevel, { level: t.painWeatherLevels[level], n: level })}>
      <div className="grid grid-cols-5 gap-1 items-end">
        {LEVELS.map((l) => {
          const w = painWeatherByLevel(l)
          const active = l === level
          return (
            <div key={l} className="flex flex-col items-center gap-1.5">
              {active ? (
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: current.color, color: l <= 3 ? '#14212b' : '#ffffff' }}
                >
                  <WeatherIcon name={w.icon as never} size={24} />
                </span>
              ) : (
                <span className="h-10" />
              )}
              <span
                className="w-full rounded-full"
                style={{
                  height: active ? 14 : 8,
                  background: active ? w.color : `color-mix(in srgb, ${w.color} 30%, transparent)`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
        <span>{t.childView.scaleLow}</span>
        <span>{t.childView.scaleHigh}</span>
      </div>
    </div>
  )
}

function AgeControl({ tone, onChange }: { tone: ChildTone; onChange: (tone: ChildTone) => void }) {
  const t = useTranslation()
  return (
    <Segmented
      label={t.childView.ageToggleLabel}
      options={CHILD_TONES.map((value) => ({ value, label: t.childView.ages[value] }))}
      value={tone}
      onChange={onChange}
      pill
    />
  )
}

export function HealthChildView({
  tone,
  onToneChange,
  weather,
  copy,
  illnesses,
  closing,
}: {
  tone: ChildTone
  onToneChange: (tone: ChildTone) => void
  weather: PainWeather | null
  copy: { headline: string; body: string; help: string[] } | null
  illnesses: { id: string; question: string; text: string }[]
  closing: string
}) {
  const t = useTranslation()
  const { icon: ClosingIcon, label: closingText } = splitHelp(closing)

  return (
    <div className="flex flex-col gap-3 px-4 pt-2 pb-28">
      <div className="kids-backdrop" aria-hidden />
      <h1 className="text-title font-bold leading-tight text-center">{t.childView.pageTitle}</h1>

      {!weather || !copy ? (
        <p className="text-control text-center mt-10 leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
          {t.childView.noEntry}
        </p>
      ) : (
        <>
          <AgeControl tone={tone} onChange={onToneChange} />

          <div className="mt-2">
            <WeatherFriend level={weather.level} />
          </div>
          {/* Words in a bubble, as if the weather were speaking. */}
          <div
            className="relative rounded-[22px] px-5 py-5 text-center mt-3"
            style={{ background: 'var(--color-surface)', boxShadow: '0 4px 14px rgba(90, 80, 150, 0.14)' }}
          >
            <span
              aria-hidden
              className="absolute -top-2 left-1/2 -ml-2 w-4 h-4 rotate-45 rounded-[3px]"
              style={{ background: 'var(--color-surface)' }}
            />
            <div className="text-title font-bold leading-snug">{copy.headline}</div>
            <div className="text-body mt-2 leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
              {copy.body}
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-hairline)' }}>
              <WeatherScale level={weather.level} />
            </div>
          </div>

          <h2 className="text-heading font-bold text-center mt-3">{t.childView.howToHelp}</h2>
          <div className="grid grid-cols-2 gap-3">
            {copy.help.map((text, i) => {
              const { icon: I, label } = splitHelp(text)
              const hue = HELP_HUES[i % HELP_HUES.length]
              return (
                <div
                  key={text}
                  className="rounded-[20px] px-3 pt-4 pb-4 flex flex-col items-center text-center gap-2.5"
                  style={{ background: `var(--cat-${hue}-soft)` }}
                >
                  <span className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)' }} aria-hidden>
                    <I size={28} stroke={1.8} style={{ color: `var(--cat-${hue})` }} />
                  </span>
                  <span
                    className="text-body font-semibold leading-snug hyphens-auto"
                    style={{ color: `color-mix(in srgb, var(--cat-${hue}) 65%, var(--color-ink))` }}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          {illnesses.map((illness) => (
            <IllnessCard key={illness.id} question={illness.question} text={illness.text} defaultOpen={illnesses.length === 1} />
          ))}

          <div className="flex flex-col items-center gap-1.5 px-3 mt-2 text-center">
            <ClosingIcon size={22} stroke={1.8} style={{ color: 'var(--color-brand)' }} aria-hidden />
            <p className="text-control leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
              {closingText}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

/** One collapsible explanation. Several illnesses start folded, so the
 * child sees the list of questions first. */
function IllnessCard({ question, text, defaultOpen }: { question: string; text: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-[var(--radius-card)] px-4 py-3.5 mt-1" style={card}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-2.5 text-left">
        <span
          className="inline-flex items-center justify-center shrink-0 rounded-[7px] w-7 h-7"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          aria-hidden
        >
          <IconBulb size={18} stroke={1.8} />
        </span>
        <span className="flex-1 text-body font-semibold">{question}</span>
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
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="text-control mt-3 leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
          {text}
        </div>
      )}
    </div>
  )
}
