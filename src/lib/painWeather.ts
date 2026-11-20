import type { LoggedEntry, PainWeather, PainWeatherLevel } from '../db/types'
import { theme } from './theme.ts'

// Display labels for each level live in the active translation
// (`t.painWeatherLevels[level]`), not here.
const LEVELS: Record<PainWeatherLevel, Omit<PainWeather, 'level'>> = {
  1: {
    icon: 'sun',
    color: theme.weather[1].color,
    soft: theme.weather[1].soft,
    ink: theme.weather[1].ink,
    text: 'var(--color-weather-1-text)',
  },
  2: {
    icon: 'cloud-sun',
    color: theme.weather[2].color,
    soft: theme.weather[2].soft,
    ink: theme.weather[2].ink,
    text: 'var(--color-weather-2-text)',
  },
  3: {
    icon: 'cloud',
    color: theme.weather[3].color,
    soft: theme.weather[3].soft,
    ink: theme.weather[3].ink,
    text: 'var(--color-weather-3-text)',
  },
  4: {
    icon: 'cloud-rain',
    color: theme.weather[4].color,
    soft: theme.weather[4].soft,
    ink: theme.weather[4].ink,
    text: 'var(--color-weather-4-text)',
  },
  5: {
    icon: 'cloud-lightning',
    color: theme.weather[5].color,
    soft: theme.weather[5].soft,
    ink: theme.weather[5].ink,
    text: 'var(--color-weather-5-text)',
  },
}

/** The colours of a weather's tile in the calendar, as CSS variables that follow the mode: the fill, the number and bars, the icon (see index.css). */
export function painWeatherTile(level: PainWeatherLevel) {
  return { tile: `var(--color-weather-${level}-tile)`, mark: `var(--color-weather-${level}-mark)`, glyph: `var(--color-weather-${level}-glyph)`, cloud: `var(--color-weather-${level}-cloud)` }
}

/**
 * The day's "pain weather": the pain number alone sets it, on five levels
 * (< 1.5, < 3.5, < 5.5, < 7.5, ≥ 7.5). The same reading everywhere: the sky
 * of today's page, the calendar, the shared card, the kids' page. Fatigue and
 * brain fog no longer weigh in (they did until 0.13): the number the person
 * gives is the weather they see.
 */
export function computePainWeather(entry: Pick<LoggedEntry, 'painLevel'>): PainWeather {
  return painWeatherByLevel(levelForPainValue(entry.painLevel))
}

export function painWeatherByLevel(level: PainWeatherLevel): PainWeather {
  return { level, ...LEVELS[level] }
}

/** Maps a bare 0–10 value (e.g. a bucket average) to the same ordinal color
 * scale, for charts that show pain magnitude without a full entry. */
export function colorForPainValue(value: number): string {
  return LEVELS[levelForPainValue(value)].color
}

/** The whole weather scale left to right, clear sky to storm: the fill of a 0–10 track in the weather look. */
export const WEATHER_SCALE_GRADIENT = `linear-gradient(90deg, ${[1, 2, 3, 4, 5].map((l) => LEVELS[l as PainWeatherLevel].color).join(', ')})`

/** The text shade of the weather a 0–10 value falls in, following the mode (dark on a light page, light on a dark one): readable as an edge or a mark. */
export function inkForPainValue(value: number): string {
  return LEVELS[levelForPainValue(value)].text
}

/** The weather level a bare 0–10 value falls in, on the same thresholds as the day's weather. */
export function levelForPainValue(value: number): PainWeatherLevel {
  if (value < 1.5) return 1
  if (value < 3.5) return 2
  if (value < 5.5) return 3
  if (value < 7.5) return 4
  return 5
}
