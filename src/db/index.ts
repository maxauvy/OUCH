import Dexie, { type EntityTable } from 'dexie'
import type { BodyZone, DailyEntry, LegacyDailyEntry, LegacySettings, Medication, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'
import { createLegacyConverter } from '../lib/medications'

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
  medications!: EntityTable<Medication, 'id'>
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
    // v3 replaced free-text medication names with a medication registry and
    // per-day intakes. Each distinct name becomes an 'unspecified'
    // medication the person can describe later; nothing is guessed.
    this.version(3)
      .stores({
        entries: '++id, &date, painLevel, createdAt',
        settings: 'id',
        medications: 'id, name',
      })
      .upgrade(async (tx) => {
        const entries = tx.table<LegacyDailyEntry>('entries')
        const all = await entries.orderBy('date').toArray()
        const { intakesFor, created } = createLegacyConverter([])
        const intakesById = new Map(all.map((e) => [e.id, intakesFor(e.medications, e.date)]))
        await tx.table<Medication>('medications').bulkAdd(created)
        await entries.toCollection().modify((entry) => {
          const intakes = intakesById.get(entry.id)
          if (intakes?.length) entry.intakes = intakes
          delete entry.medications
        })
      })
    // v4 turned the single illness (childIllness) into a list. It was
    // shown on the child view, so it is kept as the first tracked illness.
    this.version(4)
      .stores({
        entries: '++id, &date, painLevel, createdAt',
        settings: 'id',
        medications: 'id, name',
      })
      .upgrade(async (tx) => {
        await tx.table<LegacySettings>('settings').toCollection().modify(upgradeLegacySettings)
      })
    // v5 dropped the 'cycle' factor, which duplicated cycleTrackingEnabled
    // without doing anything. Whoever switched it on wanted cycle tracking.
    this.version(5)
      .stores({
        entries: '++id, &date, painLevel, createdAt',
        settings: 'id',
        medications: 'id, name',
      })
      .upgrade(async (tx) => {
        await tx.table<LegacySettings>('settings').toCollection().modify(upgradeLegacySettings)
      })
  }
}

/** In place, and safe to run on current settings: moves a pre-v4
 * `childIllness` into `illnesses`, and turns a pre-v5 'cycle' factor into
 * `cycleTrackingEnabled`. */
export function upgradeLegacySettings(s: LegacySettings): asserts s is Partial<Settings> {
  if (s.childIllness && !s.illnesses) s.illnesses = [s.childIllness]
  delete s.childIllness
  if (s.enabledFactors?.includes('cycle')) {
    s.enabledFactors = s.enabledFactors.filter((k) => k !== 'cycle')
    s.cycleTrackingEnabled = true
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
