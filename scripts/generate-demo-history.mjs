// Generates a 90-day demo history as an encrypted OUCH backup, importable
// from Settings → Backup (password: see DEMO_PASSWORD).
//
//   node scripts/generate-demo-history.mjs [output.json] [end-date YYYY-MM-DD]
//   DEMO_LANG=en node scripts/generate-demo-history.mjs …   (English tags, notes and medication names)
//
// Built to demo the app straight after import. Data is deterministic
// (seeded PRNG) and tells one story every screen can show:
// - a flare in late summer, a consultation where the duloxetine dose is
//   raised (about four weeks before the end, so it shows in Trends' default
//   30-day view), then pain easing over the following weeks;
// - an earlier background treatment stopped for side effects, as-needed
//   painkillers with relief ratings;
// - pain following sleep, stress, pressure drops, storms and periods, and
//   "what helped" tags with clear associations (and one reverse one: rest is
//   taken on bad days);
// - settings for a finished setup (name, illness, cycle tracking), so the
//   report and the Kids tab work without going through the setup.

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

// Day offsets from the start. The second flare leads to the consultation;
// the last, milder and shorter, comes once the new dose has settled.
const FLARES = [
  { start: 22, length: 6, intensity: 3.5 },
  { start: 53, length: 7, intensity: 2.5 },
  { start: 77, length: 4, intensity: 2.5 },
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

// Duloxetine goes from 30 to 60 mg at a consultation after the second flare,
// with a week of nausea right after; the higher dose takes about three weeks
// to show. Pregabalin, taken twice a day, was stopped early because of
// drowsiness — it also clouds the mind while it lasts.
const DOSE_CHANGE_DAY = 62
const PREGABALIN_STOP_DAY = 18
const KEY_DAYS = new Set([PREGABALIN_STOP_DAY, DOSE_CHANGE_DAY])

/** What helped: how likely on a day of a given baseline pain, and how much
 * it eases pain. Rest is mostly taken on bad days, so it ends up associated
 * with more pain — Trends is honest about that being an association. */
const ACTIONS = [
  { name: 'Méditation / respiration', p: () => 0.35, effect: 1.5 },
  { name: 'Marche courte', p: (base) => (base < 4.5 ? 0.45 : 0.12), effect: 0.8 },
  { name: 'Kiné / soins', p: (_, weekday) => (weekday === 2 ? 0.9 : 0), effect: 1.4 },
  { name: 'Étirements doux', p: () => 0.3, effect: 0.6 },
  { name: 'Bain chaud', p: () => 0.2, effect: 0.6 },
  { name: 'Moment social agréable', p: (_, weekday) => (weekday === 0 || weekday === 6 ? 0.5 : 0.12), effect: 1 },
  { name: 'Repos / sieste', p: (base) => (base >= 6 ? 0.75 : 0.08), effect: 0.3 },
]

const NOTES_CALM = [
  'Bonne journée, balade au parc avec les enfants.',
  'Journée tranquille à la maison.',
  'Déjeuner avec une amie, bon moment.',
  'Yoga doux le matin, je me sens plus souple.',
  'J’ai pu jardiner une petite heure sans douleur particulière.',
]
const NOTES_HARD = [
  'Réveil difficile, raideur dans tout le corps.',
  'Grosse journée au travail, beaucoup de tension.',
  'Nuit hachée, très fatiguée.',
  'Trop forcé hier au ménage, je le paie aujourd’hui.',
]
const NOTE_FLARE = ['Crise, obligée d’annuler ma sortie.', 'Poussée : douleurs partout, je reste allongée.', 'Troisième jour de crise, le tramadol soulage un peu.']
const NOTE_KINE = ['Séance de kiné, ça a fait du bien.', 'Kiné : travail sur le dos, détendue après.']
const NOTE_STORM = 'Orage dans la soirée, douleurs dès le matin.'
const NOTE_PERIOD = 'Règles, ventre et bas du dos douloureux.'
const KEY_NOTES = {
  [PREGABALIN_STOP_DAY]: 'Arrêt de la prégabaline avec l’accord du médecin : trop de somnolence.',
  [DOSE_CHANGE_DAY]: 'Consultation chez le médecin traitant : duloxétine passée de 30 à 60 mg.',
}

const entries = []
const startDate = addDays(endDate, -(DAYS - 1))
const doseChangeDate = addDays(startDate, DOSE_CHANGE_DAY)
const now = Date.parse(`${endDate}T20:00:00Z`)
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
      const missed = !KEY_DAYS.has(i) && rand2() < 0.04
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

  // Missed days (~6%), except key days and the last week so the demo looks active.
  if (i < DAYS - 7 && !KEY_DAYS.has(i) && chance(0.06)) continue

  const stress = clamp(isWeekend ? 3 + noise(2.5) : 5.5 + noise(3.5))
  const sleepHours = Math.round(clamp(7.2 - (stress - 4) * 0.3 + noise(1.6) - flareBoost(i) * 0.4, 4, 9.5) * 2) / 2
  const sleepQuality = clamp((sleepHours - 4.5) * 2 + noise(1.8) - flareBoost(i) * 0.6)

  const doseEffect = i < DOSE_CHANGE_DAY ? 0 : Math.min(1, (i - DOSE_CHANGE_DAY) / 21) * 0.9
  const onPregabalin = i <= PREGABALIN_STOP_DAY
  const isStorm = condition === 'orageux'

  const pressureDrop = pressureDelta !== undefined && pressureDelta < -3 ? Math.min(2, -pressureDelta / 5) : 0
  // Pain before whatever helped: decides what gets tried that day.
  const basePain =
    4.8 +
    (6 - sleepQuality) * 0.3 +
    (stress - 4) * 0.3 +
    pressureDrop +
    (isStorm ? 0.8 : 0) +
    flareBoost(i) +
    (isPeriodDay(i) ? 1 : 0) +
    (prevActivity >= 8 ? 1 : 0) - // overdid it yesterday
    doseEffect +
    noise(0.9)
  // Today opens the demo: an ordinary middling day, not a random extreme.
  const isToday = i === DAYS - 1
  const helped = ACTIONS.filter((a) => chance(a.p(basePain, weekday))).slice(0, isToday ? 1 : undefined)
  const positiveActions = helped.map((a) => a.name)
  // Never quite pain-free: that is what living with a chronic illness looks like.
  const pain = isToday ? 4 : clamp(basePain - helped.reduce((s, a) => s + a.effect, 0), 1)
  const painLevel = Math.round(pain)

  const activityLevel = round(isWeekend ? 5.5 + noise(3.5) : 4.5 - (pain - 4) * 0.6 + noise(2.5))
  prevActivity = activityLevel

  const fatigueLevel = round(1 + pain * 0.6 + (6 - sleepQuality) * 0.3 + noise(1.8))
  const brainFog = round(fatigueLevel * 0.7 + (onPregabalin ? 1.5 : 0) + noise(1.8))
  const moodLevel = round(7.5 - pain * 0.5 - (stress - 4) * 0.25 + positiveActions.length * 0.4 + noise(1.8))

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

  // Notes follow what happened, most specific first.
  const noteRoll = rand()
  const notes =
    KEY_NOTES[i] ??
    (flareBoost(i) > 1.5 && noteRoll < 0.7 ? pick(NOTE_FLARE) :
    isStorm && painLevel >= 5 && noteRoll < 0.6 ? NOTE_STORM :
    positiveActions.includes('Kiné / soins') && noteRoll < 0.5 ? pick(NOTE_KINE) :
    isPeriodDay(i) && (i + 9) % 28 === 0 ? NOTE_PERIOD :
    noteRoll < 0.2 ? (painLevel >= 6 ? pick(NOTES_HARD) : pick(NOTES_CALM)) :
    undefined)

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

// A finished setup, so the demo opens on the app itself with the report and
// the Kids tab filled in. Language and theme are left out: they stay
// whatever the device already uses.
const settings = {
  onboardingDone: true,
  displayName: 'Camille',
  illnesses: ['fibromyalgie'],
  parentGender: 'maman',
  cycleTrackingEnabled: true,
  enabledFactors: ['fatigue', 'sleep', 'stress', 'brainFog', 'mood', 'activity', 'weather', 'medications', 'positiveActions', 'painLocations', 'notes'],
}

// DEMO_LANG=en: the tags, notes and medication names above are stored as plain
// text, so an English UI would show them in French. Translate them in the bundle.
const EN_STRINGS = {
  'Méditation / respiration': 'Meditation / breathing', 'Marche courte': 'Short walk', 'Kiné / soins': 'Physiotherapy / care',
  'Étirements doux': 'Gentle stretching', 'Bain chaud': 'Warm bath', 'Moment social agréable': 'Pleasant social time', 'Repos / sieste': 'Rest / nap',
  'Bonne journée, balade au parc avec les enfants.': 'Good day, walk in the park with the kids.',
  'Journée tranquille à la maison.': 'Quiet day at home.',
  'Déjeuner avec une amie, bon moment.': 'Lunch with a friend, lovely time.',
  'Yoga doux le matin, je me sens plus souple.': 'Gentle yoga in the morning, feeling more supple.',
  'J’ai pu jardiner une petite heure sans douleur particulière.': 'Managed an hour of gardening without much pain.',
  'Réveil difficile, raideur dans tout le corps.': 'Rough wake-up, stiff all over.',
  'Grosse journée au travail, beaucoup de tension.': 'Big day at work, lots of tension.',
  'Nuit hachée, très fatiguée.': 'Broken night, very tired.',
  'Trop forcé hier au ménage, je le paie aujourd’hui.': 'Overdid the cleaning yesterday, paying for it today.',
  'Crise, obligée d’annuler ma sortie.': 'Flare-up, had to cancel my outing.',
  'Poussée : douleurs partout, je reste allongée.': 'Flare: pain everywhere, staying in bed.',
  'Troisième jour de crise, le tramadol soulage un peu.': 'Third day of the flare, tramadol helps a little.',
  'Séance de kiné, ça a fait du bien.': 'Physio session, it did me good.',
  'Kiné : travail sur le dos, détendue après.': 'Physio: worked on my back, relaxed afterwards.',
  'Orage dans la soirée, douleurs dès le matin.': 'Storm in the evening, pain since the morning.',
  'Règles, ventre et bas du dos douloureux.': 'Period, painful belly and lower back.',
  'Arrêt de la prégabaline avec l’accord du médecin : trop de somnolence.': 'Stopped pregabalin with the doctor’s agreement: too much drowsiness.',
  'Consultation chez le médecin traitant : duloxétine passée de 30 à 60 mg.': 'GP appointment: duloxetine raised from 30 to 60 mg.',
  'Duloxétine': 'Duloxetine', 'Prégabaline': 'Pregabalin', 'Paracétamol': 'Paracetamol', 'Ibuprofène': 'Ibuprofen',
  'Douleurs diffuses': 'Widespread pain', 'Douleurs neuropathiques': 'Neuropathic pain', 'Douleur': 'Pain', 'Poussées': 'Flares', 'Douleurs de règles': 'Period pain',
  'Nausées': 'Nausea', 'Somnolence': 'Drowsiness', 'Prise de poids': 'Weight gain', 'Vertiges': 'Dizziness',
}
const translate = (v) => (typeof v === 'string' ? (EN_STRINGS[v] ?? v) : Array.isArray(v) ? v.map(translate) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, translate(x)])) : v)
const bundle0 = { version: 2, exportedAt: new Date().toISOString(), entries, medications, settings }
const bundle = process.env.DEMO_LANG === 'en' ? translate(bundle0) : bundle0

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
