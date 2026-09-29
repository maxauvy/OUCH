// Records a ~30 s mobile demo video of the app (MP4, 780x1688) from the
// 90-day demo history: today's entry, journal, kids page, trends, doctor report.
//
//   npm i --no-save playwright && npx playwright install chromium   # once
//   brew install ffmpeg                                             # once
//   npm run dev -- --port 5180                                      # in another terminal
//   node scripts/record-demo-video.mjs [output.mp4] [app-url]
//
// The demo history is generated on the fly (password "demo") and imported
// through Settings → Backup, exactly as a user would. Chrome runs with
// --force-device-scale-factor=2 because that is what makes its screencast
// deliver real 2x pixels (Playwright's own recordVideo pastes a 1x frame in
// the corner of a grey canvas). The UI is French: labels are matched by text.

import { chromium } from 'playwright'
import { rmSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUTPUT = process.argv[2] ?? 'ouch-demo-video.mp4'
const APP_URL = process.argv[3] ?? 'http://localhost:5180'
const work = mkdtempSync(join(tmpdir(), 'ouch-demo-video-'))
const DEMO = join(work, 'demo.json')
const FRAMES = join(work, 'frames')
execFileSync('node', [fileURLToPath(new URL('./generate-demo-history.mjs', import.meta.url)), DEMO], { stdio: 'inherit' })
const W = 390, H = 844
const b = await chromium.launch({ args: ['--force-device-scale-factor=2'] })
const base = { viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: false, locale: 'fr-FR' }

// 1) prep: import the demo history, keep the resulting storage
const prep = await b.newContext(base)
const pp = await prep.newPage()
await pp.goto(APP_URL)
await pp.getByText('Passer').click()
await pp.getByRole('button', { name: /Réglages/ }).click()
await pp.locator('input[type=file]').setInputFiles(DEMO)
await pp.locator('input[type=password]').last().fill('demo')
await pp.getByRole('button', { name: 'Importer', exact: true }).click()
await pp.waitForTimeout(4000)
const state = await prep.storageState({ indexedDB: true })
await prep.close()

// 2) record
mkdirSync(FRAMES)
const ctx = await b.newContext({ ...base, storageState: state })
await ctx.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style')
    s.textContent = `
      #fx-dot{position:fixed;z-index:99999;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
        background:rgba(15,90,140,.28);border:2px solid rgba(15,90,140,.6);opacity:0;transform:scale(.6);transition:opacity .15s,transform .15s}
      #fx-dot.on{opacity:1;transform:scale(1)}
      *{scrollbar-width:none} ::-webkit-scrollbar{display:none}`
    document.head.appendChild(s)
    const d = document.createElement('div'); d.id = 'fx-dot'; document.body.appendChild(d)
    const move = (e) => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px' }
    addEventListener('pointerdown', (e) => { move(e); d.classList.add('on') }, true)
    addEventListener('pointermove', move, true)
    addEventListener('pointerup', () => d.classList.remove('on'), true)
  })
})
const p = await ctx.newPage()
const cdp = await ctx.newCDPSession(p)
const frames = []
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const f = `${FRAMES}/${String(frames.length).padStart(5, '0')}.jpg`
  writeFileSync(f, Buffer.from(data, 'base64'))
  frames.push({ f, t: metadata.timestamp })
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 })
const wait = (ms) => p.waitForTimeout(ms)
const scroll = (dy, ms) => p.evaluate(([dy, ms]) => new Promise((res) => {
  const y0 = scrollY, t0 = performance.now()
  const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
  const step = (now) => { const t = Math.min(1, (now - t0) / ms); scrollTo(0, y0 + dy * ease(t)); t < 1 ? requestAnimationFrame(step) : res() }
  requestAnimationFrame(step)
}), [dy, ms])
async function tap(loc, hold = 120) {
  const bb = await loc.boundingBox()
  const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2
  await p.mouse.move(x, y, { steps: 8 }); await p.mouse.down(); await wait(hold); await p.mouse.up()
}
async function drag(x0, y0, x1, y1, ms = 900) {
  await p.mouse.move(x0, y0, { steps: 6 }); await p.mouse.down(); await wait(150)
  const n = 24
  for (let i = 1; i <= n; i++) { await p.mouse.move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await wait(ms / n) }
  await p.mouse.up()
}
const tab = (n) => tap(p.getByRole('button', { name: new RegExp(n) }))

await p.goto(APP_URL); await wait(1500)

// Aujourd'hui — la douleur
const range = p.locator('input[type=range]').first()
const rb = await range.boundingBox()
const xAt = (v) => rb.x + 12 + (rb.width - 24) * v / 10
await drag(xAt(4), rb.y + rb.height / 2, xAt(7), rb.y + rb.height / 2)
await wait(700)
await tap(p.getByRole('button', { name: 'Tête' })); await wait(500)
await scroll(520, 1600); await wait(500)
await scroll(700, 1800); await wait(300)
await tap(p.getByRole('button', { name: 'Bain chaud' })); await wait(600)
await scroll(-1400, 1500); await wait(200)

// Journal
await tab('Journal'); await wait(1200)
await tap(p.getByRole('button', { name: '‹' }).first().or(p.locator('button', { hasText: '‹' }).first())); await wait(900)
await tap(p.locator('button', { hasText: '›' }).first()); await wait(900)

// Enfants
await tab('Enfants'); await wait(1300)
await tap(p.getByText('8–12 ans')); await wait(1200)
await scroll(500, 1400); await wait(400)

// Tendances
await tab('Tendances'); await wait(1000)
await tap(p.getByRole('button', { name: /^90 j/ })); await wait(1200)
await scroll(650, 1800); await wait(400)
await scroll(700, 1800); await wait(300)
await scroll(-1500, 1300); await wait(200)

// Rapport médecin
await tap(p.getByText('Rapport pour mon médecin')); await wait(1200)
await scroll(700, 1800); await wait(400)
await scroll(900, 2000); await wait(800)

await cdp.send('Page.stopScreencast')
await ctx.close(); await b.close()
let list = ''
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 0.5
  list += `file '${frames[i].f}'\nduration ${d.toFixed(4)}\n`
}
list += `file '${frames.at(-1).f}'\n`
const listFile = join(work, 'frames.txt')
writeFileSync(listFile, list)
// 1.12x: tightens the pauses to land near 30 s
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
  '-vf', 'setpts=PTS/1.12,fps=30,pad=ceil(iw/2)*2:ceil(ih/2)*2',
  '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUTPUT], { stdio: 'inherit' })
rmSync(work, { recursive: true, force: true })
console.log('wrote', OUTPUT)
