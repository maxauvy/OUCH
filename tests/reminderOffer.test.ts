// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reminderOfferDue } from '../src/lib/reminderOffer.ts'

const none = { reminderEnabled: false, agendaReminder: false }

test('offered from the second day noted, to someone with no reminder', () => {
  assert.equal(reminderOfferDue({ ...none, loggedDays: 0 }), false)
  assert.equal(reminderOfferDue({ ...none, loggedDays: 1 }), false)
  assert.equal(reminderOfferDue({ ...none, loggedDays: 2 }), true)
  assert.equal(reminderOfferDue({ ...none, loggedDays: 14 }), true)
})

test('not to someone who has kept a journal longer: their choice is made, the reminder stays in Settings', () => {
  assert.equal(reminderOfferDue({ ...none, loggedDays: 15 }), false)
  assert.equal(reminderOfferDue({ ...none, loggedDays: 200 }), false)
})

test('not once a reminder is set, in the app or in the calendar', () => {
  assert.equal(reminderOfferDue({ loggedDays: 3, reminderEnabled: true, agendaReminder: false }), false)
  assert.equal(reminderOfferDue({ loggedDays: 3, reminderEnabled: false, agendaReminder: true }), false)
})
