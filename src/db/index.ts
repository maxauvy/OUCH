import Dexie, { type EntityTable } from 'dexie'
import type { BodyZone, DailyEntry, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'

// v1 stored body zones as their French display label directly (e.g. 'Tête').
// v2 introduced stable slugs (e.g. 'head') so labels can be translated —
// this remaps any entries saved under v1.
const V1_BODY_ZONE_TO_SLUG: Record<string, BodyZone> = {
  Tête: 'head',
  Cou: 'neck',
  Épaules: 'shoulders',
  Bras: 'arms',
  Mains: 'hands',
  'Dos haut': 'upperBack',
  'Dos bas': 'lowerBack',
  Poitrine: 'chest',
  Ventre: 'stomach',
  Hanches: 'hips',
  Jambes: 'legs',
  Pieds: 'feet',
  Généralisée: 'generalized',
}

class OuchDB extends Dexie {
  entries!: EntityTable<DailyEntry, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('ouch')
    this.version(1).stores({
      entries: '++id, &date, painLevel, createdAt',
      settings: 'id',
    })
    this.version(2)
      .stores({
        entries: '++id, &date, painLevel, createdAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<DailyEntry>('entries')
          .toCollection()
          .modify((entry) => {
            if (Array.isArray(entry.painLocations)) {
              entry.painLocations = entry.painLocations.map(
                (z) => V1_BODY_ZONE_TO_SLUG[z as string] ?? z
              )
            }
          })
      })
  }
}

export const db = new OuchDB()

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
