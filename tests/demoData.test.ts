// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildDemoHistory, DEMO_STORY_DAYS } from '../src/lib/demoData.ts'
import { sanitizeBackup } from '../src/lib/backupSanitize.ts'
import { detectFlares } from '../src/lib/flares.ts'
import type { LoggedEntry } from '../src/db/types.ts'
import { sanitizeSettings } from '../src/lib/backupSanitize.ts'
import { flareUnderWay } from '../src/lib/hardDays.ts'
import { arrangeLeads, findLeads } from '../src/lib/leads.ts'
import { todayMessages } from '../src/lib/todayMessages.ts'
import { weeklyFinding } from '../src/lib/weeklySentence.ts'
import { reportTrials } from '../src/lib/leadTrial.ts'
import { shiftISO } from '../src/lib/dates.ts'

const END = '2026-10-12'
const logged = (h: ReturnType<typeof buildDemoHistory>) => h.entries as LoggedEntry[]

test('the same day gives the same history', () => {
  assert.deepEqual(buildDemoHistory({ endDate: END, language: 'fr' }), buildDemoHistory({ endDate: END, language: 'fr' }))
})

test('the demo notes a morning stiffness that follows the pain', () => {
  const { entries, settings } = buildDemoHistory({ endDate: END, language: 'fr' })
  assert.ok(settings.enabledFactors?.includes('morningStiffness'))
  const bands = ['none', 'lt30', '30to60', '1to2h', 'gt2h']
  assert.ok(entries.every((e) => e.morningStiffness && bands.includes(e.morningStiffness)))
  const rank = (e: (typeof entries)[number]) => bands.indexOf(e.morningStiffness!)
  assert.ok(entries.filter((e) => (e.painLevel ?? 0) >= 7).every((e) => rank(e) === 3))
  assert.ok(entries.filter((e) => (e.painLevel ?? 0) < 3).every((e) => rank(e) === 0))
})

test('the demo notes the night wakings and the interference from the day, with no draw of their own', () => {
  const { entries, settings } = buildDemoHistory({ endDate: END, language: 'fr' })
  assert.ok(settings.enabledFactors?.includes('nightWaking') && settings.enabledFactors.includes('dailyInterference'))
  assert.ok(entries.every((e) => [0, 1, 2].includes(e.nightWakings!)))
  assert.ok(entries.every((e) => e.dailyInterference === Math.round(e.painLevel! * 0.8)))
})

test('ninety days counted back from the end date, most of them logged, the last week always', () => {
  const h = buildDemoHistory({ endDate: END, language: 'fr' })
  const dates = h.entries.map((e) => e.date)
  assert.equal(dates[0] >= shiftISO(END, -(DEMO_STORY_DAYS - 1)), true)
  assert.equal(dates.at(-1), END)
  assert.ok(h.entries.length >= 70 && h.entries.length <= DEMO_STORY_DAYS, String(h.entries.length))
  for (let i = 0; i < 7; i++) assert.ok(dates.includes(shiftISO(END, -i)), `day -${i}`)
  assert.deepEqual(dates, [...dates].sort())
})

test('it holds together: a backup of it is accepted without anything skipped', () => {
  for (const language of ['fr', 'en'] as const) {
    const h = buildDemoHistory({ endDate: END, language })
    const back = sanitizeBackup({ version: 2, exportedAt: '2026-10-12T00:00:00Z', ...h })
    assert.ok(back, language)
    assert.equal(back.skipped, 0, language)
    assert.equal(back.entries.length, h.entries.length)
    assert.equal(back.medications.length, h.medications.length)
  }
})

test('a flare is still going on the day before the end, and today is an easier day', () => {
  const h = buildDemoHistory({ endDate: END, language: 'fr' })
  const episodes = detectFlares(logged(h), { asOf: shiftISO(END, -1) })
  const last = episodes.at(-1)
  assert.ok(last?.ongoing, 'ongoing as of yesterday')
  assert.equal(h.entries.at(-1)?.painLevel, 4)
})

test('with an empty today the last day is left out', () => {
  const h = buildDemoHistory({ endDate: END, language: 'fr', emptyToday: true })
  assert.equal(h.entries.at(-1)?.date, shiftISO(END, -1))
})

test('the settings describe a finished setup, with statuses, and no network weather unless asked', () => {
  const h = buildDemoHistory({ endDate: END, language: 'fr', autoWeather: false })
  assert.equal(h.settings.onboardingDone, true)
  assert.equal(h.settings.kidsTabEnabled, true)
  assert.equal(h.settings.autoWeatherEnabled, false)
  assert.equal(h.settings.autoWeatherLat, undefined)
  assert.deepEqual(h.settings.illnessStatus, { fibromyalgie: 'diagnosed' })
  assert.equal(h.settings.illnessYear?.fibromyalgie, 2019)
  assert.equal(buildDemoHistory({ endDate: END, language: 'fr' }).settings.autoWeatherEnabled, true)
})

test('the English history has no French left in its tags, notes, medications and effects', () => {
  const fr = buildDemoHistory({ endDate: END, language: 'fr' })
  const en = buildDemoHistory({ endDate: END, language: 'en' })
  const french = new Set<string>()
  for (const e of fr.entries) {
    ;(e.positiveActions ?? []).forEach((a) => french.add(a))
    if (e.notes) french.add(e.notes)
    for (const i of e.intakes ?? []) (i.sideEffects ?? []).forEach((s) => french.add(s))
  }
  fr.medications.forEach((m) => {
    french.add(m.name)
    if (m.reason) french.add(m.reason)
  })
  const english = new Set<string>()
  for (const e of en.entries) {
    ;(e.positiveActions ?? []).forEach((a) => english.add(a))
    if (e.notes) english.add(e.notes)
    for (const i of e.intakes ?? []) (i.sideEffects ?? []).forEach((s) => english.add(s))
  }
  en.medications.forEach((m) => {
    english.add(m.name)
    if (m.reason) english.add(m.reason)
  })
  // Names shared by both languages (Amitriptyline, Tramadol) are fine; what is French is not.
  const leftovers = [...english].filter((text) => french.has(text) && /[éèêàùç’]|^(Marche|Bain|Repos|Kiné|Poussées)/.test(text))
  assert.deepEqual(leftovers, [])
  assert.equal(en.settings.language, 'en')
})

test('a long history adds earlier months before the same story', () => {
  const long = buildDemoHistory({ endDate: END, language: 'fr', days: 430 })
  assert.ok(long.entries.length > 350)
  assert.ok(long.medications.some((m) => m.name === 'Amitriptyline'))
  assert.ok(!buildDemoHistory({ endDate: END, language: 'fr' }).medications.some((m) => m.name === 'Amitriptyline'))
})

// Fourteen end dates, two full weeks, so every weekday falls under every position.
const DATES = Array.from({ length: 14 }, (_, i) => shiftISO('2026-10-01', i))
const recent = (h: ReturnType<typeof buildDemoHistory>, end: string) => logged(h).filter((e) => e.date >= shiftISO(end, -30))

test('the leads were answered: the short walk and the meditation kept, rest set aside, and the backup keeps them', () => {
  const fr = buildDemoHistory({ endDate: END, language: 'fr' })
  assert.deepEqual(
    Object.entries(fr.settings.leadChoices ?? {}).map(([k, c]) => [k, c.choice]),
    [['action:marche courte', 'kept'], ['action:méditation / respiration', 'kept'], ['action:repos / sieste', 'dismissed']]
  )
  const en = buildDemoHistory({ endDate: END, language: 'en' })
  assert.deepEqual(Object.keys(en.settings.leadChoices ?? {}), ['action:short walk', 'action:meditation / breathing', 'action:rest / nap'])
  assert.deepEqual(sanitizeSettings(fr.settings)?.leadChoices, fr.settings.leadChoices)
})

test('Trends has something to say whatever the day, and opens on a lead already kept on most of them', () => {
  let keptFirst = 0
  let walk = 0
  for (const end of DATES) {
    const h = buildDemoHistory({ endDate: end, language: 'fr' })
    const { shown } = arrangeLeads(findLeads(recent(h, end)), h.settings.leadChoices)
    assert.ok(shown.length >= 2, `${end}: ${shown.length} leads`)
    if (h.settings.leadChoices?.[shown[0].key]?.choice === 'kept') keptFirst++
    if (shown.some((l) => l.key === 'action:marche courte')) walk++
  }
  assert.ok(keptFirst >= 10, `a kept lead opens the card on ${keptFirst} of 14 days`)
  assert.ok(walk >= 9, `the walk is on the card on ${walk} of 14 days`)
})

test('the short walk goes with an easier day over the whole history, so the report has its line', () => {
  for (const end of DATES) {
    const h = buildDemoHistory({ endDate: end, language: 'fr' })
    const walk = findLeads(logged(h)).find((l) => l.key === 'action:marche courte')
    assert.ok(walk && walk.gap < -1, `${end}: ${walk?.gap}`)
  }
})

test('by default the day opens in a flare, so no lead is brought to it', () => {
  for (const end of DATES) {
    const h = buildDemoHistory({ endDate: end, language: 'fr' })
    assert.equal(flareUnderWay(logged(h), end), true, end)
  }
})

test('with a calm end the day is outside a flare, a lead is brought on most days, and Sundays have their sentence', () => {
  let brought = 0
  let sundays = 0
  for (const end of DATES) {
    const h = buildDemoHistory({ endDate: end, language: 'fr', calmEnd: true })
    assert.equal(flareUnderWay(logged(h), end), false, end)
    assert.equal(h.entries.at(-1)?.painLevel, 4)
    const { shown } = arrangeLeads(findLeads(recent(h, end)), h.settings.leadChoices)
    const list = todayMessages({ today: end, quiet: false, later: undefined, allow: { leads: true, weekly: false, trials: false }, leads: shown, leadChoices: h.settings.leadChoices, tried: [], weekly: null, repeat: null, invite: false, trial: undefined })
    if (list.items.some((m) => m.kind === 'lead')) brought++
    if (new Date(`${end}T12:00:00Z`).getUTCDay() === 0) {
      sundays++
      assert.ok(weeklyFinding(logged(h), end, false), `${end}: nothing to say on a Sunday`)
    }
  }
  assert.equal(sundays, 2)
  assert.ok(brought >= 9, `a lead is brought on ${brought} of 14 days`)
})

test('a week of the short walk is among the trials already closed, and the report can compare it, in both languages', () => {
  for (const end of DATES) {
    for (const language of ['fr', 'en'] as const) {
      const h = buildDemoHistory({ endDate: end, language })
      const [week] = h.settings.leadTrialHistory ?? []
      assert.ok(week, `${end} ${language}`)
      assert.equal(week.key, language === 'fr' ? 'action:marche courte' : 'action:short walk')
      assert.equal(week.action, language === 'fr' ? 'Marche courte' : 'Short walk')
      assert.equal(reportTrials(h.settings.leadTrialHistory, undefined, logged(h), shiftISO(end, -180), end).length, 1, `${end} ${language}`)
    }
  }
})
