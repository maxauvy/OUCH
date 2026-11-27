import { useMemo } from 'react'
import { useLoggedEntries } from './useEntries'
import { useSettings } from './useSettings'
import { useEarlyAccess } from '../lib/earlyAccess'
import { flaresApply } from '../lib/flares'
import { sharedFlare, type SharedFlare } from '../lib/sharedFlare'

export interface ImageFlare {
  flare: SharedFlare
  /** The person's sentence for relatives, while a flare is under way only. */
  note?: string
}

/** What the day's image says of a flare: only with the early access, unless the person turned it off, and not for a migraine alone.
 * `date` is the image's day; empty while nothing is noted today, and then there is no image, so nothing to say. */
export function useImageFlare(date: string): ImageFlare | null {
  const settings = useSettings()
  const early = useEarlyAccess()
  const logged = useLoggedEntries()
  const on = early && settings.flareOnImage !== false && flaresApply(settings.illnesses)
  const note = settings.flareImageNote?.trim() || undefined
  return useMemo(() => {
    if (!on || !logged || !date) return null
    const flare = sharedFlare(logged, date)
    if (!flare) return null
    return flare.kind === 'harder' && note ? { flare, note } : { flare }
  }, [on, logged, date, note])
}
