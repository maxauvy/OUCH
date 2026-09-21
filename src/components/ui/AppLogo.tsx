import { useId } from 'react'

/** The OUCH app icon (same artwork as public/favicon.svg), inlined so it scales crisply and needs no request. */
export function AppLogo({ size = 56, className }: { size?: number; className?: string }) {
  const gradientId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e3a73b" />
          <stop offset="55%" stopColor="#a894c9" />
          <stop offset="100%" stopColor="#7c6fa8" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${gradientId})`} />
      <g transform="translate(281 300) scale(1.12)">
        <g transform="translate(-78 -72)">
          <circle r="66" fill="#ffd27a" />
          <g stroke="#ffd27a" strokeWidth="14" strokeLinecap="round">
            <line x1="-90" y1="0" x2="-110" y2="0" />
            <line x1="-63.6" y1="-63.6" x2="-77.8" y2="-77.8" />
            <line x1="0" y1="-90" x2="0" y2="-110" />
            <line x1="63.6" y1="-63.6" x2="77.8" y2="-77.8" />
            <line x1="-63.6" y1="63.6" x2="-77.8" y2="77.8" />
          </g>
        </g>
        <g fill="#ffffff">
          <rect x="-140" y="0" width="280" height="110" rx="55" />
          <circle cx="20" cy="-5" r="74" />
          <circle cx="-65" cy="20" r="52" />
        </g>
        <path
          d="M-116 50H-60L-38 8-8 92 22 12 40 50H116"
          fill="none"
          stroke="#7c6fa8"
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
