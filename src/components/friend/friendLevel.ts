import type { PainWeatherLevel } from '../../db/types'
import { useTodayEntry } from '../../hooks/useEntries'
import { levelForPainValue, painWeatherByLevel } from '../../lib/painWeather'

// What decides the friend of the day (see Friend.tsx): which weather it takes, its colours, where it stands.

export type FriendEyes = 'open' | 'closed'
export type FriendMouth = 'smile' | 'o' | 'calm'

export const FRIEND_INK = 'var(--friend-ink)'

/** The weather the friend takes before anything is noted today: a sun with a few clouds. */
const UNNOTED: PainWeatherLevel = 2

/** The level the friend takes for a pain value, or before anything is noted. */
export function friendLevel(painLevel: number | undefined): PainWeatherLevel {
  return painLevel === undefined ? UNNOTED : levelForPainValue(painLevel)
}

/** Today's friend, from the pain noted today. */
export function useFriendLevel(): PainWeatherLevel {
  return friendLevel(useTodayEntry()?.painLevel)
}

export const isSunny = (level: PainWeatherLevel) => level <= 2
export const isResting = (level: PainWeatherLevel) => level >= 4

/** The colour of the friend's body: the sun, or the cloud tinted by the day's weather. */
export function friendBody(level: PainWeatherLevel): string {
  return isSunny(level) ? 'var(--friend-sun)' : `color-mix(in srgb, ${painWeatherByLevel(level).color} 45%, #ffffff)`
}

/** Where the friend stands on the 200 x 150 pictures of the exercises: centred on (100, 76), a little smaller. */
export const ON_STAGE = 'translate(45.6 21.6) scale(0.85)'
