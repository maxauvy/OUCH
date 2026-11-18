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

/** The calendar's tiles in dark mode (see `--color-weather-N-tile` in index.css, which this mirrors): a deep tint of each hue, the page's ink for the number and a light shade of the hue for the icon. */
export const WEATHER_TILE_DARK = {
  1: { tile: '#48402b', mark: '#e6edf1', glyph: '#e3a73b' },
  2: { tile: '#414136', mark: '#e6edf1', glyph: '#c7ab68' },
  3: { tile: '#373c45', mark: '#e6edf1', glyph: '#b3aebf' },
  4: { tile: '#283744', mark: '#e6edf1', glyph: '#8fb0d1' },
  5: { tile: '#262a3a', mark: '#e6edf1', glyph: '#b3abc8' },
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
const LOOKS = {
  meteo: {
    light: { ...LIGHT, paper: '#f4f6f9', surface: '#ffffff', surfaceRaised: '#f7f9fb', ink: '#1d2433', inkMuted: '#5a6577', hairline: '#e1e6ee', brand: '#3a5f8f', brandSoft: '#e4ebf4' },
    dark: { ...DARK, paper: '#11151c', surface: '#1b212b', surfaceRaised: '#212834', ink: '#e7ecf3', inkMuted: '#9aa6b7', hairline: 'rgba(150, 170, 200, 0.16)', brand: '#8fb0d1', brandSoft: '#1f2c3d' },
  },
  // The charts draw the pain and the treatments in `brand` next to the flares in the storm's violet: the
  // lighter look's plum is too close to that violet, so its charts take a petrol blue instead (data only;
  // the screen keeps the plum).
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
