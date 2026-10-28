// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeCycleSymptoms, summarizeHeadaches, summarizeJoints, summarizeNerveSigns, summarizeRefreshed } from '../src/lib/indicatorSummaries.ts'
import type { DailyEntry } from '../src/db/types.ts'

const day = (date: string, extra: Partial<DailyEntry>): DailyEntry => ({ date, createdAt: 1, updatedAt: 1, ...extra })

test('waking rested: counted by level over the days noted only', () => {
  const s = summarizeRefreshed([day('2026-10-01', { wakingRefreshed: 'little' }), day('2026-10-02', { wakingRefreshed: 'little' }), day('2026-10-03', { wakingRefreshed: 'yes' }), day('2026-10-04', {})])
  assert.equal(s.noted, 3)
  assert.deepEqual(s.counts, { yes: 1, fairly: 0, little: 2, no: 0 })
})

test('joints: a "no" is an answer, the most named come first, at most three', () => {
  const s = summarizeJoints([
    day('2026-10-01', { jointsFelt: { yes: true, joints: ['leftWrist', 'rightKnee'] } }),
    day('2026-10-02', { jointsFelt: { yes: true, joints: ['leftWrist'] } }),
    day('2026-10-03', { jointsFelt: { yes: false } }),
    day('2026-10-04', { jointsFelt: { yes: true, joints: ['leftHand', 'rightFoot'] } }),
    day('2026-10-05', {}),
  ])
  assert.equal(s.noted, 4)
  assert.equal(s.yesDays, 3)
  assert.equal(s.top.length, 3)
  assert.deepEqual(s.top[0], { joint: 'leftWrist', days: 2 })
})

test('cycle: the flow by level, and each yes/no over the days it was answered', () => {
  const s = summarizeCycleSymptoms([
    day('2026-10-01', { periodFlow: 'heavy', offCycleBleeding: false, bowelPain: true }),
    day('2026-10-02', { periodFlow: 'light', bowelPain: true, urinary: false }),
    day('2026-10-03', { urinary: true }),
  ])
  assert.deepEqual(s.flow, { none: 0, spotting: 0, light: 1, heavy: 1 })
  assert.deepEqual([s.flowNoted, s.offCycleNoted, s.offCycleDays], [2, 1, 0])
  assert.deepEqual([s.bowelNoted, s.bowelDays, s.urinaryNoted, s.urinaryDays], [2, 2, 2, 1])
})

test('headaches: days with an attack, with a medication, the details and the triggers', () => {
  const s = summarizeHeadaches([
    day('2026-10-01', { headache: { today: true, duration: '4to24h', aura: true, nausea: true, acuteMed: true, triggers: ['Stress', 'vin'] } }),
    day('2026-10-02', { headache: { today: false } }),
    day('2026-10-03', { headache: { today: true, duration: 'lt4h', sensitivity: true, triggers: ['stress'] } }),
    day('2026-10-04', {}),
  ])
  assert.equal(s.noted, 3)
  assert.equal(s.headacheDays, 2)
  assert.equal(s.acuteMedDays, 1)
  assert.deepEqual(s.durations, { lt4h: 1, '4to24h': 1, gt24h: 0 })
  assert.deepEqual([s.auraDays, s.nauseaDays, s.sensitivityDays], [1, 1, 1])
  // The same trigger typed with another case is one.
  assert.deepEqual(s.triggers[0], { trigger: 'stress', days: 2 })
})

test('a day without a headache keeps its details out, whatever the file said', () => {
  const s = summarizeHeadaches([day('2026-10-01', { headache: { today: false, acuteMed: true } as never })])
  assert.equal(s.headacheDays, 0)
  assert.equal(s.acuteMedDays, 0)
})

test('nerve signs: the leg by level, the signs by days, an empty list is a day answered with none', () => {
  const s = summarizeNerveSigns([
    day('2026-10-01', { legPain: 'toKnee', symptomTags: ['tingling', 'shocks'], feverInfection: false, newSymptom: true }),
    day('2026-10-02', { legPain: 'none', symptomTags: [], feverInfection: true }),
    day('2026-10-03', { symptomTags: ['tingling'], newSymptom: false }),
    day('2026-10-04', {}),
  ])
  assert.deepEqual(s.leg, { none: 1, toKnee: 1, belowKnee: 0 })
  assert.deepEqual([s.legNoted, s.tagsNoted, s.tagDays], [2, 3, 2])
  assert.deepEqual(s.tags, [{ tag: 'tingling', days: 2 }, { tag: 'shocks', days: 1 }])
  assert.deepEqual([s.feverNoted, s.feverDays, s.newSymptomNoted, s.newSymptomDays], [2, 1, 2, 1])
})
