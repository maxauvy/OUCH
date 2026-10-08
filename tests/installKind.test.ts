// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { installKind, type InstallEnv } from '../src/lib/installKind.ts'

const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1'
const FIREFOX_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/140.0 Mobile/15E148 Safari/605.1.15'
const IPAD_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'

const env = (over: Partial<InstallEnv>): InstallEnv => ({
  standalone: false,
  userAgent: CHROME_ANDROID,
  platform: 'Linux armv81',
  maxTouchPoints: 5,
  canPrompt: false,
  ...over,
})

test('an app already installed shows nothing, whatever the browser', () => {
  assert.equal(installKind(env({ standalone: true, userAgent: SAFARI_IOS, canPrompt: true })), 'installed')
})

test('a browser that hands over its prompt uses it', () => {
  assert.equal(installKind(env({ canPrompt: true })), 'prompt')
})

test('Safari on iPhone goes through Share; other iPhone browsers are told to use Safari', () => {
  assert.equal(installKind(env({ userAgent: SAFARI_IOS, platform: 'iPhone' })), 'ios-safari')
  assert.equal(installKind(env({ userAgent: CHROME_IOS, platform: 'iPhone' })), 'ios-other')
  assert.equal(installKind(env({ userAgent: FIREFOX_IOS, platform: 'iPhone' })), 'ios-other')
})

test('an iPad posing as a Mac is still an iPad, a real Mac is not', () => {
  assert.equal(installKind(env({ userAgent: IPAD_SAFARI, platform: 'MacIntel', maxTouchPoints: 5 })), 'ios-safari')
  assert.equal(installKind(env({ userAgent: SAFARI_MAC, platform: 'MacIntel', maxTouchPoints: 0 })), 'other')
})

test('Android without a prompt, and desktop browsers, use the browser menu', () => {
  assert.equal(installKind(env({})), 'other')
})
