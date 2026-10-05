// Palette for anything that can't lean on CSS custom properties (canvas /
// SVG chart libraries, and the exported weather card). Mirrors index.css's
// --color-* tokens. The weather ordinal scale and the brand accent stay
// constant across modes on purpose — the color coding of a "hard day" or
// the brand hue shouldn't shift with the viewer's theme, only the neutrals
// (ink/surface/hairline) that need to contrast against the mode's background.

// `ink` is a darker shade of each hue for text and icons on light
// backgrounds (its own `soft` tint, white): ≥ 4.6:1 on all of
// them, where the lighter weathers' `color` falls under 2:1.
const WEATHER = {
  1: { color: '#e3a73b', soft: '#fbf0dc', ink: '#8b662f' },
  2: { color: '#c7ab68', soft: '#f3ecd9', ink: '#776647' },
  3: { color: '#9b95a6', soft: '#eae7ee', ink: '#6a6473' },
  4: { color: '#5e7ea3', soft: '#e1e9f1', ink: '#506989' },
  5: { color: '#574a7a', soft: '#e7e2f0', ink: '#574a7a' },
} as const

const LIGHT = {
  paper: '#f3f6f8',
  surface: '#ffffff',
  surfaceRaised: '#f8fafb',
  ink: '#14212b',
  inkMuted: '#5b6b76',
  hairline: '#e1e7eb',
  brand: '#0d5c8c',
  brandSoft: '#e3eef6',
  weather: WEATHER,
}

const DARK = {
  paper: '#0e1418',
  surface: '#172026',
  surfaceRaised: '#1d2830',
  ink: '#e6edf1',
  inkMuted: '#93a3ae',
  hairline: 'rgba(160, 185, 200, 0.16)',
  brand: '#62aee0',
  brandSoft: '#173247',
  weather: WEATHER,
}

/** The light palette. Used by the exported weather card, which always
 * renders in its fixed light style regardless of the app's live theme (a
 * shared image shouldn't depend on the sender's dark mode). */
export const theme = LIGHT

export function themeFor(isDark: boolean) {
  return isDark ? DARK : LIGHT
}
