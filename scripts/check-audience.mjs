// Checks, in a real browser and against the built app, what the weekly audience
// signal does and does not send (lib/audience.ts): exactly one request per week,
// only the event path, no cookie, none when switched off, under Do Not Track,
// on another host, and a retry at the next launch after a failure. The network
// is intercepted: nothing leaves the machine.
//
//   npm i --no-save playwright && npx playwright install chromium   # once
//   VITE_AUDIENCE_URL=https://ouch-test.goatcounter.com/count VITE_AUDIENCE_HOST=ouch.example npm run build
//   node scripts/check-audience.mjs
//
// `ouch.example` is mapped to this machine, so the page is not on a local host
// (the measurement refuses those). CHROMIUM_PATH points at a browser binary
// when the one Playwright expects is not installed.

import { chromium } from 'playwright'
import http from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const DIST = new URL('../dist', import.meta.url).pathname
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/OUCH\//, '/')
  let f = join(DIST, p)
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html')
  res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' })
  res.end(readFileSync(f))
}).listen(4173)

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--host-resolver-rules=MAP ouch.example 127.0.0.1'] })
const results = []
const check = (name, ok, detail = '') => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', name, detail) }

async function session({ dnt = false, origin = 'http://ouch.example:4173', patch = {} } = {}) {
  const ctx = await browser.newContext()
  if (dnt) await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'doNotTrack', { get: () => '1' }))
  const hits = []
  await ctx.route('https://ouch-test.goatcounter.com/**', async (route) => {
    const r = route.request()
    hits.push({ url: r.url(), headers: await r.allHeaders(), method: r.method() })
    await route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const url = origin + '/OUCH/'
  await page.goto(url)
  await page.waitForTimeout(500)
  // Finish the setup by writing the settings straight in IndexedDB.
  await page.evaluate((patch) => new Promise((resolve, reject) => {
    const open = indexedDB.open('ouch')
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('settings', 'readwrite')
      tx.objectStore('settings').put({ id: 1, onboardingDone: true, language: 'fr', enabledFactors: [], illnesses: [], ...patch })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
  }), patch)
  return { ctx, page, hits, errors, url }
}
const launch = async (s, wait = 3500) => { await s.page.goto(s.url); await s.page.waitForTimeout(wait) }

// 1. Official host: one request on the first launch of the week, none on the second.
{
  const s = await session()
  await launch(s)
  check('first launch: exactly one request', s.hits.length === 1, String(s.hits.length))
  const u = new URL(s.hits[0].url)
  check('request is the bare event', u.origin + u.pathname === 'https://ouch-test.goatcounter.com/count' && [...u.searchParams.keys()].sort().join() === 'e,ns,p', s.hits[0].url)
  check('path /actif/navigateur/<week>', /^\/actif\/navigateur\/\d{4}-W\d{2}$/.test(u.searchParams.get('p')), u.searchParams.get('p'))
  const h = s.hits[0].headers
  console.log('  headers:', JSON.stringify(h))
  check('no cookie, no referer', !('cookie' in h) && !('referer' in h))
  check('flag written', (await s.page.evaluate(() => localStorage.getItem('ouch.audience.lastWeek'))) === u.searchParams.get('p').split('/')[3])
  await launch(s)
  check('second launch same week: still one request', s.hits.length === 1, String(s.hits.length))
  // 2. Switched off: no request, flag removed.
  await s.page.evaluate(() => localStorage.setItem('ouch.audience.lastWeek', '2000-W01'))
  await s.page.evaluate(() => new Promise((resolve) => {
    const o = indexedDB.open('ouch'); o.onsuccess = () => { const db = o.result; const tx = db.transaction('settings', 'readwrite'); const st = tx.objectStore('settings'); const g = st.get(1); g.onsuccess = () => { st.put({ ...g.result, audienceMeasurementEnabled: false }) }; tx.oncomplete = () => { db.close(); resolve() } }
  }))
  await launch(s)
  check('switched off: no new request', s.hits.length === 1, String(s.hits.length))
  check('switched off: flag removed', (await s.page.evaluate(() => localStorage.getItem('ouch.audience.lastWeek'))) === null)
  check('no console errors', s.errors.length === 0, s.errors.join(' | '))
  await s.ctx.close()
}
// 3. Do Not Track.
{
  const s = await session({ dnt: true }); await launch(s)
  check('DNT: no request, no flag', s.hits.length === 0 && (await s.page.evaluate(() => localStorage.getItem('ouch.audience.lastWeek'))) === null)
  await s.ctx.close()
}
// 4. Another host (a fork, or the local address).
{
  const s = await session({ origin: 'http://127.0.0.1:4173' }); await launch(s)
  check('other host: no request', s.hits.length === 0)
  await s.ctx.close()
}
// 5. Offline failure: the request fails, no flag, then it retries.
{
  const s = await session()
  await s.ctx.unroute('https://ouch-test.goatcounter.com/**')
  let n = 0
  await s.ctx.route('https://ouch-test.goatcounter.com/**', (route) => { n++; return route.abort('failed') })
  await launch(s)
  check('failed request: tried once, no flag, no error shown', n === 1 && (await s.page.evaluate(() => localStorage.getItem('ouch.audience.lastWeek'))) === null, String(n))
  await s.ctx.unroute('https://ouch-test.goatcounter.com/**')
  await s.ctx.route('https://ouch-test.goatcounter.com/**', (route) => { n++; return route.fulfill({ status: 200, body: '' }) })
  await launch(s)
  check('next launch retries and sets the flag', n === 2 && (await s.page.evaluate(() => localStorage.getItem('ouch.audience.lastWeek'))) !== null, String(n))
  await s.ctx.close()
}
await browser.close(); server.close()
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED')
process.exit(results.every(Boolean) ? 0 : 1)
