// The story's own paper: the dawn of the flyers, light in both modes, as a card or a photo would be.
export const INK = '#1f1d44'
export const MUTED = '#5e5a80'
export const CORAL = '#c44a2c'
export const APRICOT = '#f6c79a'
export const DAWN = 'linear-gradient(180deg,#ffe3d1 0%,#f6e6f6 45%,#efe7fb 100%)'

const COLOURS = ['#f08a6c', '#f6c79a', '#c9b6ee', '#e3a73b', '#a894c9']

/** Where the flecks of confetti go: the same places for the same seed, inside the given box (in % of the screen). */
export function confettiFlecks(n: number, seed: number, x: [number, number], y: [number, number]) {
  let s = seed
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280
  return Array.from({ length: n }, (_, i) => ({
    left: x[0] + r() * (x[1] - x[0]),
    top: y[0] + r() * (y[1] - y[0]),
    size: 4 + r() * 6,
    round: i % 3 !== 0,
    colour: COLOURS[i % COLOURS.length]!,
    turn: Math.round(r() * 90),
  }))
}
