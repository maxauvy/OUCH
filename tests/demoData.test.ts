// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildDemoHistory, DEMO_STORY_DAYS } from '../src/lib/demoData.ts'
import { sanitizeBackup } from '../src/lib/backupSanitize.ts'
import { detectFlares } from '../src/lib/flares.ts'
import { shiftISO } from '../src/lib/medications.ts'
import type { LoggedEntry } from '../src/db/types.ts'

const END = '2026-10-12'
const logged = (h: ReturnType<typeof buildDemoHistory>) => h.entries as LoggedEntry[]

test('the same day gives the same history', () => {
  assert.deepEqual(buildDemoHistory({ endDate: END, language: 'fr' }), buildDemoHistory({ endDate: END, language: 'fr' }))
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
