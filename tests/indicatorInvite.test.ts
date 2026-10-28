// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { completeInvite, INVITE_SNOOZE_DAYS, invitableIndicators, shouldShowInvite, snoozeInvite } from '../src/lib/indicatorInvite.ts'
import { sanitizeSettings } from '../src/lib/backupSanitize.ts'
import { DEFAULT_SETTINGS } from '../src/db/types.ts'
import type { Settings } from '../src/db/types.ts'

const ELEVEN = DEFAULT_SETTINGS.enabledFactors
const existing = (extra: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, onboardingDone: true, illnesses: ['fibromyalgie'], ...extra })
const show = (s: Settings, o: Partial<{ earlyAccess: boolean; today: string; quiet: boolean }> = {}) => shouldShowInvite(s, { earlyAccess: true, today: '2026-10-28', quiet: false, ...o })

test('no declared illness: nothing to propose, no banner', () => {
  assert.equal(show(existing({ illnesses: [] })), false)
  assert.deepEqual(invitableIndicators({ illnesses: [], enabledFactors: ELEVEN }, true), [])
})

test('without early access nothing new is on offer: no banner for someone who follows all eleven', () => {
  assert.equal(show(existing(), { earlyAccess: false }), false)
  assert.equal(show(existing(), { earlyAccess: true }), true)
})

test('what is invitable is what the illnesses recommend or suggest and is not followed yet', () => {
  const list = invitableIndicators({ illnesses: ['fibromyalgie'], enabledFactors: ELEVEN }, true)
  assert.deepEqual(list, ['morningStiffness', 'dailyInterference', 'nightWaking', 'unrefreshedWaking'])
  // An option inside sleep is only offered when sleep is followed.
  const noSleep = invitableIndicators({ illnesses: ['fibromyalgie'], enabledFactors: ELEVEN.filter((k) => k !== 'sleep') }, true)
  assert.ok(noSleep.includes('sleep') && noSleep.includes('nightWaking'))
  const sleepless = invitableIndicators({ illnesses: ['sep'], enabledFactors: ['fatigue'] }, false)
  assert.ok(!sleepless.includes('nightWaking'))
})

test('a new person (they chose in the setup) is never invited; an old one is until it is over', () => {
  assert.equal(show(existing({ indicatorInviteDone: true })), false)
  assert.equal(show(existing({ onboardingDone: false })), false)
})

test('it waits for a quiet day: a flare, or the diary not read yet', () => {
  assert.equal(show(existing(), { quiet: true }), false)
})

test('one cross hides it five days, then it is back', () => {
  const s = existing()
  const patch = snoozeInvite(s, '2026-10-28')
  assert.equal(patch.indicatorInviteDismissCount, 1)
  assert.equal(patch.indicatorInviteSnoozeUntil, '2026-11-02')
  assert.equal(INVITE_SNOOZE_DAYS, 5)
  const later = { ...s, ...patch }
  assert.equal(show(later, { today: '2026-10-29' }), false)
  assert.equal(show(later, { today: '2026-11-01' }), false)
  assert.equal(show(later, { today: '2026-11-02' }), true)
})

test('two crosses and it never comes back', () => {
  const once = { ...existing(), ...snoozeInvite(existing(), '2026-10-28') }
  const twice = { ...once, ...snoozeInvite(once, '2026-11-02') }
  assert.equal(twice.indicatorInviteDismissCount, 2)
  assert.equal(twice.indicatorInviteSnoozeUntil, undefined)
  assert.equal(show(twice, { today: '2027-06-01' }), false)
  // A third press cannot go past two.
  assert.equal(snoozeInvite(twice, '2027-06-01').indicatorInviteDismissCount, 2)
})

test('"add" adds only what was ticked, removes nothing, and ends the invitation', () => {
  const s = existing({ enabledFactors: ['fatigue', 'stress', 'weather'] })
  const patch = completeInvite(s, ['morningStiffness'])
  assert.deepEqual(patch.enabledFactors, ['fatigue', 'stress', 'weather', 'morningStiffness'])
  assert.equal(patch.indicatorInviteDone, true)
  assert.equal(show({ ...s, ...patch }), false)
  // Ticking what is already followed adds nothing twice.
  assert.deepEqual(completeInvite(s, ['stress']).enabledFactors, ['fatigue', 'stress', 'weather'])
})

test('the three fields survive a backup, and a bad value is dropped', () => {
  const ok = { indicatorInviteDone: true, indicatorInviteSnoozeUntil: '2026-11-02', indicatorInviteDismissCount: 1 }
  const out = sanitizeSettings(ok)
  assert.equal(out?.indicatorInviteDone, true)
  assert.equal(out?.indicatorInviteSnoozeUntil, '2026-11-02')
  assert.equal(out?.indicatorInviteDismissCount, 1)
  const bad = sanitizeSettings({ indicatorInviteDone: 'yes', indicatorInviteSnoozeUntil: 'tomorrow', indicatorInviteDismissCount: 7 })
  assert.equal(bad?.indicatorInviteDone, undefined)
  assert.equal(bad?.indicatorInviteSnoozeUntil, undefined)
  assert.equal(bad?.indicatorInviteDismissCount, undefined)
})
