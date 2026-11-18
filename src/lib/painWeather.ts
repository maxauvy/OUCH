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
  return { tile: `var(--color-weather-${level}-tile)`, mark: `var(--color-weather-${level}-mark)`, glyph: `var(--color-weather-${level}-glyph)` }
}

/**
 * Turns the day's measures into a single "pain weather" reading.
 * Pain dominates (60%); fatigue and brain fog nudge it (25% / 15%) since a day
 * can feel heavier than the pain score alone suggests. Falls back to pain
 * alone when the other two weren't logged.
 */
export function computePainWeather(entry: Pick<LoggedEntry, 'painLevel' | 'fatigueLevel' | 'brainFog'>): PainWeather {
  const parts: { value: number; weight: number }[] = [{ value: entry.painLevel, weight: 0.6 }]
  if (typeof entry.fatigueLevel === 'number') parts.push({ value: entry.fatigueLevel, weight: 0.25 })
  if (typeof entry.brainFog === 'number') parts.push({ value: entry.brainFog, weight: 0.15 })

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
  const score = parts.reduce((s, p) => s + (p.value * p.weight) / totalWeight, 0)

  let level: PainWeatherLevel
  if (score < 1.5) level = 1
  else if (score < 3.5) level = 2
  else if (score < 5.5) level = 3
  else if (score < 7.5) level = 4
  else level = 5

  return { level, ...LEVELS[level] }
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
