// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  AUDIENCE_FLAG_KEY,
  audiencePath,
  audienceUrl,
  clearAudienceFlag,
  isLocalHost,
  isoWeek,
  sendWeeklyPing,
  shouldSend,
  type AudienceDeps,
  type AudienceEnv,
} from '../src/lib/audience.ts'

const OFFICIAL: AudienceEnv = {
  url: 'https://ouch.goatcounter.com/count',
  host: 'maxauvy.github.io',
  hostname: 'maxauvy.github.io',
  isDemo: false,
  inFrame: false,
  online: true,
  standalone: false,
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

function deps(over: { env?: Partial<AudienceEnv>; stored?: Record<string, string>; fail?: boolean; at?: string } = {}) {
  const sent: string[] = []
  const storage = memoryStorage(over.stored)
  const d: AudienceDeps = {
    env: { ...OFFICIAL, ...over.env },
    storage,
    send: async (url) => {
      if (over.fail) throw new TypeError('Failed to fetch')
      sent.push(url)
    },
    now: () => new Date(over.at ?? '2026-10-28T10:00:00'),
  }
  return { d, sent, storage }
}

test('ISO week, on the local calendar', () => {
  assert.equal(isoWeek(new Date('2026-10-28T10:00:00')), '2026-W44')
  assert.equal(isoWeek(new Date('2026-01-05T00:30:00')), '2026-W02')
  assert.equal(isoWeek(new Date('2026-03-01T12:00:00')), '2026-W09')
})

test('ISO week across the new year', () => {
  // 1 January 2027 is a Friday: still the last week of 2026.
  assert.equal(isoWeek(new Date('2027-01-01T12:00:00')), '2026-W53')
  // 29 December 2025 (Monday) opens week 1 of 2026.
  assert.equal(isoWeek(new Date('2025-12-29T12:00:00')), '2026-W01')
  assert.equal(isoWeek(new Date('2026-12-31T23:59:00')), '2026-W53')
  assert.equal(isoWeek(new Date('2021-01-03T12:00:00')), '2020-W53')
})

test('the path says how the app was opened and for which week', () => {
  assert.equal(audiencePath({ standalone: true }, '2026-W44'), '/actif/standalone/2026-W44')
  assert.equal(audiencePath({ standalone: false }, '2026-W44'), '/actif/navigateur/2026-W44')
})

test('the request holds the path, the event marker and no session, nothing else', () => {
  const url = new URL(audienceUrl('https://ouch.goatcounter.com/count', '/actif/navigateur/2026-W44'))
  assert.equal(url.origin + url.pathname, 'https://ouch.goatcounter.com/count')
  assert.deepEqual(Object.fromEntries(url.searchParams), { p: '/actif/navigateur/2026-W44', e: 'true', ns: 'true' })
})

test('local hosts', () => {
  for (const h of ['localhost', 'app.localhost', '127.0.0.1', '[::1]', '192.168.1.20', '10.0.0.4', '172.16.0.1', '172.31.9.9', 'mac.local']) {
    assert.ok(isLocalHost(h), h)
  }
  for (const h of ['maxauvy.github.io', '172.32.0.1', '172.15.0.1', '11.0.0.1']) assert.ok(!isLocalHost(h), h)
})

test('sends when every condition holds', () => {
  assert.ok(shouldSend(OFFICIAL, {}))
  assert.ok(shouldSend(OFFICIAL, { audienceMeasurementEnabled: true }))
})

test('each missing condition forbids sending', () => {
  const no = (env: Partial<AudienceEnv>, settings = {}) => assert.equal(shouldSend({ ...OFFICIAL, ...env }, settings), false)
  no({}, { audienceMeasurementEnabled: false })
  no({ doNotTrack: '1' })
  no({ globalPrivacyControl: true })
  no({ url: undefined })
  no({ url: '' })
  no({ host: undefined })
  no({ hostname: 'someone.github.io' })
  no({ isDemo: true })
  no({ inFrame: true })
  no({ hostname: 'localhost', host: 'localhost' })
  no({ online: false })
})

test('Do Not Track at 0 or unset, and an unknown connection state, do not stand in the way', () => {
  assert.ok(shouldSend({ ...OFFICIAL, doNotTrack: '0' }, {}))
  assert.ok(shouldSend({ ...OFFICIAL, doNotTrack: null, globalPrivacyControl: false }, {}))
  assert.ok(shouldSend({ ...OFFICIAL, online: undefined }, {}))
})

test('one signal per week: the flag is written after success, the second launch sends nothing', async () => {
  const { d, sent, storage } = deps()
  assert.equal(await sendWeeklyPing({}, d), true)
  assert.deepEqual(sent.length, 1)
  assert.ok(sent[0].includes('p=%2Factif%2Fnavigateur%2F2026-W44'))
  assert.equal(storage.getItem(AUDIENCE_FLAG_KEY), '2026-W44')
  assert.equal(await sendWeeklyPing({}, d), false)
  assert.equal(sent.length, 1)
})

test('a new week sends again', async () => {
  const { d, sent } = deps({ stored: { [AUDIENCE_FLAG_KEY]: '2026-W43' } })
  assert.equal(await sendWeeklyPing({}, d), true)
  assert.equal(sent.length, 1)
})

test('installed app: the standalone path', async () => {
  const { d, sent } = deps({ env: { standalone: true } })
  await sendWeeklyPing({}, d)
  assert.ok(sent[0].includes('standalone'))
})

test('a failed request writes no flag, and the next launch tries again', async () => {
  const failing = deps({ fail: true })
  assert.equal(await sendWeeklyPing({}, failing.d), false)
  assert.equal(failing.storage.getItem(AUDIENCE_FLAG_KEY), null)
  const retry = deps({ stored: {} })
  assert.equal(await sendWeeklyPing({}, retry.d), true)
})

test('no condition met: no request and no flag', async () => {
  for (const over of [{ doNotTrack: '1' }, { url: '' }, { hostname: 'fork.github.io' }, { isDemo: true }, { inFrame: true }, { online: false }]) {
    const { d, sent, storage } = deps({ env: over })
    assert.equal(await sendWeeklyPing({}, d), false)
    assert.equal(sent.length, 0)
    assert.equal(storage.getItem(AUDIENCE_FLAG_KEY), null)
  }
  const off = deps()
  assert.equal(await sendWeeklyPing({ audienceMeasurementEnabled: false }, off.d), false)
  assert.equal(off.sent.length, 0)
})

test('blocked storage is not an error', async () => {
  const { d } = deps()
  d.storage = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {},
    removeItem: () => {},
  }
  assert.equal(await sendWeeklyPing({}, d), false)
})

test('turning the measurement off forgets the flag', () => {
  const storage = memoryStorage({ [AUDIENCE_FLAG_KEY]: '2026-W44' })
  clearAudienceFlag(storage)
  assert.equal(storage.getItem(AUDIENCE_FLAG_KEY), null)
})
