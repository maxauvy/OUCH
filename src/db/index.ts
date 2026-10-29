import Dexie, { type EntityTable } from 'dexie'
import type { BodyZone, DailyEntry, LegacyDailyEntry, LegacySettings, Medication, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'
import { createLegacyConverter } from '../lib/medications'
import { todayISO } from '../lib/dates'
import { buildDemoHistory } from '../lib/demoData'
import { DEMO_DB_NAME, DEMO_LANGUAGE, type DemoLanguage } from '../lib/demoMode'
import { upgradeLegacySettings } from './settingsUpgrade'

export { upgradeLegacySettings }

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
  constructor(name = 'ouch', demoLanguage: DemoLanguage | null = null) {
    super(name)
    // The demo sandbox is filled when it is first created: ninety fictional
    // days counted back from today, in the demo's language.
    if (demoLanguage) {
      this.on('populate', (tx) => {
        const history = buildDemoHistory({ endDate: todayISO(), language: demoLanguage, autoWeather: false })
        tx.table('entries').bulkAdd(history.entries)
        tx.table('medications').bulkAdd(history.medications)
        tx.table('settings').add({ ...DEFAULT_SETTINGS, ...history.settings, id: 1 })
      })
    }
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
    // v6 removed the classic design: the interface style setting is gone.
    this.version(6)
      .stores({
        entries: '++id, &date, painLevel, createdAt',
        settings: 'id',
        medications: 'id, name',
      })
      .upgrade(async (tx) => {
        await tx.table<LegacySettings>('settings').toCollection().modify(upgradeLegacySettings)
      })
    // v7 made the Kids tab optional, off unless asked for. Everyone who was
    // already using the app had it, so they keep it.
    this.version(7)
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

/** The person's journal, or the demo sandbox when this page load is the demo. */
export const db = new OuchDB(DEMO_LANGUAGE ? DEMO_DB_NAME : 'ouch', DEMO_LANGUAGE)

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
