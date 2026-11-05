import type { PainWeatherLevel } from '../../db/types'
import { painWeatherByLevel } from '../../lib/painWeather'

const INK = '#4a3b57'

/** The day's weather as a small friendly character: the sun when the day is easy, a cloud that gets heavier as it gets harder, always with a gentle face. On the hardest days it is resting, never upset: the page is meant to reassure a child. Decorative: the words next to it say the same. */
export function WeatherFriend({ level, size = 132 }: { level: PainWeatherLevel; size?: number }) {
  const sunny = level <= 2
  const body = sunny ? '#ffd36b' : `color-mix(in srgb, ${painWeatherByLevel(level).color} 45%, #ffffff)`
  const resting = level >= 4
  const smile = level === 3 ? 'M54 82 q10 8 20 0' : level >= 4 ? 'M56 82 q8 5 16 0' : 'M50 80 q14 14 28 0'
  return (
    <svg viewBox="0 0 128 128" width={size} height={size} aria-hidden className="mx-auto block -mb-4">
      {sunny && (
        <g stroke="#f2b24a" strokeWidth="5" strokeLinecap="round">
          <path d="M64 8v12M64 108v12M8 64h12M108 64h12M24 24l8 8M96 96l8 8M104 24l-8 8M32 96l-8 8" />
        </g>
      )}
      {sunny ? (
        <circle cx="64" cy="64" r="34" fill={body} />
      ) : (
        <g style={{ fill: body }}>
          <circle cx="42" cy="70" r="24" />
          <circle cx="68" cy="56" r="28" />
          <circle cx="90" cy="72" r="22" />
          <rect x="30" y="68" width="74" height="28" rx="14" />
        </g>
      )}
      {level === 2 && (
        <g fill="#ffffff" opacity=".95">
          <circle cx="86" cy="94" r="14" />
          <circle cx="102" cy="98" r="11" />
          <rect x="74" y="94" width="40" height="15" rx="7.5" />
        </g>
      )}
      {level === 4 && (
        <g stroke="#7fa3cf" strokeWidth="4" strokeLinecap="round">
          <path d="M44 108l-3 8M64 108l-3 8M84 108l-3 8" />
        </g>
      )}
      {level === 5 && <path d="M70 100l-8 12h8l-6 12 14-16h-8l6-8z" fill="#f2c14e" />}
      <g fill={INK} stroke={INK} strokeLinecap="round">
        {resting ? (
          <>
            <path d="M46 68q6 5 12 0M70 68q6 5 12 0" fill="none" strokeWidth="3.5" />
          </>
        ) : (
          <>
            <circle cx="52" cy="66" r="4" stroke="none" />
            <circle cx="76" cy="66" r="4" stroke="none" />
          </>
        )}
        <path d={smile} fill="none" strokeWidth="4" />
      </g>
      <g fill="#ff9d8a" opacity=".55">
        <circle cx="42" cy="78" r="5" />
        <circle cx="86" cy="78" r="5" />
      </g>
    </svg>
  )
}
