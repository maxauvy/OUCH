import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DEFAULT_SETTINGS, type Settings } from '../db/types'

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get(1), [])
  // Merge so settings saved before a new field existed (e.g. `language`) fall
  // back to its default instead of being `undefined`.
  return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS
}

/** False until the stored settings have been read. `useSettings` falls back
 * to the defaults meanwhile, which is wrong for anything decided once, like
 * whether to show the first-run setup. */
export function useSettingsLoaded(): boolean {
  return useLiveQuery(() => db.settings.get(1).then(() => true), []) ?? false
}
