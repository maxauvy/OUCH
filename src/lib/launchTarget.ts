// The shortcuts of the app's icon (a long press on Android): each opens the app
// on a screen, by a word in the address (`?go=souffler`). Anything else is ignored.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

export type LaunchTarget = 'souffler' | 'douleur'

/** The screen asked for by the address the app was opened with, if it is one we know. */
/** Opened from the card a doctor hands out (`?de=medecin`): the setup says so and asks for the next appointment. */
export function fromDoctor(search: string): boolean {
  return new URLSearchParams(search).get('de') === 'medecin'
}

export function launchTarget(search: string): LaunchTarget | null {
  const go = new URLSearchParams(search).get('go')
  return go === 'souffler' || go === 'douleur' ? go : null
}
