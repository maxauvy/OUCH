// Palette for anything that can't lean on CSS custom properties (canvas /
// SVG chart libraries, and the exported weather card). Mirrors index.css's
// --color-* tokens. The weather ordinal scale and the brand accent stay
// constant across modes on purpose — the color coding of a "hard day" or
// the brand hue shouldn't shift with the viewer's theme, only the neutrals
// (ink/surface/hairline) that need to contrast against the mode's background.

const WEATHER = {
  1: { color: '#e3a73b', soft: '#fbf0dc' },
  2: { color: '#c7ab68', soft: '#f3ecd9' },
  3: { color: '#9b95a6', soft: '#eae7ee' },
  4: { color: '#5e7ea3', soft: '#e1e9f1' },
  5: { color: '#574a7a', soft: '#e7e2f0' },
} as const

const LIGHT = {
  paper: '#faf7f2',
  surface: '#ffffff',
  surfaceRaised: '#fffdf9',
  ink: '#2b2733',
  inkMuted: '#6f6a7c',
  hairline: '#e7e1d8',
  brand: '#7c6fa8',
  brandSoft: '#efeaf9',
  weather: WEATHER,
}

const DARK = {
  paper: '#17151c',
  surface: '#211e29',
  surfaceRaised: '#2a2633',
  ink: '#f1eef7',
  inkMuted: '#a79fbb',
  hairline: 'rgba(180, 170, 200, 0.16)',
  brand: '#a89bd6',
  brandSoft: '#322c47',
  weather: WEATHER,
}

/** Default export — the light palette. Used by the exported weather card,
 * which always renders in its fixed light style regardless of the app's
 * live theme (a shared image shouldn't depend on the sender's dark mode). */
export const theme = LIGHT

export function themeFor(isDark: boolean) {
  return isDark ? DARK : LIGHT
}
