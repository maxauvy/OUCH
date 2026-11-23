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

/** The calendar's tiles in dark mode (see `--color-weather-N-tile` in index.css, which this mirrors): a deep tint of each hue, darker from clear sky to storm and each in its own hue so the five tell apart, the page's ink for the number, a light shade of the hue for the icon and its bars, and a pale one for the icon's cloud. */
export const WEATHER_TILE_DARK = {
  1: { tile: '#5a4520', mark: '#e6edf1', glyph: '#f2bf5e', cloud: '#f2bf5e' },
  2: { tile: '#47432e', mark: '#e6edf1', glyph: '#dcc792', cloud: '#e6d7ad' },
  3: { tile: '#2c323d', mark: '#e6edf1', glyph: '#aeb6c4', cloud: '#aeb6c4' },
  4: { tile: '#1d3653', mark: '#e6edf1', glyph: '#a3c6ec', cloud: '#bcd6f2' },
  5: { tile: '#2b2450', mark: '#e6edf1', glyph: '#bdb2ee', cloud: '#cfc6f4' },
} as const

const LIGHT = {
  paper: '#f3f6f8',
  surface: '#ffffff',
  surfaceRaised: '#f8fafb',
  ink: '#14212b',
  inkMuted: '#566772',
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

/** The two looks of the app (see lib/look.ts), as literal colours: the same
 * values as their `[data-look]` blocks in index.css. Only the neutrals and the
 * accent change; the weather scale is the same in every look. */
// The charts draw the pain and the treatments in `brand` next to the flares in the storm's violet. The
// weather look's indigo (OUCH Duo's) and the lighter look's plum are both too close to that violet, so
// their charts keep a blue instead: slate for the weather look, petrol for the lighter one (data only;
// the screen keeps the indigo and the plum).
const LOOKS = {
  meteo: {
    light: { ...LIGHT, paper: '#f8f3fa', surface: '#ffffff', surfaceRaised: '#fbf8fd', ink: '#1f1d44', inkMuted: '#5e5a80', hairline: '#ece5f4', brand: '#3a5f8f', brandSoft: '#e4ebf4' },
    dark: { ...DARK, paper: '#14121d', surface: '#1d1a29', surfaceRaised: '#242033', ink: '#ece9f6', inkMuted: '#a7a1c2', hairline: 'rgba(180, 160, 230, 0.16)', brand: '#8fb0d1', brandSoft: '#1f2c3d' },
  },

  leger: {
    light: { ...LIGHT, paper: '#fbf8fa', surface: '#ffffff', surfaceRaised: '#f8f4f8', ink: '#2b2236', inkMuted: '#665b72', hairline: '#ebe3ee', brand: '#2f6c86', brandSoft: '#e4eff3' },
    dark: { ...DARK, paper: '#16131b', surface: '#1f1a26', surfaceRaised: '#262030', ink: '#f0eaf6', inkMuted: '#aaa0b9', hairline: 'rgba(196, 181, 238, 0.14)', brand: '#84bdd6', brandSoft: '#17303b' },
  },
} as const

/** The light palette. Used by the exported weather card, which always
 * renders in its fixed light style regardless of the app's live theme (a
 * shared image shouldn't depend on the sender's dark mode). */
export const theme = LIGHT

/** The palette of the mode and, when given, of the look: charts then wear the same accent as the rest of the screen. */
export function themeFor(isDark: boolean, look?: 'meteo' | 'leger') {
  if (look) return LOOKS[look][isDark ? 'dark' : 'light']
  return isDark ? DARK : LIGHT
}
