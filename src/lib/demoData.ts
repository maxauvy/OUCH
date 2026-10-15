// The demo history: ninety fictional days that tell one story every screen
// can show, always counted back from today. Deterministic (seeded generators),
// so the same day gives the same history. One source for the in-app demo and
// for scripts/generate-demo-history.mjs, which wraps it in an encrypted backup.
// Imports carry a `.ts` extension and only erasable syntax is used, so that
// Node can run it as it is.
//
// The story:
// - a flare in late summer, another that leads to a consultation where the
//   duloxetine dose is raised (about four weeks before the end, so it shows
//   in Trends' default 30-day view), pain easing over the following weeks,
//   then a new flare that runs up to yesterday: the Today page opens on its
//   soft "harder days" card (it looks at the days before today). Today's
//   entry is an easier day, so the report counts that flare as over; with
//   `emptyToday` it reads "ongoing". Flares are found relative to the
//   person's own usual pain;
// - an earlier background treatment stopped for side effects, as-needed
//   painkillers with relief ratings;
// - pain following sleep, stress, pressure drops, storms and periods, and
//   "what helped" tags with clear associations (and one reverse one: rest is
//   taken on bad days);
// - the leads of Trends already met: the short walk and the meditation kept
//   for the appointment (so the card opens on a kept lead with its offer of a
//   one-week trial, and the report has its "what the patient noticed"), and
//   rest set aside (the reverse association above), so "leads set aside" is
//   there to open. Sleep and stress are left unanswered, to be tried. Which leads stand out also depends on the day (the
//   weekdays fall differently), so a choice for a lead that is not there that
//   day simply does nothing;
// - settings for a finished setup (name, illness, cycle tracking), so the
//   report and the Kids tab work without going through the setup.
//
// By default the demo opens in the middle of a flare, and the cards that bring
// a lead to the day's page stay quiet in a flare. `calmEnd` ends the last
// flare four days earlier, so Today opens on those cards instead.

import type { DailyEntry, Illness, LoggedEntry, Medication, MedicationIntake, Settings } from '../db/types.ts'
import type { DemoLanguage } from './demoMode.ts'
import { actionKey, choiceFor, findLeads, type LeadChoice, type LeadChoices } from './leads.ts'
import { shiftISO } from './medications.ts'

export interface DemoOptions {
  /** Last day of the history (today, for the in-app demo) */
  endDate: string
  language: DemoLanguage
  /** Days of history; the story always spans the last 90, more adds earlier history */
  days?: number
  illnesses?: Illness[]
  /** Leave the last day empty, so the app opens on an empty Today page */
  emptyToday?: boolean
  /** The weather is fetched on its own: off for the in-app demo, which makes no network call */
  autoWeather?: boolean
  /** End the last flare before the end instead of leaving it going on, so the day's page is not in a flare */
  calmEnd?: boolean
}

export interface DemoHistory {
  entries: DailyEntry[]
  medications: Medication[]
  settings: Partial<Settings>
}

export const DEMO_STORY_DAYS = 90

/** A seeded generator (mulberry32). */
function mulberry32(start: number) {
  let seed = start
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Action {
  name: string
  p: (base: number, weekday: number) => number
  effect: number
}
interface Flare {
  start: number
  length: number
  intensity: number
  ongoing?: boolean
}

export function buildDemoHistory(options: DemoOptions): DemoHistory {
  const { endDate, language, emptyToday = false, autoWeather = true, calmEnd = false } = options
  const illnesses = options.illnesses ?? ['fibromyalgie']
  const STORY_DAYS = DEMO_STORY_DAYS
  const DAYS = Math.max(STORY_DAYS, options.days ?? STORY_DAYS)
  const LEAD = DAYS - STORY_DAYS // days of history before the story

  // Two independent generators: the second drives the medication details, so
  // adding them left the pain history (driven by the first) exactly as it was.
  const rand = mulberry32(20260927)
  const rand2 = mulberry32(7)
  /** Index drawn from a list of weights summing to 1. */
  const weighted = (weights: number[]) => {
    let x = rand2()
    for (let i = 0; i < weights.length - 1; i++) if ((x -= weights[i]!) <= 0) return i
    return weights.length - 1
  }
  const noise = (amp: number) => (rand() * 2 - 1) * amp
  const clamp = (v: number, lo = 0, hi = 10) => Math.min(hi, Math.max(lo, v))
  const round = (v: number) => Math.round(clamp(v))
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!
  const chance = (p: number) => rand() < p

  // Day offsets from the start. The second flare leads to the consultation;
  // the last one starts after three calmer weeks on the new dose, and runs up
  // to yesterday (day 88), so it is still going on when the demo opens. Its
  // level stays high until the end instead of peaking and easing.
  const FLARES: Flare[] = [
    ...(LEAD > 0 ? [{ start: -70, length: 7, intensity: 4 }] : []),
    { start: 22, length: 6, intensity: 3.5 },
    { start: 53, length: 7, intensity: 2.5 },
    calmEnd ? { start: 79, length: 6, intensity: 4.2 } : { start: 84, length: 5, intensity: 5.2, ongoing: true },
  ]
  function flareBoost(i: number) {
    for (const f of FLARES) {
      if (i >= f.start && i < f.start + f.length) {
        if (f.ongoing) return f.intensity * Math.min(1, (i - f.start + 1) / 3)
        const mid = f.start + f.length / 2
        return f.intensity * (1 - Math.abs(i - mid) / (f.length / 2 + 1))
      }
    }
    return 0
  }

  // Period every ~28 days, 5 days long.
  const isPeriodDay = (i: number) => (i + 9) % 28 < 5

  // Duloxetine goes from 30 to 60 mg at a consultation after the second flare,
  // with a week of nausea right after; the higher dose takes about three weeks
  // to show. Pregabalin, taken twice a day, was stopped early because of
  // drowsiness: it also clouds the mind while it lasts. Amitriptyline (long
  // histories only) is started in the middle of an earlier flare, its dose
  // raised a few weeks later, so that its reviews carry the "during a flare"
  // and "another change at the same time" notes.
  const DOSE_CHANGE_DAY = 62
  const AMITRIPTYLINE_START_DAY = -68
  const AMITRIPTYLINE_DOSE_DAY = -45
  const PREGABALIN_STOP_DAY = 18
  const KEY_DAYS = new Set([PREGABALIN_STOP_DAY, DOSE_CHANGE_DAY])

  /** What helped: how likely on a day of a given baseline pain, and how much
   * it eases pain. Rest is mostly taken on bad days, so it ends up associated
   * with more pain; Trends is honest about that being an association. */
  const ACTIONS: Action[] = [
    { name: 'Méditation / respiration', p: () => 0.35, effect: 1.5 },
    { name: 'Marche courte', p: (base) => (base < 4.5 ? 0.6 : 0.08), effect: 1.2 },
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
  const KEY_NOTES: Record<number, string> = {
    [PREGABALIN_STOP_DAY]: 'Arrêt de la prégabaline avec l’accord du médecin : trop de somnolence.',
    [DOSE_CHANGE_DAY]: 'Consultation chez le médecin traitant : duloxétine passée de 30 à 60 mg.',
  }

  const entries: DailyEntry[] = []
  const startDate = shiftISO(endDate, -(STORY_DAYS - 1)) // first day of the story
  const firstDate = shiftISO(endDate, -(DAYS - 1))
  const doseChangeDate = shiftISO(startDate, DOSE_CHANGE_DAY)
  const now = Date.parse(`${endDate}T20:00:00Z`)
  const MED = { amitrip: 'demo-amitriptyline', prega: 'demo-pregabaline', dulox: 'demo-duloxetine', para: 'demo-paracetamol', trama: 'demo-tramadol', ibu: 'demo-ibuprofene' }
  const medications: Medication[] = (
    [
      {
        id: MED.dulox, name: 'Duloxétine', regimen: 'scheduled', reason: 'Douleurs diffuses',
        periods: [
          { start: shiftISO(startDate, -200), end: shiftISO(doseChangeDate, -1), dose: { amount: 30, unit: 'mg' }, perDay: 1 },
          { start: doseChangeDate, dose: { amount: 60, unit: 'mg' }, perDay: 1 },
        ],
      },
      {
        id: MED.prega, name: 'Prégabaline', regimen: 'scheduled', reason: 'Douleurs neuropathiques',
        periods: [{ start: shiftISO(startDate, -35), end: shiftISO(startDate, PREGABALIN_STOP_DAY), dose: { amount: 75, unit: 'mg' }, perDay: 2, stopReason: 'sideEffects' }],
      },
      ...(LEAD > 0
        ? [{
            id: MED.amitrip, name: 'Amitriptyline', regimen: 'scheduled', reason: 'Douleurs et sommeil',
            periods: [
              { start: shiftISO(startDate, AMITRIPTYLINE_START_DAY), end: shiftISO(startDate, AMITRIPTYLINE_DOSE_DAY - 1), dose: { amount: 10, unit: 'mg' }, perDay: 1 },
              { start: shiftISO(startDate, AMITRIPTYLINE_DOSE_DAY), dose: { amount: 20, unit: 'mg' }, perDay: 1 },
            ],
          }]
        : []),
      { id: MED.para, name: 'Paracétamol', regimen: 'asNeeded', reason: 'Douleur', periods: [{ start: shiftISO(startDate, -400), dose: { amount: 1, unit: 'g' }, perDay: 3 }] },
      { id: MED.trama, name: 'Tramadol', regimen: 'asNeeded', reason: 'Poussées', periods: [{ start: shiftISO(startDate, -120), dose: { amount: 50, unit: 'mg' }, perDay: 2 }] },
      { id: MED.ibu, name: 'Ibuprofène', regimen: 'asNeeded', reason: 'Douleurs de règles', periods: [{ start: shiftISO(startDate, -900), dose: { amount: 400, unit: 'mg' }, perDay: 3 }] },
    ] as Omit<Medication, 'createdAt' | 'updatedAt'>[]
  ).map((m) => ({ ...m, createdAt: now, updatedAt: now }))

  function intakesFor(names: string[], painLevel: number, i: number): MedicationIntake[] {
    return names.map((name): MedicationIntake => {
      if (name === 'Duloxétine') {
        const missed = !KEY_DAYS.has(i) && rand2() < 0.04
        const nausea = i > DOSE_CHANGE_DAY && i <= DOSE_CHANGE_DAY + 8 && rand2() < 0.7
        return { medicationId: MED.dulox, doses: missed ? 0 : 1, ...(nausea && !missed && { sideEffects: ['Nausées'] }) }
      }
      if (name === 'Prégabaline') {
        const doses = rand2() < 0.1 ? 1 : 2
        const effects = [rand2() < 0.6 && 'Somnolence', rand2() < 0.2 && 'Prise de poids'].filter((e): e is string => typeof e === 'string')
        return { medicationId: MED.prega, doses, ...(effects.length && { sideEffects: effects }) }
      }
      if (name === 'Amitriptyline') {
        const drowsy = rand2() < 0.15
        return { medicationId: MED.amitrip, doses: 1, ...(drowsy && { sideEffects: ['Somnolence'] }) }
      }
      if (name === 'Paracétamol') {
        const doses = Math.max(1, (painLevel >= 7 ? 3 : painLevel >= 6 ? 2 : 1) - (rand2() < 0.25 ? 1 : 0))
        return { medicationId: MED.para, doses, relief: weighted([0.15, 0.5, 0.3, 0.05]) as 0 | 1 | 2 | 3 }
      }
      if (name === 'Tramadol') {
        const dizzy = rand2() < 0.3
        return { medicationId: MED.trama, doses: painLevel >= 8 ? 2 : 1, relief: weighted([0.05, 0.25, 0.5, 0.2]) as 0 | 1 | 2 | 3, ...(dizzy && { sideEffects: ['Vertiges'] }) }
      }
      return { medicationId: MED.ibu, doses: rand2() < 0.5 ? 2 : 1, relief: weighted([0.05, 0.2, 0.5, 0.25]) as 0 | 1 | 2 | 3 }
    })
  }

  let pressure = 1016
  let prevPressure: number | null = null
  let prevActivity = 5

  for (let i = 0; i < DAYS; i++) {
    const s = i - LEAD // day of the story (negative before it)
    const date = shiftISO(firstDate, i)
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6

    // Pressure: slow random walk pulled back toward 1015 hPa, with occasional fronts.
    pressure += (1015 - pressure) * 0.15 + noise(4) + (chance(0.08) ? -10 : 0)
    pressure = clamp(pressure, 992, 1032)
    const pressureDelta = prevPressure === null ? undefined : Math.round(pressure - prevPressure)
    prevPressure = pressure

    // Weather falls out of pressure. Summer to autumn: temps drift down.
    const condition =
      pressure < 1000 ? pick(['orageux', 'pluvieux'] as const) :
      pressure < 1008 ? pick(['pluvieux', 'nuageux'] as const) :
      pressure < 1016 ? pick(['nuageux', 'variable'] as const) :
      pick(['ensoleille', 'ensoleille', 'variable'] as const)
    const seasonalTemp = 27 - (s / STORY_DAYS) * 9
    const tempC = Math.round(seasonalTemp + noise(3) - (condition === 'pluvieux' || condition === 'orageux' ? 4 : 0))

    // Missed days (~6%), except key days and the last week so the demo looks active.
    if (i < DAYS - 7 && !KEY_DAYS.has(s) && chance(0.06)) continue
    if (emptyToday && i === DAYS - 1) continue

    const stress = clamp(isWeekend ? 3 + noise(2.5) : 5.5 + noise(3.5))
    const sleepHours = Math.round(clamp(7.2 - (stress - 4) * 0.3 + noise(1.6) - flareBoost(s) * 0.4, 4, 9.5) * 2) / 2
    const sleepQuality = clamp((sleepHours - 4.5) * 2 + noise(1.8) - flareBoost(s) * 0.6)

    const doseEffect = s < DOSE_CHANGE_DAY ? 0 : Math.min(1, (s - DOSE_CHANGE_DAY) / 21) * 0.9
    const amitripEffect = LEAD > 0 && s >= AMITRIPTYLINE_START_DAY ? Math.min(1, (s - AMITRIPTYLINE_START_DAY) / 21) * 0.8 : 0
    const onPregabalin = s >= -35 && s <= PREGABALIN_STOP_DAY
    const isStorm = condition === 'orageux'

    const pressureDrop = pressureDelta !== undefined && pressureDelta < -3 ? Math.min(2, -pressureDelta / 5) : 0
    // Pain before whatever helped: decides what gets tried that day.
    const basePain =
      4.8 +
      (6 - sleepQuality) * 0.3 +
      (stress - 4) * 0.3 +
      pressureDrop +
      (isStorm ? 0.8 : 0) +
      flareBoost(s) +
      (isPeriodDay(i) ? 1 : 0) +
      (prevActivity >= 8 ? 1 : 0) - // overdid it yesterday
      doseEffect -
      amitripEffect +
      noise(0.9)
    // Today opens the demo: an ordinary middling day, not a random extreme.
    const isToday = i === DAYS - 1
    const helped = ACTIONS.filter((a) => chance(a.p(basePain, weekday))).slice(0, isToday ? 1 : undefined)
    const positiveActions = helped.map((a) => a.name)
    // Never quite pain-free: that is what living with a chronic illness looks like.
    // With `calmEnd` the last days are ordinary ones: a stray spike there would
    // keep the flare going.
    const calmCap = calmEnd && s >= STORY_DAYS - 4 ? 4.4 : 10
    const pain = isToday ? 4 : Math.min(calmCap, clamp(basePain - helped.reduce((sum, a) => sum + a.effect, 0), 1))
    const painLevel = Math.round(pain)

    const activityLevel = round(isWeekend ? 5.5 + noise(3.5) : 4.5 - (pain - 4) * 0.6 + noise(2.5))
    prevActivity = activityLevel

    const fatigueLevel = round(1 + pain * 0.6 + (6 - sleepQuality) * 0.3 + noise(1.8))
    const brainFog = round(fatigueLevel * 0.7 + (onPregabalin ? 1.5 : 0) + noise(1.8))
    const moodLevel = round(7.5 - pain * 0.5 - (stress - 4) * 0.25 + positiveActions.length * 0.4 + noise(1.8))

    const taken = onPregabalin ? ['Prégabaline', 'Duloxétine'] : ['Duloxétine']
    if (amitripEffect > 0 || (LEAD > 0 && s >= AMITRIPTYLINE_START_DAY)) taken.push('Amitriptyline')
    if (painLevel >= 5) taken.push('Paracétamol')
    if (painLevel >= 7 && chance(0.7)) taken.push('Tramadol')
    if (isPeriodDay(i) && painLevel >= 4 && chance(0.6)) taken.push('Ibuprofène')

    const zoneCount = painLevel >= 7 ? 4 : painLevel >= 4 ? 2 : 1
    const zones = new Set<string>(['lowerBack', 'neck', 'shoulders'].slice(0, Math.min(2, zoneCount)))
    const extra = ['upperBack', 'hips', 'legs', 'hands', 'head', 'arms']
    while (zones.size < zoneCount) zones.add(pick(extra))
    if (painLevel >= 8 && chance(0.5)) zones.add('generalized')
    if (isPeriodDay(i) && chance(0.6)) zones.add('stomach')

    // Notes follow what happened, most specific first.
    const noteRoll = rand()
    const notes =
      KEY_NOTES[s] ??
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
        // The last two weeks come from the phone's position, the rest was typed.
        source: i >= DAYS - 14 ? 'auto' : 'manual',
        condition,
        tempC,
        pressureHpa: Math.round(pressure),
        ...(pressureDelta !== undefined && { pressureDeltaFromPrevious: pressureDelta }),
      },
      intakes: intakesFor(taken, painLevel, s),
      positiveActions,
      painLocations: [...zones] as DailyEntry['painLocations'],
      periodDay: isPeriodDay(i),
      ...(notes && { notes }),
    })
  }

  // What the person answered to the leads on Trends, worked out from the
  // history itself: the numbers a choice was made on are the ones the lead has
  // (a set-aside lead comes back when it gets stronger). English tags make
  // English keys.
  const recent = findLeads((entries as LoggedEntry[]).filter((e) => e.date >= shiftISO(endDate, -30)))
  const answerKey = (name: string) => `action:${actionKey(language === 'en' ? (EN_STRINGS[name] ?? name) : name)}`
  const leadChoices: LeadChoices = {}
  const answer = (key: string, frenchKey: string, choice: LeadChoice['choice'], gap: number) => {
    const lead = recent.find((l) => l.key === frenchKey)
    leadChoices[key] = lead ? choiceFor(lead, choice, now) : { choice, at: now, gap, days: 30 }
  }
  answer(answerKey('Marche courte'), 'action:marche courte', 'kept', -2.5)
  answer(answerKey('Méditation / respiration'), 'action:méditation / respiration', 'kept', -1.9)
  answer(answerKey('Repos / sieste'), 'action:repos / sieste', 'dismissed', 2.5)

  // A finished setup, so the demo opens on the app itself with the report and
  // the Kids tab filled in. The theme is left out: it stays whatever the device
  // already uses. The language is the one of the data: tags, notes and
  // medication names are stored as plain text, so a device in the other
  // language would show them next to its own suggestions ("Marche courte"
  // beside "Short walk").
  const settings: Partial<Settings> = {
    language,
    onboardingDone: true,
    displayName: 'Camille',
    illnesses,
    illnessStatus: { fibromyalgie: 'diagnosed' },
    illnessYear: { fibromyalgie: 2019 },
    parentGender: 'maman',
    kidsTabEnabled: true,
    cycleTrackingEnabled: true,
    autoWeatherEnabled: autoWeather,
    ...(autoWeather ? { autoWeatherLat: 45.764, autoWeatherLon: 4.8357 } : {}),
    autoWeatherLabel: 'Lyon',
    enabledFactors: ['fatigue', 'sleep', 'stress', 'brainFog', 'mood', 'activity', 'weather', 'medications', 'positiveActions', 'painLocations', 'notes'],
    leadChoices,
  }

  const history = { entries, medications, settings }
  return language === 'en' ? translate(history) : history
}

// English: the tags, notes and medication names are stored as plain text, so
// an English UI would show them in French. They are translated in the data.
const EN_STRINGS: Record<string, string> = {
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
  'Duloxétine': 'Duloxetine', 'Prégabaline': 'Pregabalin', 'Amitriptyline': 'Amitriptyline', 'Paracétamol': 'Paracetamol', 'Tramadol': 'Tramadol', 'Ibuprofène': 'Ibuprofen',
  'Douleurs diffuses': 'Widespread pain', 'Douleurs neuropathiques': 'Neuropathic pain', 'Douleur': 'Pain', 'Poussées': 'Flares', 'Douleurs de règles': 'Period pain', 'Douleurs et sommeil': 'Pain and sleep',
  'Nausées': 'Nausea', 'Somnolence': 'Drowsiness', 'Prise de poids': 'Weight gain', 'Vertiges': 'Dizziness',
}

function translate<T>(value: T): T {
  if (typeof value === 'string') return (EN_STRINGS[value] ?? value) as T
  if (Array.isArray(value)) return value.map(translate) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translate(v)])) as T
  return value
}
