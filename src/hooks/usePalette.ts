import { themeFor } from '../lib/theme'
import { useIsDark } from './useIsDark'
import { useSettings } from './useSettings'
import { useLook } from '../lib/look'

/** Literal palette (for charts and anything that can't use CSS vars) for the
 * active light/dark mode and look. */
export function usePalette() {
  const settings = useSettings()
  const look = useLook()
  return themeFor(useIsDark(settings.theme), look)
}
