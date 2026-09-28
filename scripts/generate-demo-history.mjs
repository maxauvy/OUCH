// Generates a realistic 90-day demo history as an encrypted OUCH backup,
// importable from Settings → Backup (password: see DEMO_PASSWORD).
//
//   node scripts/generate-demo-history.mjs [output.json] [end-date YYYY-MM-DD]
//
// Data is deterministic (seeded PRNG) and built so the Trends page has real
// patterns to show: pain follows sleep, stress, pressure drops and flares,
// and eases on days with positive actions. Medications use the structured
// registry (schema v3): an ongoing treatment whose dose is raised halfway
// (pain eases over the following weeks), a second one stopped early for side
// effects, and as-needed painkillers with relief ratings.

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
// Second, independent PRNG for medication details, so adding them left the
// pain history (driven by `rand`) exactly as it was.
let seed2 = 7
function rand2() {
  seed2 = (seed2 + 0x6d2b79f5) | 0
  let t = Math.imul(seed2 ^ (seed2 >>> 15), 1 | seed2)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
/** Index drawn from a list of weights summing to 1. */
function weighted(weights) {
  let x = rand2()
  for (let i = 0; i < weights.length - 1; i++) if ((x -= weights[i]) <= 0) return i
  return weights.length - 1
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

// Duloxetine goes from 30 to 60 mg halfway through (a typical dose change
// after a consultation), with a week of nausea right after.
const DOSE_CHANGE_DAY = 45
const doseChangeDate = addDays(startDate, DOSE_CHANGE_DAY)
const now = Date.parse(`${endDate}T20:00:00Z`)
// Pregabalin, taken twice a day, is stopped in the first weeks because of
// drowsiness — it also clouds the mind while it lasts.
const PREGABALIN_STOP_DAY = 18
const MED = { prega: 'demo-pregabaline', dulox: 'demo-duloxetine', para: 'demo-paracetamol', trama: 'demo-tramadol', ibu: 'demo-ibuprofene' }
const medications = [
  {
    id: MED.dulox, name: 'Duloxétine', regimen: 'scheduled', reason: 'Douleurs diffuses',
    periods: [
      { start: addDays(startDate, -200), end: addDays(doseChangeDate, -1), dose: { amount: 30, unit: 'mg' }, perDay: 1 },
      { start: doseChangeDate, dose: { amount: 60, unit: 'mg' }, perDay: 1 },
    ],
  },
  {
    id: MED.prega, name: 'Prégabaline', regimen: 'scheduled', reason: 'Douleurs neuropathiques',
    periods: [{ start: addDays(startDate, -35), end: addDays(startDate, PREGABALIN_STOP_DAY), dose: { amount: 75, unit: 'mg' }, perDay: 2, stopReason: 'sideEffects' }],
  },
  { id: MED.para, name: 'Paracétamol', regimen: 'asNeeded', reason: 'Douleur', periods: [{ start: addDays(startDate, -400), dose: { amount: 1, unit: 'g' }, perDay: 3 }] },
  { id: MED.trama, name: 'Tramadol', regimen: 'asNeeded', reason: 'Poussées', periods: [{ start: addDays(startDate, -120), dose: { amount: 50, unit: 'mg' }, perDay: 2 }] },
  { id: MED.ibu, name: 'Ibuprofène', regimen: 'asNeeded', reason: 'Douleurs de règles', periods: [{ start: addDays(startDate, -900), dose: { amount: 400, unit: 'mg' }, perDay: 3 }] },
].map((m) => ({ ...m, createdAt: now, updatedAt: now }))

function intakesFor(names, painLevel, i) {
  return names.map((name) => {
    if (name === 'Duloxétine') {
      const missed = rand2() < 0.04
      const nausea = i > DOSE_CHANGE_DAY && i <= DOSE_CHANGE_DAY + 8 && rand2() < 0.7
      return { medicationId: MED.dulox, doses: missed ? 0 : 1, ...(nausea && !missed && { sideEffects: ['Nausées'] }) }
    }
    if (name === 'Prégabaline') {
      const doses = rand2() < 0.1 ? 1 : 2
      const effects = [rand2() < 0.6 && 'Somnolence', rand2() < 0.2 && 'Prise de poids'].filter(Boolean)
      return { medicationId: MED.prega, doses, ...(effects.length && { sideEffects: effects }) }
    }
    if (name === 'Paracétamol') {
      const doses = Math.max(1, (painLevel >= 7 ? 3 : painLevel >= 6 ? 2 : 1) - (rand2() < 0.25 ? 1 : 0))
      return { medicationId: MED.para, doses, relief: weighted([0.15, 0.5, 0.3, 0.05]) }
    }
    if (name === 'Tramadol') {
      const dizzy = rand2() < 0.3
      return { medicationId: MED.trama, doses: painLevel >= 8 ? 2 : 1, relief: weighted([0.05, 0.25, 0.5, 0.2]), ...(dizzy && { sideEffects: ['Vertiges'] }) }
    }
    return { medicationId: MED.ibu, doses: rand2() < 0.5 ? 2 : 1, relief: weighted([0.05, 0.2, 0.5, 0.25]) }
  })
}
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

  // The higher duloxetine dose takes about three weeks to show.
  const doseEffect = i < DOSE_CHANGE_DAY ? 0 : Math.min(1, (i - DOSE_CHANGE_DAY) / 21) * 0.9
  const onPregabalin = i <= PREGABALIN_STOP_DAY

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
      positiveActions.length * 0.35 -
      doseEffect +
      noise(0.9)
  )
  const painLevel = Math.round(pain)

  const activityLevel = round(isWeekend ? 5 + noise(3) : 4 - (pain - 4) * 0.5 + noise(2))
  prevActivity = activityLevel

  const fatigueLevel = round(pain * 0.6 + (7 - sleepQuality) * 0.35 + noise(1))
  const brainFog = round(fatigueLevel * 0.7 + (onPregabalin ? 1.5 : 0) + noise(1.3))
  const moodLevel = round(8 - pain * 0.45 - stress * 0.25 + positiveActions.length * 0.4 + noise(1))

  const medications = onPregabalin ? ['Prégabaline', 'Duloxétine'] : ['Duloxétine']
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
    intakes: intakesFor(medications, painLevel, i),
    positiveActions,
    painLocations: [...zones],
    periodDay: isPeriodDay(i),
    ...(notes && { notes }),
  })
}

// No `settings` on purpose: import merges settings when present, and a demo
// file shouldn't overwrite the user's language, theme or name.
const bundle = { version: 2, exportedAt: new Date().toISOString(), entries, medications }

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
