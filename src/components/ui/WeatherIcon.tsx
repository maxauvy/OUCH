type IconName = 'sun' | 'cloud-sun' | 'cloud' | 'cloud-rain' | 'cloud-lightning'

/** Simple, consistent weather icon set. Shape carries meaning on its own,
 * so the app reads fine even for colorblind users or in grayscale print. */
export function WeatherIcon({ name, size = 40, className }: { name: IconName; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', fill: 'none', className }

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
          <path d="M26 27 19 38h6l-3 8 11-13h-6l3-6Z" fill="currentColor" />
        </svg>
      )
  }
}
