import type { DailyEntry, PainWeather, PainWeatherLevel } from '../db/types'
import { theme } from './theme'

const LEVELS: Record<PainWeatherLevel, Omit<PainWeather, 'level'>> = {
  1: { label: 'Ciel dégagé', icon: 'sun', color: theme.weather[1].color, soft: theme.weather[1].soft },
  2: { label: 'Quelques nuages', icon: 'cloud-sun', color: theme.weather[2].color, soft: theme.weather[2].soft },
  3: { label: 'Nuageux', icon: 'cloud', color: theme.weather[3].color, soft: theme.weather[3].soft },
  4: { label: 'Pluie', icon: 'cloud-rain', color: theme.weather[4].color, soft: theme.weather[4].soft },
  5: { label: 'Orage', icon: 'cloud-lightning', color: theme.weather[5].color, soft: theme.weather[5].soft },
}

/**
 * Turns the day's measures into a single "pain weather" reading.
 * Pain dominates (60%); fatigue and brain fog nudge it (25% / 15%) since a day
 * can feel heavier than the pain score alone suggests. Falls back to pain
 * alone when the other two weren't logged.
 */
export function computePainWeather(entry: Pick<DailyEntry, 'painLevel' | 'fatigueLevel' | 'brainFog'>): PainWeather {
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
  let level: PainWeatherLevel
  if (value < 1.5) level = 1
  else if (value < 3.5) level = 2
  else if (value < 5.5) level = 3
  else if (value < 7.5) level = 4
  else level = 5
  return LEVELS[level].color
}
