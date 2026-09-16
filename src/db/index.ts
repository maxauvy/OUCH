import Dexie, { type EntityTable } from 'dexie'
import type { DailyEntry, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'

class AccalmieDB extends Dexie {
  entries!: EntityTable<DailyEntry, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('accalmie')
    this.version(1).stores({
      entries: '++id, &date, painLevel, createdAt',
      settings: 'id',
    })
  }
}

export const db = new AccalmieDB()

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(1)
  if (s) return s
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next = { ...current, ...patch, id: 1 as const }
  await db.settings.put(next)
  return next
}

export function todayISO(d = new Date()): string {
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}
