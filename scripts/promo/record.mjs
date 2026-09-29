// Records a ~50 s promo video of the app: animated captions, zooms on key
// features, a phone frame, and a synthesized backing track (see synth.mjs).
//
//   npm i --no-save playwright && npx playwright install chromium   # once
//   brew install ffmpeg                                             # once
//   npm run dev -- --port 5180                                      # other terminal
//   node scripts/promo/record.mjs <portrait|landscape> [output.mp4] [app-url]
//   PROMO_LANG=en node scripts/promo/record.mjs portrait            # English (default: fr)
//
// portrait = 1080x1920 (9:16), landscape = 1920x1080 (16:9). How it works:
// stage.html (a phone with the app in an iframe, captions, camera zooms) is
// served by Playwright at /__stage.html on the app's own origin, so it shares
// the IndexedDB into which the generated 90-day demo history has been imported.
// A scripted, timed scenario drives the app while Chrome's screencast frames are
// collected (--force-device-scale-factor=2 gives real 2x pixels) and encoded by
// ffmpeg. Scene timings, captions and selectors live in the scenario below.
import { chromium } from 'playwright'
import { rmSync, mkdirSync, writeFileSync, readFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODE = process.argv[2] ?? 'portrait'
const APP = process.argv[4] ?? 'http://localhost:5180'
const [VW, VH] = MODE === 'portrait' ? [540, 960] : [960, 540]
const EN = process.env.PROMO_LANG === 'en'
const T = EN ? {
  locale: 'en-US', today: 'Today', journal: 'Journal', trends: 'Trends', kids: 'Kids',
  head: 'Head', upperBack: 'Upper back', bath: /Warm bath/, d90: /^90 d/, age: '8–12 years', report: 'Report for my doctor',
  c1: ['Today', 'Your day in *10 seconds*', 'Slide, tap, done.'],
  c2: ['Understand', 'What *drives* your pain', 'Sleep, stress, weather, treatments: it’s all connected.'],
  c3: ['Journal', 'A *weather* for every day', 'Your month at a glance, from sunshine to storms.'],
  c4: ['Trends', 'Finally see what *changes*', 'Pain curve, dose changes, associated factors.'],
  c5: ['Family', 'Explain it *to your kids*', 'Gentle words, adapted to each age.'],
  c6: ['Appointment', 'A report for your *doctor*', 'Ready to print or export as PDF.'],
} : {
  locale: 'fr-FR', today: 'Aujourd', journal: 'Journal', trends: 'Tendances', kids: 'Enfants',
  head: 'Tête', upperBack: 'Dos haut', bath: /Bain chaud/, d90: /^90 j/, age: '8–12 ans', report: 'Rapport pour mon médecin',
  c1: ['Aujourd’hui', 'Ta journée en *10 secondes*', 'Glisse, touche, c’est noté.'],
  c2: ['Comprendre', 'Ce qui *influence* ta douleur', 'Sommeil, stress, météo, traitements : tout est relié.'],
  c3: ['Journal', 'Chaque jour, *une météo*', 'Ton mois en un coup d’œil, du soleil à l’orage.'],
  c4: ['Tendances', 'Vois enfin ce qui *change*', 'Courbe de douleur, changements de dose, facteurs associés.'],
  c5: ['En famille', 'Explique-le *aux enfants*', 'Des mots doux, adaptés à chaque âge.'],
  c6: ['Consultation', 'Un rapport pour ton *médecin*', 'Prêt à imprimer ou à exporter en PDF.'],
}
const DUR = 50
const work = mkdtempSync(join(tmpdir(), 'ouch-promo-'))
const DEMO = join(work, 'demo.json')
const here = (f) => fileURLToPath(new URL(f, import.meta.url))
const MUSIC = join(work, 'music.wav')
execFileSync('node', [here('../generate-demo-history.mjs'), DEMO], { stdio: 'ignore' })
execFileSync('node', [here('./synth.mjs'), MUSIC], { stdio: 'ignore' })
let STAGE = readFileSync(here('./stage.html'), 'utf8')
if (EN) STAGE = STAGE.replace('lang="fr"', 'lang="en"')
  .replace('Ton journal de douleur, <em>simple</em> et <em>privé</em>', 'Your pain journal, <em>simple</em> and <em>private</em>')
  .replace('Note. Comprends. <em>Partage.</em>', 'Log. Understand. <em>Share.</em>')
  .replace('100 % local · tes données restent sur ton appareil', '100% local · your data stays on your device')

const b = await chromium.launch({ args: ['--force-device-scale-factor=2'] })
const base = { viewport: { width: VW, height: VH }, deviceScaleFactor: 2, locale: T.locale }

// prep: import demo history
const prep = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, locale: T.locale })
const pp = await prep.newPage()
await pp.goto(APP); await pp.getByText('Passer').click()
await pp.getByRole('button', { name: /Réglages/ }).click()
await pp.locator('input[type=file]').setInputFiles(DEMO)
await pp.locator('input[type=password]').last().fill('demo')
await pp.getByRole('button', { name: 'Importer', exact: true }).click()
await pp.waitForTimeout(4000)
if (EN) { await pp.getByRole('radio', { name: 'English' }).click(); await pp.waitForTimeout(800) }
await pp.getByRole('button', { name: /Today|Aujourd/ }).click(); await pp.waitForTimeout(600)
const later = pp.getByRole('button', { name: /^(Plus tard|Later)$/ })
if (await later.count()) { await later.click(); await pp.waitForTimeout(400) }
const state = await prep.storageState({ indexedDB: true }); await prep.close()

const ctx = await b.newContext({ ...base, storageState: state })
await ctx.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style')
    s.textContent = `#fx-dot{position:fixed;z-index:99999;pointer-events:none;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
      background:rgba(255,255,255,.55);border:3px solid rgba(15,90,140,.75);box-shadow:0 2px 10px rgba(0,0,0,.25);opacity:0;transform:scale(.6);transition:opacity .15s,transform .15s}
      #fx-dot.on{opacity:1;transform:scale(1)} *{scrollbar-width:none} ::-webkit-scrollbar{display:none}`
    document.head.appendChild(s)
    if (window.top !== window) {
      const d = document.createElement('div'); d.id = 'fx-dot'; document.body.appendChild(d)
      const move = (e) => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px' }
      addEventListener('pointerdown', (e) => { move(e); d.classList.add('on') }, true)
      addEventListener('pointermove', move, true)
      addEventListener('pointerup', () => d.classList.remove('on'), true)
    }
  })
})
const p = await ctx.newPage()
await p.route('**/__stage.html', (r) => r.fulfill({ contentType: 'text/html', body: STAGE }))
await p.goto(APP + '/__stage.html')
const frameEl = await p.waitForSelector('#app')
const F = await frameEl.contentFrame()
await F.waitForSelector('nav', { timeout: 15000 })
await p.waitForTimeout(800)

// screencast
const cdp = await ctx.newCDPSession(p)
mkdirSync(join(work, 'frames'))
const frames = []
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const f = join(work, 'frames', `${String(frames.length).padStart(6, '0')}.jpg`)
  writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, t: metadata.timestamp })
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VW * 2, maxHeight: VH * 2, everyNthFrame: 1 })
const T0 = Date.now()
const at = (t) => p.waitForTimeout(Math.max(0, T0 + t * 1000 - Date.now()))

const cam = (o) => p.evaluate((o) => window.cam(o), o)
const caption = (k, t, s) => p.evaluate(([k, t, s]) => window.caption(k, t, s), [k, t, s])
const layer = (id, on) => p.evaluate(([id, on]) => window.layer(id, on), [id, on])
async function geom() {
  return p.evaluate(() => { const r = document.getElementById('app').getBoundingClientRect(); return [r.x, r.y, r.width / 390] })
}
const rectOf = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
async function pt(loc) {
  const r = await rectOf(loc), [gx, gy, s] = await geom()
  return { x: gx + (r.x + r.w / 2) * s, y: gy + (r.y + r.h / 2) * s, r, s, gx, gy }
}
async function tap(loc, hold = 130) {
  const { x, y } = await pt(loc)
  await p.mouse.move(x, y, { steps: 10 }); await p.mouse.down(); await p.waitForTimeout(hold); await p.mouse.up()
}
async function drag(x0, y0, x1, y1, ms = 900) {
  await p.mouse.move(x0, y0, { steps: 8 }); await p.mouse.down(); await p.waitForTimeout(150)
  const n = 24
  for (let i = 1; i <= n; i++) { await p.mouse.move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await p.waitForTimeout(ms / n) }
  await p.mouse.up()
}
const scroll = (dy, ms) => F.evaluate(([dy, ms]) => new Promise((res) => {
  const y0 = scrollY, t0 = performance.now(), ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
  const step = (now) => { const t = Math.min(1, (now - t0) / ms); scrollTo(0, y0 + dy * ease(t)); t < 1 ? requestAnimationFrame(step) : res() }
  requestAnimationFrame(step)
}), [dy, ms])
async function bring(loc, ms = 900) { // scroll so the element sits around 45% of the screen
  const r = await rectOf(loc); await scroll(r.y + r.h / 2 - 380, ms)
}
const tab = (n) => tap(F.getByRole('button', { name: new RegExp(n) }))
const phoneY = async (loc) => { const r = await rectOf(loc); return r.y + r.h / 2 }

// ── intro
await layer('intro', true)
await at(3.1); await layer('intro', false)
await cam({ z: 1, ms: 1000 })

// ── 1. Aujourd'hui : saisie
await at(3.9); await caption(...T.c1)
const range = F.locator('input[type=range]').first()
await at(4.9); await cam({ fy: await phoneY(range), z: 1.6, ms: 900 })
await at(5.9)
{ const { r, s, gx, gy } = await pt(range)
  const xAt = (v) => gx + (r.x + 12 + (r.w - 24) * v / 10) * s, y = gy + (r.y + r.h / 2) * s
  await drag(xAt(4), y, xAt(7), y, 1000) }
await at(7.7); await cam({ z: 1, ms: 900 })
await at(8.8); await tap(F.getByRole('button', { name: T.head }))
await at(9.5); await tap(F.getByRole('button', { name: T.upperBack }))
await at(10.2); await scroll(480, 1000)

// ── 2. Comprendre
await at(11.2); await caption(...T.c2)
await at(11.6); await scroll(560, 1900)
await at(13.9); await scroll(600, 1800)
await at(16.0); await scroll(-1700, 1500)

// ── 3. Journal
await at(18.0); await caption(...T.c3)
await at(18.4); await tab(T.journal)
await at(19.7); await tap(F.locator('button', { hasText: '‹' }).first())
await at(20.7); await tap(F.locator('button', { hasText: '›' }).first())
await at(21.5); await cam({ fy: 270, z: 1.55, ms: 1100 })
await at(23.5); await cam({ z: 1, ms: 800 })

// ── 4. Tendances
await at(24.0); await caption(...T.c4)
await at(24.3); await tab(T.trends)
await at(25.5); await tap(F.getByRole('button', { name: T.d90 }))
await at(26.4)
{ const c = F.locator('.recharts-wrapper').first(); await cam({ fy: await phoneY(c), z: 1.6, ms: 1100 }) }
await at(29.4); await cam({ z: 1, ms: 800 })
await at(30.3); await scroll(720, 1800)
await at(32.2); await scroll(700, 1500)

// ── 5. Enfants
await at(33.9); await caption(...T.c5)
await at(34.2); await tab(T.kids)
await at(35.4); await tap(F.getByText(T.age))
await at(36.6); await scroll(520, 1500)
await at(38.4); await scroll(-520, 900)

// ── 6. Rapport
await at(39.4); await caption(...T.c6)
await at(39.7); await tab(T.trends)
await at(40.8); await F.evaluate(() => scrollTo(0, 0))
await at(41.1); await tap(F.getByText(T.report))
await at(42.4); await scroll(1500, 2600)
await at(45.2); await cam({ z: 1.25, ms: 800 })

// ── outro
await at(46.0); await cam({ z: 1, dy: 1000, ms: 900 }); await p.evaluate(() => window.clearCaption())
await at(46.6); await layer('outro', true)
await at(DUR)

await cdp.send('Page.stopScreencast'); await ctx.close(); await b.close()
let list = ''
for (let i = 0; i < frames.length; i++) list += `file '${frames[i].f}'\nduration ${((frames[i + 1]?.t ?? frames[i].t + 0.5) - frames[i].t).toFixed(4)}\n`
list += `file '${frames.at(-1).f}'\n`
const lf = join(work, 'frames.txt'); writeFileSync(lf, list)
const out = process.argv[3] ?? `ouch-promo-${EN ? 'en' : 'fr'}-${MODE}.mp4`
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lf, '-i', MUSIC,
  '-vf', 'fps=30,tpad=stop_mode=clone:stop_duration=3,pad=ceil(iw/2)*2:ceil(ih/2)*2', '-t', String(DUR),
  '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' })
rmSync(work, { recursive: true, force: true })
console.log('wrote', out)
