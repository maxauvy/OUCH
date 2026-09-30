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
  weekday: /on average better/, walk: 'Short walk', shareBtn: /Share today/, msg: 'A bit cloudy today, thanks for being there',
  c1: ['Today', 'Your day in *10 seconds*', 'Slide, tap, done.'],
  c2: ['Understand', 'What *drives* your pain', 'Sleep, stress, weather, treatments: it’s all connected.'],
  c3: ['Journal', 'A *weather* for every day', 'Your month at a glance, from sunshine to storms.'],
  c4: ['Trends', 'Finally see what *changes*', 'Pain curve, dose changes, associated factors.'],
  c5: ['Action steps', 'Spot your *tough days*', 'Your pain changes with the days of the week.'],
  c6: ['Action steps', 'Find what *helps you*', 'Walking, meditation, rest: see what really matters to you.'],
  c7: ['Loved ones', 'Share your *weather* with them', 'One picture, a little note. Nothing is sent without you.'],
  c8: ['Family', 'Explain it *to your kids*', 'Gentle words, adapted to each age.'],
  c9: ['Appointment', 'A report for your *doctor*', 'Ready to print or export as PDF.'],
} : {
  locale: 'fr-FR', today: 'Aujourd', journal: 'Journal', trends: 'Tendances', kids: 'Enfants',
  head: 'Tête', upperBack: 'Dos haut', bath: /Bain chaud/, d90: /^90 j/, age: '8–12 ans', report: 'Rapport pour mon médecin',
  weekday: /en moyenne meilleures/, walk: 'Marche courte', shareBtn: /Partager ma météo/, msg: 'Journée un peu voilée, merci d’être là',
  c1: ['Aujourd’hui', 'Ta journée en *10 secondes*', 'Glisse, tape, c’est noté.'],
  c2: ['Comprendre', 'Ce qui *influence* ta douleur', 'Sommeil, stress, météo, traitements : tout est relié.'],
  c3: ['Journal', 'Chaque jour, *une météo*', 'Ton mois en un coup d’œil, du soleil à l’orage.'],
  c4: ['Tendances', 'Vois enfin ce qui *a un impact*', 'Courbe de douleur, changements de dose, facteurs associés.'],
  c5: ['Pistes d’action', 'Repère tes *jours difficiles*', 'Ta douleur varie selon les jours de la semaine.'],
  c6: ['Pistes d’action', 'Trouve ce qui *t’aide*', 'Marche, méditation, repos : vois ce qui compte pour toi.'],
  c7: ['Proches', 'Partage ta *météo* du jour', 'Une image, un petit mot. Rien n’est envoyé sans toi.'],
  c8: ['En famille', 'Explique-le *à tes enfants*', 'Des mots doux, adaptés à chaque âge.'],
  c9: ['Consultation', 'Un rapport pour ton *médecin*', 'Prêt à imprimer ou à exporter en PDF.'],
}
const DUR = 60
const work = mkdtempSync(join(tmpdir(), 'ouch-promo-'))
const DEMO = join(work, 'demo.json')
const here = (f) => fileURLToPath(new URL(f, import.meta.url))
const MUSIC = join(work, 'music.wav')
execFileSync('node', [here('../generate-demo-history.mjs'), DEMO], { stdio: 'ignore', env: { ...process.env, DEMO_LANG: EN ? 'en' : 'fr' } })
execFileSync('node', [here('./synth.mjs'), MUSIC, String(DUR)], { stdio: 'ignore' })
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
await F.addStyleTag({ content: '.promo-hl{outline:3px solid #ffb703;outline-offset:5px;border-radius:12px;animation:hlp 1s ease-in-out infinite}@keyframes hlp{50%{outline-color:#ffe08a;outline-offset:8px}}' })
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

let camBusyUntil = 0 // clicks are aimed with the current camera transform: wait for it to settle
const cam = (o) => { camBusyUntil = Date.now() + (o.ms ?? 900) + 80; return p.evaluate((o) => window.cam(o), o) }
const settle = () => p.waitForTimeout(Math.max(0, camBusyUntil - Date.now()))
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
  await settle()
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
const hl = (h) => h.evaluate((e) => e.classList.add('promo-hl'))
const unhl = () => F.evaluate(() => document.querySelectorAll('.promo-hl').forEach((e) => e.classList.remove('promo-hl')))
const phoneY = async (loc) => { const r = await rectOf(loc); return r.y + r.h / 2 }

// ── intro
await layer('intro', true)
await at(3.1); await layer('intro', false)
await cam({ z: 1, ms: 1000 })

// ── 1. Today: quick entry
await at(3.9); await caption(...T.c1)
const range = F.locator('input[type=range]').first()
await at(4.7); await cam({ fy: await phoneY(range), z: 1.6, ms: 900 })
await at(5.6)
{ const { r, s, gx, gy } = await pt(range)
  const xAt = (v) => gx + (r.x + 12 + (r.w - 24) * v / 10) * s, y = gy + (r.y + r.h / 2) * s
  await drag(xAt(4), y, xAt(7), y, 1000) }
await at(7.3); await cam({ z: 1, ms: 900 })
await at(8.3); await tap(F.getByRole('button', { name: T.head }))
await at(9.0); await tap(F.getByRole('button', { name: T.upperBack }))
await at(9.7); await scroll(480, 1000)

// ── 2. Understand
await at(11.0); await caption(...T.c2)
await at(11.3); await scroll(560, 1600)
await at(13.1); await scroll(600, 1500)
await at(14.6); await scroll(-1700, 800)

// ── 3. Journal
await at(15.5); await caption(...T.c3)
await at(15.8); await tab(T.journal)
await at(17.0); await tap(F.locator('button', { hasText: '‹' }).first())
await at(17.9); await tap(F.locator('button', { hasText: '›' }).first())
await at(18.5); await cam({ fy: 270, z: 1.5, ms: 1000 })
await at(19.3); await cam({ z: 1, ms: 700 })

// ── 4. Trends: the curve
await at(19.5); await caption(...T.c4)
await at(19.8); await tab(T.trends)
await at(20.9); await tap(F.getByRole('button', { name: T.d90 }))
await at(21.7)
{ const c = F.locator('.recharts-wrapper').first(); await cam({ fy: await phoneY(c), z: 1.6, ms: 1000 }) }
await at(24.8); await cam({ z: 1, ms: 700 })

// ── 5. Action steps: the tough days of the week, then what helps
await at(25.4); await caption(...T.c5)
const weekday = F.getByText(T.weekday).first()
await at(25.8); await bring(weekday, 1200)
await at(27.1); await hl(weekday); await cam({ fy: await phoneY(weekday), z: 1.5, ms: 900 })
await at(30.7); await unhl(); await cam({ z: 1, ms: 700 })
await at(31.0); await caption(...T.c6)
// the whole block (title, with/without bars, insight): climb until it is tall enough
const walkCard = await F.getByText(T.walk, { exact: true }).last().evaluateHandle((e) => {
  let n = e; while (n.parentElement && n.getBoundingClientRect().height < 120) n = n.parentElement; return n })
await at(31.2); await bring(walkCard, 1400)
await at(32.8); await hl(walkCard); await cam({ fy: await phoneY(walkCard), z: 1.45, ms: 900 })
await at(36.6); await unhl(); await cam({ z: 1, ms: 700 })

// ── 6. Sharing the weather with loved ones
await at(37.4); await caption(...T.c7)
await at(37.6); await tab(T.today)
await at(38.6); await F.evaluate(() => scrollTo(0, 0))
const shareBtn = F.getByRole('button', { name: T.shareBtn })
await at(38.8); await bring(shareBtn, 1400)
await at(40.3); await tap(shareBtn)
await at(41.6); await cam({ fy: 330, z: 1.35, ms: 900 })
const msgBox = F.locator('dialog input, dialog textarea').first()
await at(42.6); await cam({ fy: await phoneY(msgBox) - 120, z: 1.25, ms: 700 })
await at(43.3); await tap(msgBox)
await at(43.6); await p.keyboard.type(T.msg, { delay: 55 })
await at(46.3); await cam({ fy: 330, z: 1.3, ms: 800 })
await at(47.3); await cam({ z: 1, ms: 600 }); await p.keyboard.press('Escape')

// ── 7. Kids
await at(47.8); await caption(...T.c8)
await at(48.1); await tab(T.kids)
await at(49.3); await tap(F.getByText(T.age))
await at(50.3); await scroll(520, 1400)
await at(52.0); await scroll(-520, 700)

// ── 8. Doctor report
await at(52.6); await caption(...T.c9)
await at(52.9); await tab(T.trends)
await at(53.9); await F.evaluate(() => scrollTo(0, 0))
await at(54.2); await tap(F.getByText(T.report))
await at(55.2); await scroll(1500, 2200)
await at(57.6); await cam({ z: 1, dy: 1000, ms: 900 }); await p.evaluate(() => window.clearCaption())
await at(58.2); await layer('outro', true)
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
