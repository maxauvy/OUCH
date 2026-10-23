// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BODY_ZONES, COARSE_ZONES, SIDED_ZONES } from '../src/db/types.ts'
import { BODY_GROUPS, cleanZones, isCoarseZone, isWpiZone, parseZone, WPI_ZONES, wpiCount, zonesOfRegion } from '../src/lib/bodyZones.ts'
import { sanitizeEntry } from '../src/lib/backupSanitize.ts'

test('the zones follow the 19 areas of the Widespread Pain Index, with head, hands and feet on top', () => {
  assert.equal(WPI_ZONES.length, 19)
  assert.equal(new Set(WPI_ZONES).size, 19)
  assert.equal(BODY_ZONES.length, 6 + 18 + 6 + 1)
  for (const z of ['head', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot', 'generalized', 'arms']) assert.equal(isWpiZone(z), false, z)
  for (const z of ['leftJaw', 'rightShoulder', 'neck', 'chest', 'stomach', 'upperBack', 'lowerBack', 'leftLowerLeg']) assert.equal(isWpiZone(z), true, z)
})

test('a region with a side stands for its left and right zones', () => {
  assert.deepEqual(zonesOfRegion('shoulder'), ['leftShoulder', 'rightShoulder'])
  assert.deepEqual(zonesOfRegion('neck'), ['neck'])
  assert.equal(SIDED_ZONES.length, 18)
  assert.deepEqual(parseZone('rightLowerArm'), { region: 'lowerArm', side: 'right' })
  assert.deepEqual(parseZone('neck'), { region: 'neck' })
  assert.equal(parseZone('arms'), null)
})

test('every region is in exactly one group of the input', () => {
  const all = BODY_GROUPS.flatMap((g) => g.regions)
  assert.equal(new Set(all).size, all.length)
  assert.equal(all.length, 15)
})

test('the count of WPI areas leaves out what is not one, and repeats', () => {
  assert.equal(wpiCount(undefined), 0)
  assert.equal(wpiCount(['neck', 'neck', 'leftShoulder', 'head', 'leftHand', 'generalized', 'arms']), 2)
})

test('the zones of the first versions stay valid and are told apart', () => {
  for (const z of COARSE_ZONES) assert.equal(isCoarseZone(z), true)
  assert.equal(isCoarseZone('leftShoulder'), false)
  assert.equal(isCoarseZone('generalized'), false)
  // Nothing is converted: "Arms" does not say which arm.
  assert.deepEqual(cleanZones(['arms', 'legs', 'stomach', 'generalized']), ['arms', 'legs', 'stomach', 'generalized'])
  assert.deepEqual(cleanZones(['neck', 'toe', 'neck', 'rightHip']), ['neck', 'rightHip'])
})

test('a backup of an earlier version, or of this one, comes back with its zones', () => {
  const entry = { date: '2026-05-04', painLevel: 4, createdAt: 1, updatedAt: 2 }
  assert.deepEqual(sanitizeEntry({ ...entry, painLocations: ['shoulders', 'stomach'] })?.painLocations, ['shoulders', 'stomach'])
  assert.deepEqual(sanitizeEntry({ ...entry, painLocations: ['leftShoulder', 'rightHip', 'leftBalloon'] })?.painLocations, ['leftShoulder', 'rightHip'])
})

import { zoneSummary } from '../src/lib/bodyZones.ts'

test('the zone summary counts what was declared: no WPI score', () => {
  const days = [
    { painLocations: ['leftShoulder', 'neck', 'head'] },
    { painLocations: ['leftShoulder', 'lowerBack', 'arms'] },
    { painLocations: ['generalized'] },
    { painLocations: [] },
    {},
  ]
  const s = zoneSummary(days)
  assert.equal(s.days, 5)
  assert.deepEqual(s.shares[0], ['leftShoulder', 2 / 5])
  assert.equal(s.areasReported, 3) // leftShoulder, neck, lowerBack (head is not a WPI area)
  assert.equal(s.daysWithAreas, 2)
  assert.equal(s.meanAreasPerDay, (2 + 2) / 2)
  assert.equal(s.widespreadDays, 1)
  assert.equal(s.daysWithOldZones, 1)
  assert.equal(zoneSummary([{}]).meanAreasPerDay, null)
})

import { oldZonesUsed } from '../src/lib/bodyZones.ts'

test('only a journal that holds zones of the first versions is told about the new ones', () => {
  assert.deepEqual(oldZonesUsed([]), [])
  assert.deepEqual(oldZonesUsed([{ painLocations: ['leftShoulder', 'neck', 'generalized'] }, {}]), [])
  assert.deepEqual(oldZonesUsed([{ painLocations: ['legs', 'neck'] }, { painLocations: ['arms', 'legs'] }]), ['arms', 'legs'])
})
