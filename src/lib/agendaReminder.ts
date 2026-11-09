// The daily reminder as a calendar event: a small iCalendar file (RFC 5545) the
// person opens in the calendar of their phone. The system calendar then rings
// every day, app closed, with no server and nothing sent anywhere: this is the
// one reminder that is reliable without a backend (the in-app notification only
// fires while the app is open).
//
// Pure (no React, no DOM), so plain Node can test it.
//
// Choices:
// - A neutral title: it shows on the lock screen and in a shared calendar, so it
//   says nothing of pain or illness.
// - A floating time (no time zone): it follows the phone when the person travels
//   or the clock changes.
// - Marked free (TRANSP:TRANSPARENT), so it never blocks a slot.
// - A stable UID, and a SEQUENCE that rises each time the file is made again, so a
//   calendar that understands updates replaces the event instead of adding a second.
// - An alarm at the exact time (TRIGGER:PT0S), because a calendar may ignore it
//   and use its own default alert: the screen says to check.

export const REMINDER_UID = 'ouch-daily-reminder@maxauvy.github.io'
export const REMINDER_FILENAME = 'ouch-rappel.ics'
const EVENT_MINUTES = 5

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export interface ReminderIcsInput {
  /** 'HH:MM', local. */
  time: string
  /** The address of the app, put in the event. */
  appUrl: string
  /** Shown by the calendar and on the lock screen: keep it neutral. */
  title: string
  description: string
  /** Rises each time the file is made again for the same event. */
  sequence: number
  now: Date
}

const pad = (n: number) => String(n).padStart(2, '0')

/** `20261109T200000`, in the device's own clock. */
function floating(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

/** `20261109T080000Z`. */
function utc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** iCalendar text values: backslash, semicolon, comma and line breaks are escaped. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Lines are cut at 75 octets, each continuation starting with a space, never inside a character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const out: string[] = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    // A continuation line carries its leading space too: 74 octets of text.
    const limit = out.length === 0 ? 75 : 74
    if (size + n > limit) {
      out.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += n
  }
  out.push(current)
  return out.join('\r\n ')
}

/** The file, with CRLF line ends. The first occurrence is today if the time is still ahead, else tomorrow. */
export function buildReminderIcs(input: ReminderIcsInput): string {
  if (!TIME.test(input.time)) throw new RangeError(`Invalid reminder time: ${input.time}`)
  const [h, m] = input.time.split(':').map(Number)
  const start = new Date(input.now)
  start.setHours(h, m, 0, 0)
  if (start <= input.now) start.setDate(start.getDate() + 1)
  const end = new Date(start.getTime() + EVENT_MINUTES * 60_000)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OUCH//Rappel quotidien//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${REMINDER_UID}`,
    `DTSTAMP:${utc(input.now)}`,
    `SEQUENCE:${Math.max(0, Math.floor(input.sequence))}`,
    `DTSTART:${floating(start)}`,
    `DTEND:${floating(end)}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText(input.title)}`,
    `DESCRIPTION:${escapeText(`${input.description}\n${input.appUrl}`)}`,
    `URL:${input.appUrl}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(input.title)}`,
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
