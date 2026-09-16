import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DEFAULT_SETTINGS, type Settings } from '../db/types'

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get(1), [])
  return s ?? DEFAULT_SETTINGS
}
