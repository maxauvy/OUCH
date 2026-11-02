import { useEffect } from 'react'
import { useStoredSettings } from './useSettings'
import { clearAudienceFlag, sendWeeklyPing } from '../lib/audience'

/** One try per launch: the app can mount twice (StrictMode) or re-read its settings. */
let tried = false

/**
 * The weekly anonymous "active this week" signal (see lib/audience.ts), sent
 * once the day's page is on show and the app has had a moment to settle, so it
 * never competes with the first paint or with typing. Waits for the stored
 * settings: until they are read, the defaults would stand for the person's
 * choice. Switched off, it forgets its local flag instead.
 */
export function useAudiencePing(): void {
  const stored = useStoredSettings()
  const loaded = stored !== null
  const ready = stored?.onboardingDone === true
  const enabled = stored?.audienceMeasurementEnabled !== false

  useEffect(() => {
    if (!loaded) return
    if (!enabled) {
      clearAudienceFlag()
      return
    }
    if (!ready || tried) return
    tried = true
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000))
    idle(() => void sendWeeklyPing({ audienceMeasurementEnabled: true }))
  }, [loaded, ready, enabled])
}
