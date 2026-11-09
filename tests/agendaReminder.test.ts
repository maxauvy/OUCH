// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildReminderIcs, escapeText, foldLine, REMINDER_UID } from '../src/lib/agendaReminder.ts'

const base = {
  time: '20:00',
  appUrl: 'https://maxauvy.github.io/OUCH/',
  title: 'OUCH · 2 minutes pour toi',
  description: 'Ta météo du jour t’attend, si tu veux.',
  sequence: 0,
  now: new Date(2026, 10, 9, 8, 30, 0),
}
const lines = (ics: string) => ics.split('\r\n')
const unfold = (ics: string) => ics.replace(/\r\n /g, '')

test('the file is one daily event with an alarm at the exact time, free, and neutral', () => {
  const ics = buildReminderIcs(base)
  const l = lines(unfold(ics))
  assert.equal(l[0], 'BEGIN:VCALENDAR')
  assert.ok(l.includes('RRULE:FREQ=DAILY'))
  assert.ok(l.includes('TRANSP:TRANSPARENT'))
  assert.ok(l.includes('TRIGGER:PT0S'))
  assert.ok(l.includes(`UID:${REMINDER_UID}`))
  assert.ok(l.includes('SUMMARY:OUCH · 2 minutes pour toi'))
  assert.ok(!/douleur|pain|maladie/i.test(ics.split('DESCRIPTION')[0]), 'the title says nothing of pain')
  assert.ok(ics.endsWith('\r\n'))
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 1)
})

test('the time is floating (no zone, no Z), five minutes long', () => {
  const l = lines(buildReminderIcs(base))
  assert.ok(l.includes('DTSTART:20261109T200000'))
  assert.ok(l.includes('DTEND:20261109T200500'))
})

test('a time already past today starts tomorrow, and a late time ends after midnight', () => {
  assert.ok(lines(buildReminderIcs({ ...base, time: '07:00' })).includes('DTSTART:20261110T070000'))
  const late = lines(buildReminderIcs({ ...base, time: '23:58' }))
  assert.ok(late.includes('DTSTART:20261109T235800'))
  assert.ok(late.includes('DTEND:20261110T000300'))
})

test('the sequence rises so that a new file replaces the event', () => {
  assert.ok(lines(buildReminderIcs({ ...base, sequence: 3 })).includes('SEQUENCE:3'))
})

test('text is escaped, and the address is in the description and the URL', () => {
  assert.equal(escapeText('a, b; c\\d\ne'), 'a\\, b\\; c\\\\d\\ne')
  const l = lines(unfold(buildReminderIcs(base)))
  assert.ok(l.some((x) => x.startsWith('DESCRIPTION:') && x.includes('https://maxauvy.github.io/OUCH/')))
  assert.ok(l.includes('URL:https://maxauvy.github.io/OUCH/'))
})

test('long lines are folded at 75 octets, never inside a character, and unfold to the original', () => {
  const long = 'DESCRIPTION:' + 'é'.repeat(80)
  const folded = foldLine(long)
  for (const part of folded.split('\r\n')) assert.ok(new TextEncoder().encode(part).length <= 75, part)
  assert.equal(folded.replace(/\r\n /g, ''), long)
  assert.equal(foldLine('SHORT'), 'SHORT')
})

test('a time that is not HH:MM is refused', () => {
  assert.throws(() => buildReminderIcs({ ...base, time: '' }), RangeError)
  assert.throws(() => buildReminderIcs({ ...base, time: '24:00' }), RangeError)
})
