import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DEFAULT_SETTINGS, type Settings } from '../db/types'

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get(1), [])
  // Merge so settings saved before a new field existed (e.g. `language`) fall
  // back to its default instead of being `undefined`.
  return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS
}

/** The settings as stored, or null until they have been read. One query for
 * both, unlike `useSettings` plus `useSettingsLoaded`, which resolve apart:
 * for anything that writes settings back based on what it read, that gap is
 * a window where the defaults are mistaken for what is stored. */
export function useStoredSettings(): Settings | null {
  const stored = useLiveQuery(async () => ({ settings: await db.settings.get(1) }), [])
  return stored ? { ...DEFAULT_SETTINGS, ...stored.settings } : null
}

/** False until the stored settings have been read. `useSettings` falls back
 * to the defaults meanwhile, which is wrong for anything decided once, like
 * whether to show the first-run setup. */
export function useSettingsLoaded(): boolean {
  return useLiveQuery(() => db.settings.get(1).then(() => true), []) ?? false
}
