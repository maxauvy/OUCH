// Anonymous audience measurement: once a week, an installation says "active
// this week" so the number of installations in use is known. Nothing else is
// sent (no page, no version, no language, no health data), and the count is
// deduplicated here, not on the server: at most one signal per installation
// and ISO week, remembered by a single local flag that holds no identifier.
//
// The signal is the request GoatCounter's count.js would make, built by hand:
// that script reads the page title, the referrer, the query string and the
// screen width on its own, and loading a third-party script into the origin
// that holds the journal would open `script-src`. Here the app sends the path
// and the event marker, nothing more, and `script-src` stays 'self'.
//
// Pure apart from `sendWeeklyPing`, which takes its surroundings as arguments
// so plain Node can test every condition.

import { getISOWeek, getISOWeekYear } from 'date-fns'
import { IS_DEMO } from './demoMode.ts'

/** localStorage: the last ISO week a signal was sent for. Per installation:
 * never in a backup, an import or the CSV export. */
export const AUDIENCE_FLAG_KEY = 'ouch.audience.lastWeek'

/** `2026-W44`, on the device's own calendar. The week-numbering year differs
 * from the calendar year around New Year (29 December can be `+1-W01`). */
export function isoWeek(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`
}

export interface AudienceEnv {
  /** `VITE_AUDIENCE_URL`: the GoatCounter `/count` endpoint; empty or absent = off. */
  url?: string
  /** `VITE_AUDIENCE_HOST`: the one host allowed to send (the official deployment). */
  host?: string
  hostname: string
  isDemo: boolean
  inFrame: boolean
  /** `navigator.onLine`; undefined when the browser does not say. */
  online?: boolean
  doNotTrack?: string | null
  globalPrivacyControl?: boolean
  /** Opened as an installed app rather than in a browser tab. */
  standalone: boolean
}

/** localhost, loopback, `.localhost` / `.local` names and private ranges. */
export function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h === '[::1]' ||
    h === '::1' ||
    h === '0.0.0.0' ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  )
}

/** Every condition for a signal; one missing means no request at all. */
export function shouldSend(env: AudienceEnv, settings: { audienceMeasurementEnabled?: boolean }): boolean {
  if (settings.audienceMeasurementEnabled === false) return false
  if (env.doNotTrack === '1' || env.globalPrivacyControl === true) return false
  if (!env.url || !env.host || env.hostname !== env.host) return false
  if (env.isDemo || env.inFrame || isLocalHost(env.hostname)) return false
  if (env.online === false) return false
  return true
}

/** The path of the event: `/actif/standalone/2026-W44` or `/actif/navigateur/2026-W44`. */
export function audiencePath(env: Pick<AudienceEnv, 'standalone'>, week: string): string {
  return `/actif/${env.standalone ? 'standalone' : 'navigateur'}/${week}`
}

/** The request address: the event path and its marker, no title, no referrer,
 * no query, no screen size, and `ns` so no session is kept on the server. */
export function audienceUrl(endpoint: string, path: string): string {
  const params = new URLSearchParams({ p: path, e: 'true', ns: 'true' })
  return `${endpoint}?${params.toString()}`
}

export interface AudienceDeps {
  env: AudienceEnv
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  /** Resolves when the request left and reached the server; rejects otherwise. */
  send: (url: string) => Promise<void>
  now: () => Date
}

/** Sends this week's signal if it is allowed and not sent yet. The flag is
 * written only after the request succeeded, so a failure is retried at the
 * next launch. Never throws. Returns whether a signal was sent. */
export async function sendWeeklyPing(
  settings: { audienceMeasurementEnabled?: boolean },
  deps: AudienceDeps = browserDeps(),
): Promise<boolean> {
  try {
    if (!shouldSend(deps.env, settings)) return false
    const week = isoWeek(deps.now())
    if (deps.storage.getItem(AUDIENCE_FLAG_KEY) === week) return false
    await deps.send(audienceUrl(deps.env.url!, audiencePath(deps.env, week)))
    deps.storage.setItem(AUDIENCE_FLAG_KEY, week)
    return true
  } catch {
    return false
  }
}

/** Turning the measurement off also forgets the flag. */
export function clearAudienceFlag(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  try {
    storage.removeItem(AUDIENCE_FLAG_KEY)
  } catch {
    // Storage blocked: there is nothing to forget.
  }
}

function inFrame(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

function browserDeps(): AudienceDeps {
  const nav = navigator as Navigator & { standalone?: boolean; globalPrivacyControl?: boolean }
  return {
    env: {
      url: import.meta.env?.VITE_AUDIENCE_URL,
      host: import.meta.env?.VITE_AUDIENCE_HOST,
      hostname: location.hostname,
      isDemo: IS_DEMO,
      inFrame: inFrame(),
      online: nav.onLine,
      doNotTrack: nav.doNotTrack,
      globalPrivacyControl: nav.globalPrivacyControl,
      standalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
    },
    storage: localStorage,
    // no-cors: the answer is not needed, only that the request went through.
    send: async (url) => {
      await fetch(url, {
        mode: 'no-cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        keepalive: true,
      })
    },
    now: () => new Date(),
  }
}
