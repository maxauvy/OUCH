import { themeFor } from '../lib/theme'
import { useIsDark } from './useIsDark'
import { useSettings } from './useSettings'

/** Literal palette (for charts and anything that can't use CSS vars) for the
 * active light/dark mode. */
export function usePalette() {
  const settings = useSettings()
  return themeFor(useIsDark(settings.theme))
}
