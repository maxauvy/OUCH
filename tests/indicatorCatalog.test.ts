// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { INDICATORS, isOffered, MAX_RECOMMENDED_MEASURES, offeredFactors, planForIllnesses, withoutDetails, withoutUnoffered, detailsOf, planSettingsPatch, wizardSections, countFollowed } from '../src/lib/indicatorCatalog.ts'
import type { IndicatorKey } from '../src/lib/indicatorCatalog.ts'
import { ALL_FACTORS, ILLNESSES } from '../src/db/types.ts'

const everything = { earlyAccess: true, implemented: INDICATORS.map((d) => d.key) }
const measureKeys = new Set(INDICATORS.filter((d) => d.kind === 'measure').map((d) => d.key))
const measures = (keys: IndicatorKey[]) => keys.filter((k) => measureKeys.has(k))

test('with no illness, or only "autre", the base profile', () => {
  const base = planForIllnesses([], everything)
  assert.deepEqual(measures(base.recommended), ['fatigue', 'sleep', 'mood'])
  assert.deepEqual(planForIllnesses(['autre'], everything), base)
  assert.equal(base.cycle, 'off')
})

test('"autre" next to another illness adds nothing of its own', () => {
  assert.deepEqual(planForIllnesses(['migraine', 'autre'], everything), planForIllnesses(['migraine'], everything))
})

test('the plan has no duplicates and every indicator is in exactly one list', () => {
  for (const illnesses of [[], ...ILLNESSES.map((i) => [i]), ['fibromyalgie', 'spondylarthrite'], ['arthrite', 'sep', 'endometriose']] as const) {
    const plan = planForIllnesses(illnesses, everything)
    const all = [...plan.recommended, ...plan.suggested, ...plan.others]
    assert.equal(new Set(all).size, all.length, illnesses.join('+'))
    assert.equal(all.length, INDICATORS.length, `${illnesses.join('+')}: none is out of reach`)
  }
})

test('the union of two illnesses is deduplicated, and recommended wins over suggested', () => {
  const plan = planForIllnesses(['fibromyalgie', 'spondylarthrite'], everything)
  assert.equal(plan.recommended.filter((k) => k === 'morningStiffness').length, 1)
  // dailyInterference is only suggested for both.
  assert.ok(plan.suggested.includes('dailyInterference'))
  // stress is suggested for fibromyalgia, not for spondyloarthritis: still suggested.
  const arthritis = planForIllnesses(['fibromyalgie', 'arthrite'], everything)
  // dailyInterference: suggested for fibromyalgia, recommended for arthritis.
  assert.ok(arthritis.recommended.includes('dailyInterference'))
  assert.ok(!arthritis.suggested.includes('dailyInterference'))
})

test('fibromyalgia: pain plus five measures, under the cap', () => {
  const plan = planForIllnesses(['fibromyalgie'], everything)
  assert.deepEqual(measures(plan.recommended), ['fatigue', 'sleep', 'morningStiffness', 'brainFog', 'mood'])
  assert.deepEqual(plan.recommended.filter((k) => k === 'nightWaking' || k === 'unrefreshedWaking'), ['nightWaking', 'unrefreshedWaking'])
})

test('the cap: never more than six measures beside pain, the surplus becomes a suggestion', () => {
  const all = planForIllnesses(['fibromyalgie', 'arthrite', 'spondylarthrite', 'endometriose', 'migraine', 'lombalgie', 'sep', 'myofasciale'], everything)
  const recommended = measures(all.recommended)
  assert.equal(recommended.length, MAX_RECOMMENDED_MEASURES)
  // What defines an illness stays before the shared measures, so a second illness never takes it away.
  assert.ok(['periodFlow', 'bowelBladder', 'headacheEpisode', 'legPain', 'spasms'].every((k) => recommended.includes(k as never)))
  assert.ok(measures(all.suggested).includes('sleep') || measures(all.suggested).includes('morningStiffness'))
})

test('a detail needs its parent: without it, it is not offered', () => {
  const sleepless = INDICATORS.filter((d) => d.key !== 'sleep')
  const plan = planForIllnesses(['fibromyalgie'], { ...everything, catalog: sleepless, implemented: sleepless.map((d) => d.key) })
  assert.ok(!plan.recommended.includes('nightWaking'))
})

test('endometriosis switches the cycle on, and only it', () => {
  assert.equal(planForIllnesses(['endometriose'], everything).cycle, 'on')
  assert.equal(planForIllnesses(['fibromyalgie', 'endometriose'], everything).cycle, 'on')
  for (const i of ILLNESSES.filter((i) => i !== 'endometriose')) assert.equal(planForIllnesses([i], everything).cycle, 'off', i)
})

test('deterministic: the same illnesses, in any order, give the same plan', () => {
  assert.deepEqual(planForIllnesses(['sep', 'migraine', 'fibromyalgie'], everything), planForIllnesses(['fibromyalgie', 'sep', 'migraine'], everything))
})

test('indicators not built yet are ignored, whatever the early access', () => {
  for (const earlyAccess of [false, true]) {
    const plan = planForIllnesses(['fibromyalgie'], { earlyAccess })
    const all = [...plan.recommended, ...plan.suggested, ...plan.others]
    assert.ok(all.every((k) => (ALL_FACTORS as string[]).includes(k)), `earlyAccess ${earlyAccess}`)
  }
})

test('without early access, only what a clinician has read is offered', () => {
  const plan = planForIllnesses(['arthrite'], { implemented: INDICATORS.map((d) => d.key) })
  const unreviewed = new Set(INDICATORS.filter((d) => !d.reviewed).map((d) => d.key))
  const all = [...plan.recommended, ...plan.suggested, ...plan.others]
  assert.ok(all.every((k) => !unreviewed.has(k)))
  assert.ok(all.length > 0)
})

const ORIGINAL = ['fatigue', 'sleep', 'stress', 'brainFog', 'mood', 'activity', 'weather', 'medications', 'positiveActions', 'painLocations', 'notes']

test('the eleven original indicators are reviewed, and always offered', () => {
  for (const key of ORIGINAL) {
    assert.ok(INDICATORS.find((d) => d.key === key)?.reviewed, key)
    assert.ok(isOffered(key, false), key)
  }
  assert.deepEqual(offeredFactors(false), ORIGINAL)
})

test('a new indicator is offered only with early access; an unknown key never is', () => {
  assert.equal(isOffered('morningStiffness', false), false)
  assert.equal(isOffered('morningStiffness', true), true)
  assert.equal(isOffered('cycle', true), false)
  assert.equal(isOffered('whatever', true), false)
  assert.ok(offeredFactors(true).includes('morningStiffness'))
  assert.ok(!offeredFactors(false).includes('morningStiffness'))
})

test('the catalogue is consistent: every factor is in it, every detail has a parent', () => {
  for (const factor of ALL_FACTORS) assert.ok(INDICATORS.some((d) => d.key === factor), `${factor} is in the catalogue`)
  for (const d of INDICATORS.filter((d) => d.kind === 'detail')) assert.ok(d.parent && INDICATORS.some((p) => p.key === d.parent), `${d.key} has a parent`)
})

test('without early access an entry is shown without what the new indicators wrote; the journal keeps it', () => {
  const entry = { date: '2026-10-01', createdAt: 1, updatedAt: 1, painLevel: 5, fatigueLevel: 3, morningStiffness: 'lt30', morningStiffnessSeverity: 4, nightWakings: 2, dailyInterference: 6 } as const
  assert.deepEqual(withoutUnoffered(entry, false), { date: '2026-10-01', createdAt: 1, updatedAt: 1, painLevel: 5, fatigueLevel: 3 })
  assert.equal(withoutUnoffered(entry, true), entry)
  assert.equal(entry.nightWakings, 2)
})

test('the options inside sleep are listed under it, and leave the list of rows', () => {
  assert.deepEqual(detailsOf('sleep', true), ['nightWaking'])
  assert.deepEqual(detailsOf('sleep', false), [])
  assert.deepEqual(detailsOf('fatigue', true), [])
  assert.deepEqual(withoutDetails(['fatigue', 'sleep', 'nightWaking', 'mood']), ['fatigue', 'sleep', 'mood'])
})

test('the setup pre-selects the recommended ones in place of the defaults, and starts the cycle only when asked', () => {
  const fibro = planSettingsPatch(planForIllnesses(['fibromyalgie']))
  assert.deepEqual(fibro.enabledFactors, ['fatigue', 'sleep', 'brainFog', 'mood', 'painLocations', 'medications', 'positiveActions', 'notes'])
  assert.equal('cycleTrackingEnabled' in fibro, false)
  assert.equal(planSettingsPatch(planForIllnesses(['endometriose'])).cycleTrackingEnabled, true)
  // With no illness: the base profile, not the eleven defaults.
  assert.deepEqual(planSettingsPatch(planForIllnesses([])).enabledFactors, ['fatigue', 'sleep', 'mood', 'painLocations', 'medications', 'notes'])
})

test('after an illness change, what became recommended is shown as added, not ticked', () => {
  const before = planForIllnesses(['fibromyalgie'], everything)
  const after = planForIllnesses(['fibromyalgie', 'migraine'], everything)
  const sections = wizardSections(after, before.recommended)
  assert.ok(sections.added.includes('headacheEpisode') && !sections.recommended.includes('headacheEpisode'))
  assert.ok(sections.recommended.includes('fatigue'))
  assert.deepEqual(wizardSections(after, null).added, [])
  assert.ok(wizardSections(after, null).recommended.includes('headacheEpisode'))
  // No detail is a row of its own.
  assert.ok(!sections.recommended.includes('nightWaking'))
})

test('the done step counts the followed indicators, not the options inside them', () => {
  assert.equal(countFollowed(['fatigue', 'sleep', 'nightWaking', 'notes'], true), 3)
  assert.equal(countFollowed(['fatigue', 'sleep', 'nightWaking', 'notes'], false), 3)
  assert.equal(countFollowed(['fatigue', 'morningStiffness'], false), 1)
})
