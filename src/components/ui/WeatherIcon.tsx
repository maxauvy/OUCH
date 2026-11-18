import type { CSSProperties } from 'react'
import { useRichLook } from '../../lib/look'

type IconName = 'sun' | 'cloud-sun' | 'cloud' | 'cloud-rain' | 'cloud-lightning'

/** Simple, consistent weather icon set. Shape carries meaning on its own,
 * so the app reads fine even for colorblind users or in grayscale print. */
export function WeatherIcon({
  name,
  size = 40,
  className,
  style,
}: {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
}) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', fill: 'none', className, style, 'aria-hidden': true as const }
  // The weather look: two tones. The cloud white (light in dark mode) ringed with the day's colour, the sun always warm, blue drops, a yellow bolt.
  if (useRichLook()) return <DuoIcon name={name} common={common} />

  switch (name) {
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="10" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="24"
              y1="6"
              x2="24"
              y2="1"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${deg} 24 24)`}
            />
          ))}
        </svg>
      )
    case 'cloud-sun':
      return (
        <svg {...common}>
          <g opacity="0.9">
            <circle cx="17" cy="17" r="7" fill="currentColor" />
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <line
                key={deg}
                x1="17"
                y1="5"
                x2="17"
                y2="1.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                transform={`rotate(${deg} 17 17)`}
              />
            ))}
          </g>
          <path
            d="M14 36a8 8 0 0 1 1-16 10 10 0 0 1 19 3 7 7 0 0 1-2 13H14Z"
            fill="currentColor"
          />
        </svg>
      )
    case 'cloud':
      return (
        <svg {...common}>
          <path
            d="M12 34a9 9 0 0 1 1.2-18 11 11 0 0 1 21 3.4A8 8 0 0 1 33 34H12Z"
            fill="currentColor"
          />
        </svg>
      )
    case 'cloud-rain':
      return (
        <svg {...common}>
          <path
            d="M11 28a9 9 0 0 1 1.2-18 11 11 0 0 1 21 3.4A8 8 0 0 1 32 28H11Z"
            fill="currentColor"
          />
          {[15, 24, 33].map((x, i) => (
            <line
              key={x}
              x1={x}
              y1={33 + (i % 2) * 2}
              x2={x - 3}
              y2={42 + (i % 2) * 2}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )
    case 'cloud-lightning':
      return (
        <svg {...common}>
          <path
            d="M11 26a9 9 0 0 1 1.2-18 11 11 0 0 1 21 3.4A8 8 0 0 1 32 26H11Z"
            fill="currentColor"
          />
          {/* Centered under the cloud, whose middle is at x = 20, not 24 */}
          <path d="M20 27 13 38h6l-3 8 11-13h-6l3-6Z" fill="currentColor" />
        </svg>
      )
  }
}

const SUN = { fill: '#f6c768', ring: '#c98a1a', rays: '#e3a73b' }
const CLOUD = { fill: 'var(--wx-cloud, #ffffff)' }
const RAIN = { fill: 'var(--wx-rain, #5e9bd6)' }
const BOLT = { fill: '#f2c14e', stroke: '#c98a1a' }
/** The same cloud for rain and storm, a little higher to leave room under it. */
const HIGH_CLOUD = 'M13 30h21a8 8 0 0 0 .8-16 11 11 0 0 0-21.6 2.6A6.8 6.8 0 0 0 13 30z'

function DuoIcon({ name, common }: { name: IconName; common: Record<string, unknown> }) {
  switch (name) {
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="10" fill={SUN.fill} stroke={SUN.ring} strokeWidth="2.4" />
          <path d="M24 5v4M24 39v4M5 24h4M39 24h4M10.6 10.6l2.8 2.8M34.6 34.6l2.8 2.8M10.6 37.4l2.8-2.8M34.6 13.4l2.8-2.8" stroke={SUN.rays} strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'cloud-sun':
      return (
        <svg {...common}>
          <circle cx="18" cy="16" r="7" fill={SUN.fill} stroke={SUN.ring} strokeWidth="2.2" />
          <path d="M18 4.5v2M6.5 16h2M9.8 7.8l1.4 1.4M26.2 7.8l-1.4 1.4" stroke={SUN.rays} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M17 40h18a7 7 0 0 0 .6-14 9.6 9.6 0 0 0-18.6 2.2A5.9 5.9 0 0 0 17 40z" style={CLOUD} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
      )
    case 'cloud':
      return (
        <svg {...common}>
          <path d="M22 30h16a6.5 6.5 0 0 0 .5-13 8.6 8.6 0 0 0-16.6 2A5.4 5.4 0 0 0 22 30z" fill="currentColor" opacity="0.35" />
          <path d="M12 38h20a7.6 7.6 0 0 0 .7-15.2 10.4 10.4 0 0 0-20.2 2.4A6.4 6.4 0 0 0 12 38z" style={CLOUD} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
      )
    case 'cloud-rain':
      return (
        <svg {...common}>
          <path d={HIGH_CLOUD} style={CLOUD} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path
            d="M17 35c1.6 2.6 2.4 4 2.4 5a2.4 2.4 0 0 1-4.8 0c0-1 .8-2.4 2.4-5zM25.5 35c1.6 2.6 2.4 4 2.4 5a2.4 2.4 0 0 1-4.8 0c0-1 .8-2.4 2.4-5zM34 35c1.6 2.6 2.4 4 2.4 5a2.4 2.4 0 0 1-4.8 0c0-1 .8-2.4 2.4-5z"
            style={RAIN}
          />
        </svg>
      )
    case 'cloud-lightning':
      return (
        <svg {...common}>
          <path d="M13 29h21a8 8 0 0 0 .8-16 11 11 0 0 0-21.6 2.6A6.8 6.8 0 0 0 13 29z" fill="currentColor" opacity="0.3" />
          <path d="M13 29h21a8 8 0 0 0 .8-16 11 11 0 0 0-21.6 2.6A6.8 6.8 0 0 0 13 29z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M26 30l-5.5 8h6l-4 8.5 9.5-11h-6.5L29 30z" fill={BOLT.fill} stroke={BOLT.stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )
  }
}
