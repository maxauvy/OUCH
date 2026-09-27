import { createContext, useContext } from 'react'
import type { DesignStyle } from '../db/types'
import { DEFAULT_SETTINGS } from '../db/types'
import { themeFor } from '../lib/theme'
import { useIsDark } from './useIsDark'
import { useSettings } from './useSettings'

// Provided once in App from the live settings, so the many small UI
// components that branch on the design don't each open their own Dexie
// live query.
export const DesignContext = createContext<DesignStyle>(DEFAULT_SETTINGS.design)

export function useDesign(): DesignStyle {
  return useContext(DesignContext)
}

/** Literal palette (for charts and anything that can't use CSS vars) for the
 * active design and light/dark mode. */
export function usePalette() {
  const settings = useSettings()
  return themeFor(useIsDark(settings.theme), settings.design)
}
