// Generates a realistic 90-day demo history as an encrypted OUCH backup,
// importable from Settings → Backup (password: see DEMO_PASSWORD).
//
//   node scripts/generate-demo-history.mjs [output.json] [end-date YYYY-MM-DD]
//
// Data is deterministic (seeded PRNG) and built so the Trends page has real
// patterns to show: pain follows sleep, stress, pressure drops and flares,
// and eases on days with positive actions.

import { webcrypto as crypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const DEMO_PASSWORD = 'demo'
const DAYS = 90
const output = process.argv[2] ?? 'ouch-demo-90j.json'
const endDate = process.argv[3] ?? new Date().toISOString().slice(0, 10)

// Must match src/lib/crypto.ts
const PBKDF2_ITERATIONS = 600_000
const MAGIC = 'OUCH1'

// mulberry32
let seed = 20260927
function rand() {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const noise = (amp) => (rand() * 2 - 1) * amp
const clamp = (v, lo = 0, hi = 10) => Math.min(hi, Math.max(lo, v))
const round = (v) => Math.round(clamp(v))
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const chance = (p) => rand() < p

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Flare windows (day offsets from start) — a big one and a smaller one.
const FLARES = [
  { start: 24, length: 6, intensity: 3 },
  { start: 63, length: 4, intensity: 2 },
]
function flareBoost(i) {
  for (const f of FLARES) {
    if (i >= f.start && i < f.start + f.length) {
      const mid = f.start + f.length / 2
      return f.intensity * (1 - Math.abs(i - mid) / (f.length / 2 + 1))
    }
  }
  return 0
}

// Period every ~28 days, 5 days long.
const isPeriodDay = (i) => (i + 9) % 28 < 5

const POSITIVE_ACTIONS = [
  'Repos / sieste',
  'Chaleur',
  'Étirements doux',
  'Marche courte',
  'Méditation / respiration',
  'Bain chaud',
  'Kiné / soins',
  'Moment social agréable',
  'Activité plaisir',
]
const NOTES_CALM = [
  'Bonne journée, balade au parc avec les enfants.',
  'Séance de kiné, ça a fait du bien.',
  'Journée tranquille à la maison.',
  'Déjeuner avec une amie, bon moment.',
  'Yoga doux le matin, je me sens plus souple.',
]
const NOTES_HARD = [
  'Réveil difficile, raideur dans tout le corps.',
  'Grosse journée au travail, beaucoup de tension.',
  'Orage dans la soirée, douleurs dès le matin.',
  'Crise, obligée d’annuler ma sortie.',
  'Nuit hachée, très fatiguée.',
  'Trop forcé hier au ménage, je le paie aujourd’hui.',
]

const entries = []
const startDate = addDays(endDate, -(DAYS - 1))
let pressure = 1016
let prevPressure = null
let prevActivity = 5

for (let i = 0; i < DAYS; i++) {
  const date = addDays(startDate, i)
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  const isWeekend = weekday === 0 || weekday === 6

  // Pressure: slow random walk pulled back toward 1015 hPa, with occasional fronts.
  pressure += (1015 - pressure) * 0.15 + noise(4) + (chance(0.08) ? -10 : 0)
  pressure = clamp(pressure, 992, 1032)
  const pressureDelta = prevPressure === null ? undefined : Math.round(pressure - prevPressure)
  prevPressure = pressure

  // Weather falls out of pressure. Summer → autumn: temps drift down.
  const condition =
    pressure < 1000 ? pick(['orageux', 'pluvieux']) :
    pressure < 1008 ? pick(['pluvieux', 'nuageux']) :
    pressure < 1016 ? pick(['nuageux', 'variable']) :
    pick(['ensoleille', 'ensoleille', 'variable'])
  const seasonalTemp = 27 - (i / DAYS) * 9
  const tempC = Math.round(seasonalTemp + noise(3) - (condition === 'pluvieux' || condition === 'orageux' ? 4 : 0))

  // Missed days (~6%), except the last week so the demo looks active.
  if (i < DAYS - 7 && chance(0.06)) continue

  const stress = clamp(isWeekend ? 3 + noise(2) : 5 + noise(2.5))
  const sleepHours = Math.round(clamp(7 - stress * 0.2 + noise(1.3) - flareBoost(i) * 0.4, 4, 9.5) * 2) / 2
  const sleepQuality = clamp((sleepHours - 4) * 1.6 + noise(1.5) - flareBoost(i) * 0.5)

  const helpedCount = Math.max(0, Math.round(1.2 + noise(1.2) + (isWeekend ? 0.6 : 0)))
  const positiveActions = [...new Set(Array.from({ length: helpedCount }, () => pick(POSITIVE_ACTIONS)))]

  const pressureDrop = pressureDelta !== undefined && pressureDelta < -3 ? Math.min(2, -pressureDelta / 5) : 0
  const pain = clamp(
    3.2 +
      (6 - sleepQuality) * 0.35 +
      (stress - 4) * 0.3 +
      pressureDrop +
      (condition === 'orageux' ? 0.8 : 0) +
      flareBoost(i) +
      (isPeriodDay(i) ? 1 : 0) +
      (prevActivity >= 8 ? 1 : 0) - // overdid it yesterday
      positiveActions.length * 0.35 +
      noise(0.9)
  )
  const painLevel = Math.round(pain)

  const activityLevel = round(isWeekend ? 5 + noise(3) : 4 - (pain - 4) * 0.5 + noise(2))
  prevActivity = activityLevel

  const fatigueLevel = round(pain * 0.6 + (7 - sleepQuality) * 0.35 + noise(1))
  const brainFog = round(fatigueLevel * 0.7 + noise(1.3))
  const moodLevel = round(8 - pain * 0.45 - stress * 0.25 + positiveActions.length * 0.4 + noise(1))

  const medications = ['Duloxétine']
  if (painLevel >= 5) medications.push('Paracétamol')
  if (painLevel >= 7 && chance(0.7)) medications.push('Tramadol')
  if (isPeriodDay(i) && painLevel >= 4 && chance(0.6)) medications.push('Ibuprofène')

  const zoneCount = painLevel >= 7 ? 4 : painLevel >= 4 ? 2 : 1
  const zones = new Set(['lowerBack', 'neck', 'shoulders'].slice(0, Math.min(2, zoneCount)))
  const extra = ['upperBack', 'hips', 'legs', 'hands', 'head', 'arms']
  while (zones.size < zoneCount) zones.add(pick(extra))
  if (painLevel >= 8 && chance(0.5)) zones.add('generalized')
  if (isPeriodDay(i) && chance(0.6)) zones.add('stomach')

  let notes
  if (chance(0.3)) notes = painLevel >= 6 ? pick(NOTES_HARD) : pick(NOTES_CALM)

  const loggedAt = new Date(`${date}T${String(19 + Math.floor(rand() * 3)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00`).getTime()

  entries.push({
    date,
    createdAt: loggedAt,
    updatedAt: loggedAt,
    painLevel,
    fatigueLevel,
    sleepQuality: Math.round(sleepQuality),
    sleepHours,
    stressLevel: Math.round(stress),
    brainFog,
    moodLevel,
    activityLevel,
    weather: {
      source: 'manual',
      condition,
      tempC,
      pressureHpa: Math.round(pressure),
      ...(pressureDelta !== undefined && { pressureDeltaFromPrevious: pressureDelta }),
    },
    medications,
    positiveActions,
    painLocations: [...zones],
    periodDay: isPeriodDay(i),
    ...(notes && { notes }),
  })
}

// No `settings` on purpose: import merges settings when present, and a demo
// file shouldn't overwrite the user's language, theme or name.
const bundle = { version: 1, exportedAt: new Date().toISOString(), entries }

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64')
const salt = crypto.getRandomValues(new Uint8Array(16))
const iv = crypto.getRandomValues(new Uint8Array(12))
const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(DEMO_PASSWORD), 'PBKDF2', false, ['deriveKey'])
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
  baseKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt']
)
const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(bundle)))

writeFileSync(
  output,
  JSON.stringify({
    magic: MAGIC,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString(),
    iterations: PBKDF2_ITERATIONS,
  })
)

const avg = entries.reduce((s, e) => s + e.painLevel, 0) / entries.length
console.log(`${entries.length} entries (${startDate} → ${endDate}), avg pain ${avg.toFixed(1)} → ${output} (password: "${DEMO_PASSWORD}")`)
