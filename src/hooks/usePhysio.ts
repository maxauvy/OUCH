import type { Settings } from '../db/types'
import { useEarlyAccess } from '../lib/earlyAccess'
import { physioActive } from '../lib/physio'

/** « Suivi kiné » is on: switched on in the settings, on a device with the early access. */
export function usePhysio(settings: Pick<Settings, 'physioTracking'> | undefined): boolean {
  return physioActive(settings, useEarlyAccess())
}
