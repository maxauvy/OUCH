// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { activityIllnesses } from '../src/lib/activityEvidence.ts'
import { markDone, todayMessages } from '../src/lib/todayMessages.ts'
import fr from '../src/i18n/locales/fr.ts'
import en from '../src/i18n/locales/en.ts'

test('only the illnesses with a source are kept, in the order picked, three at most', () => {
  assert.deepEqual(activityIllnesses(['endometriose', 'sep', 'rhumatisme-psoriasique', 'autre']), [])
  assert.deepEqual(activityIllnesses(['lombalgie', 'sep', 'fibromyalgie']), ['lombalgie', 'fibromyalgie'])
  assert.equal(activityIllnesses(['fibromyalgie', 'arthrite', 'spondylarthrite', 'lombalgie', 'migraine']).length, 3)
})

test('the card is one message, said once, never on a hard day, nor when suggestions are off', () => {
  const base = { today: '2026-11-10', quiet: false, later: undefined, allow: { leads: false, weekly: false, trials: false, calm: false, month: false, activity: true }, leads: [], leadChoices: undefined, tried: [], weekly: null, repeat: null, invite: false, calm: null, month: null, trial: undefined, activity: activityIllnesses(['fibromyalgie']) }
  assert.equal(todayMessages(base).items[0]?.kind, 'activity')
  assert.equal(todayMessages({ ...base, later: markDone(undefined, 'activity') }).count, 0)
  assert.equal(todayMessages({ ...base, quiet: true }).count, 0)
  assert.equal(todayMessages({ ...base, allow: { ...base.allow, activity: false } }).count, 0)
  assert.equal(todayMessages({ ...base, activity: [] }).count, 0)
})

test('the action tried is one the entry form suggests, so ticking it counts in the trial', () => {
  assert.ok(fr.entryForm.positiveActionsSuggestions.includes(fr.activity.action))
  assert.ok(en.entryForm.positiveActionsSuggestions.includes(en.activity.action))
})
