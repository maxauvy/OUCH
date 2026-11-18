// What a stored look choice stands for, kept apart from lib/look.ts (which
// stamps the page as soon as it is loaded) so it can be tested on its own.

export type Look = 'meteo' | 'leger'

/** What is stored for the lighter look; nothing is stored for the default one. */
export const LIGHT_LOOK_VALUE = 'leger'
/** What the earlier switch stored to bring back the plainer look: those people get the lighter look. */
const OLD_CLASSIC = 'classic'

/** The look a stored value stands for. Anything unknown, or nothing, is the default. */
export function parseLook(stored: string | null): Look {
  return stored === LIGHT_LOOK_VALUE || stored === OLD_CLASSIC ? 'leger' : 'meteo'
}
