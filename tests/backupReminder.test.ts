// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { backupReminder, snoozeUntil } from '../src/lib/backupReminder.ts'

const DAY = 86_400_000
const now = 1_800_000_000_000
const ago = (days: number, extraMs = 0) => now - days * DAY - extraMs

test('nothing is said before there is a week of journal to lose', () => {
  assert.equal(backupReminder({ now, entryCount: 0, changedSince: 0 }), null)
  assert.equal(backupReminder({ now, entryCount: 6, changedSince: 6 }), null)
})

test('a journal of a week or more that was never backed up gets the first reminder', () => {
  assert.deepEqual(backupReminder({ now, entryCount: 7, changedSince: 7 }), { kind: 'never', entries: 7 })
  assert.deepEqual(backupReminder({ now, entryCount: 120, changedSince: 120 }), { kind: 'never', entries: 120 })
})

test('after a backup, nothing is said for 30 days', () => {
  assert.equal(backupReminder({ now, lastBackupAt: ago(0), entryCount: 50, changedSince: 5 }), null)
  assert.equal(backupReminder({ now, lastBackupAt: ago(29, DAY - 1), entryCount: 50, changedSince: 5 }), null)
})

test('30 days after the last backup, a journal that changed since gets a reminder', () => {
  assert.deepEqual(backupReminder({ now, lastBackupAt: ago(30), entryCount: 50, changedSince: 1 }), { kind: 'stale', days: 30 })
  assert.deepEqual(backupReminder({ now, lastBackupAt: ago(45), entryCount: 50, changedSince: 12 }), { kind: 'stale', days: 45 })
})

test('the days since the backup are whole days', () => {
  assert.deepEqual(backupReminder({ now, lastBackupAt: ago(30, 5 * 3_600_000), entryCount: 50, changedSince: 1 }), {
    kind: 'stale',
    days: 30,
  })
})

test('a journal that did not change since the last backup is left alone, however old the backup', () => {
  assert.equal(backupReminder({ now, lastBackupAt: ago(400), entryCount: 50, changedSince: 0 }), null)
})

test('"later" keeps the reminder quiet until the chosen moment, which is included', () => {
  const never = { now, entryCount: 10, changedSince: 10 }
  assert.equal(backupReminder({ ...never, snoozedUntil: now + 1 }), null)
  assert.deepEqual(backupReminder({ ...never, snoozedUntil: now }), { kind: 'never', entries: 10 })
  assert.deepEqual(backupReminder({ ...never, snoozedUntil: now - DAY }), { kind: 'never', entries: 10 })

  const stale = { now, lastBackupAt: ago(40), entryCount: 50, changedSince: 3 }
  assert.equal(backupReminder({ ...stale, snoozedUntil: now + DAY }), null)
})

test('"later" puts the reminder off for a week', () => {
  assert.equal(snoozeUntil(now), now + 7 * DAY)
  const snoozed = { now, entryCount: 10, changedSince: 10, snoozedUntil: snoozeUntil(now) }
  assert.equal(backupReminder(snoozed), null)
  assert.equal(backupReminder({ ...snoozed, now: now + 6 * DAY }), null)
  assert.notEqual(backupReminder({ ...snoozed, now: now + 7 * DAY }), null)
})
