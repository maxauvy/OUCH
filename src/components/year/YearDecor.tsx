import { theme } from '../../lib/theme'
import type { YearReview } from '../../lib/yearReview'
import { confettiFlecks } from './yearStyle'

// The year's small decorations, apart from the story so the card on the day's page does not load it.

/** A few flecks in the dawn colours, set once in a corner, never moving: festive without stirring. */
export function Confetti({ n, seed, x = [0, 100], y = [0, 30], fall = false }: { n: number; seed: number; x?: [number, number]; y?: [number, number]; fall?: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {confettiFlecks(n, seed, x, y).map((c, i) => (
        <span key={i} className={fall ? 'absolute ys-fall' : 'absolute'} style={{ left: `${c.left}%`, top: `${c.top}%`, width: c.size, height: c.size, borderRadius: c.round ? '50%' : 2, background: c.colour, opacity: 0.75, transform: `rotate(${c.turn}deg)`, animationDelay: fall ? `${i * 50}ms` : undefined }} />
      ))}
    </div>
  )
}

/** One square per day noted, in the colour of its weather; the gentlest days glow a little. */
export function YearSky({ days, size, animate = false }: { days: YearReview['days']; size?: number; animate?: boolean }) {
  const n = days.length
  const s = size ?? (n <= 100 ? 18 : n <= 200 ? 13 : 10)
  const cols = n <= 100 ? 12 : n <= 200 ? 16 : 22
  return (
    <div aria-hidden className="grid justify-center" style={{ gridTemplateColumns: `repeat(${cols}, ${s}px)`, gap: Math.max(2, Math.round(s / 5)) }}>
      {days.map((d, k) => (
        <span
          key={d.date}
          className={animate ? 'ys-pop' : undefined}
          style={{
            width: s,
            height: s,
            borderRadius: s / 3.5,
            background: theme.weather[d.level].color,
            boxShadow: d.level === 1 ? '0 0 6px 1px rgba(227,167,59,.7)' : undefined,
            // Row by row, a little after the title: the sky fills in about a second and a half, then holds still.
            animationDelay: animate ? `${300 + Math.floor(k / cols) * Math.min(110, 1200 / Math.ceil(n / cols)) + (k % cols) * 12}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}
