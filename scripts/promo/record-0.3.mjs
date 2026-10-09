// Records a ~52 s "what's new in 0.3.0" video, in the spirit of record-0.2.mjs
// (same stage, brighter backing track, a "Nouveau" kicker on every scene), but
// shorter: the review of a treatment change, the eleven-box pain scale, the
// report table, the install card, then a quick "And also…".
//
//   npm i --no-save playwright && npx playwright install chromium   # once
//   brew install ffmpeg                                             # once
//   npm run dev -- --port 5180                                      # other terminal
//   node scripts/promo/record-0.3.mjs [portrait|landscape] [output.mp4] [app-url]
//   PROMO_LANG=en node scripts/promo/record-0.3.mjs landscape
//
// The demo history is generated with DEMO_TODAY=empty so that Today opens during
// a flare (the demo dates are relative to today, so the review buttons are
// found by medication name, not by date). Its pregabalin stop gives a finished review, its duloxetine dose
// change an ongoing one. PROMO_LANG=en for the English version (default: fr).
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
const NEW = EN ? '✦ New' : '✦ Nouveau'
const T = EN ? {
  locale: 'en-US', settings: /Settings/, today: 'Today', trends: 'Trends',
  review: 'Before and after a change', prega: /^Pregabalin · /, amitrip: /^Amitriptyline · /, curve: /See on the curve/, scale: 'Pain', report: 'Report for my doctor',
  rtitle: 'Changes in background treatment', install: 'Install OUCH on your home screen',
  intro: 'Version <em>0.3.0</em> is here', outro: 'Clearer. Gentler. <em>Always private.</em>',
  local: '100% local · your data stays on your device', more: 'And also…',
  c1: [NEW, 'Before and after *a change*', 'Before, after a treatment change: described, nothing promised.'],
  c1b: [NEW, 'Within *your usual gaps* or beyond', 'Compared with your own months, not with a norm.'],
  c1c: [NEW, 'And what *else* changed', 'Another change at the same time, or during a flare: said plainly.'],
  c2: [NEW, 'Rate your pain *in one tap*', 'Eleven big boxes on flare days, nothing preselected.'],
  c3: [NEW, 'Before and after, *in the report*', 'For each treatment change: before → after.'],
  c4: [NEW, 'OUCH on *your home screen*', 'Step by step, with a small drawing for each one.'],
  pills: ['☕ A coffee to support OUCH, if you like', '📄 For clinicians: a brochure and a methodology note', '💊 Readable doses: 30 mg → 60 mg'],
} : {
  locale: 'fr-FR', settings: /Réglages/, today: 'Aujourd', trends: 'Tendances',
  review: 'Avant et après un changement', prega: /^Prégabaline · /, amitrip: /^Amitriptyline · /, curve: /Voir sur la courbe/, scale: 'Douleur', report: 'Rapport pour mon médecin',
  rtitle: 'Changements de traitement de fond', install: 'Installer OUCH sur l’écran d’accueil',
  intro: 'La version <em>0.3.0</em> est là', outro: 'Plus clair. Plus doux. <em>Toujours privé.</em>',
  local: '100 % local · tes données restent sur ton appareil', more: 'Et aussi…',
  c1: [NEW, 'Avant et après *un changement*', 'Avant, après un changement de traitement : décrit, sans rien promettre.'],
  c1b: [NEW, 'Dans *tes écarts habituels* ou au-delà', 'Comparé à tes propres mois, pas à une norme.'],
  c1c: [NEW, 'Et ce qui a *aussi* changé', 'Un autre changement au même moment, ou pendant une poussée : dit sans détour.'],
  c2: [NEW, 'Note ta douleur *en un geste*', 'Onze grosses cases les jours de poussée, rien de présélectionné.'],
  c3: [NEW, 'Avant et après *dans le rapport*', 'Pour chaque changement de traitement : avant → après.'],
  c4: [NEW, 'OUCH sur *ton écran d’accueil*', 'Pas à pas, avec un petit dessin à chaque étape.'],
  pills: ['☕ Un café pour soutenir OUCH, si tu veux', '📄 Pour les soignants : une plaquette et une note méthodologique', '💊 Des doses lisibles : 30 mg → 60 mg'],
}
const DUR = 52
const work = mkdtempSync(join(tmpdir(), 'ouch-promo-'))
const DEMO = join(work, 'demo.json')
const MUSIC = join(work, 'music.wav')
const here = (f) => fileURLToPath(new URL(f, import.meta.url))
execFileSync('node', [here('../generate-demo-history.mjs'), DEMO], { stdio: 'ignore', env: { ...process.env, DEMO_TODAY: 'empty', DEMO_DAYS: '330', DEMO_LANG: EN ? 'en' : 'fr' } })
execFileSync('node', [here('./synth.mjs'), MUSIC, String(DUR), 'bright'], { stdio: 'ignore' })
let STAGE = readFileSync(here('./stage.html'), 'utf8')
  .replace('Ton journal de douleur, <em>simple</em> et <em>privé</em>', T.intro)
  .replace('Note. Comprends. <em>Partage.</em>', T.outro)
  .replace('100 % local · tes données restent sur ton appareil', T.local)
  .replace('✦ Nouveau', NEW).replace('Et aussi…', T.more)
  .replace('<!--PILLS-->', T.pills.map((t, i) => `<li style="--i:${i}">${t}</li>`).join(''))
if (EN) STAGE = STAGE.replace('lang="fr"', 'lang="en"')

const b = await chromium.launch({ args: ['--force-device-scale-factor=2'] })
const base = { viewport: { width: VW, height: VH }, deviceScaleFactor: 2, locale: T.locale }

// prep: import the demo history
const prep = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, locale: T.locale })
const pp = await prep.newPage()
await pp.goto(APP); await pp.getByText('Passer', { exact: true }).click()
await pp.getByRole('button', { name: /Réglages/ }).click() // the app always starts in French
await pp.getByRole('button', { name: /Mes données/ }).click(); await pp.waitForTimeout(400)
await pp.locator('input[type=file]').setInputFiles(DEMO)
await pp.locator('input[type=password]').last().fill('demo')
await pp.getByRole('button', { name: 'Importer', exact: true }).click()
await pp.waitForTimeout(4000)
if (EN) { await pp.getByRole('button', { name: /Rappel et affichage|Reminder and display/ }).click(); await pp.getByRole('radio', { name: 'English' }).click(); await pp.waitForTimeout(800) }
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
async function tap(loc, hold = 110) {
  await settle()
  const { x, y } = await pt(loc)
  await p.mouse.move(x, y, { steps: 8 }); await p.mouse.down(); await p.waitForTimeout(hold); await p.mouse.up()
}
async function drag(x0, y0, x1, y1, ms = 800) {
  await p.mouse.move(x0, y0, { steps: 6 }); await p.mouse.down(); await p.waitForTimeout(120)
  const n = 24
  for (let i = 1; i <= n; i++) { await p.mouse.move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await p.waitForTimeout(ms / n) }
  await p.mouse.up()
}
const scroll = (dy, ms) => F.evaluate(([dy, ms]) => new Promise((res) => {
  const y0 = scrollY, t0 = performance.now(), ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
  const step = (now) => { const t = Math.min(1, (now - t0) / ms); scrollTo(0, y0 + dy * ease(t)); t < 1 ? requestAnimationFrame(step) : res() }
  requestAnimationFrame(step)
}), [dy, ms])
async function bring(loc, ms = 800, at = 330) { // scroll so the element sits `at` px from the top of the screen
  const r = await rectOf(loc); await scroll(r.y + r.h / 2 - at, ms)
}
const tab = (n) => tap(F.getByRole('button', { name: n instanceof RegExp ? n : new RegExp(n) }))
const hl = (h) => h.evaluate((e) => e.classList.add('promo-hl'))
const unhl = () => F.evaluate(() => document.querySelectorAll('.promo-hl').forEach((e) => e.classList.remove('promo-hl')))
const phoneY = async (loc) => { const r = await rectOf(loc); return r.y + r.h / 2 }
// the whole card around a piece of text: climb until it is tall enough
const cardOf = (loc, min = 120) => loc.evaluateHandle((e, min) => {
  let n = e; while (n.parentElement && n.getBoundingClientRect().height < min) n = n.parentElement; return n }, min)

// ── intro
await layer('intro', true)
await at(2.3); await layer('intro', false)
await cam({ z: 1, ms: 900 })

// ── 1. Trends: the review of a change, in all its displays
await at(2.8); await caption(...T.c1)
await at(3.0); await tab(T.trends)
const review = F.getByText(T.review, { exact: true }).first()
await at(4.0); await bring(review, 900, 150)
const reviewCard = await cardOf(review, 380)
// an ongoing review, made during a flare
await at(5.0); await hl(reviewCard); await cam({ fy: 400, z: 1.12, ms: 800 })
// its curve: the settling-in week, the mean of each period
const curveBtn = F.getByText(T.curve).first()
await at(7.6); await bring(curveBtn, 700, 320)
await at(8.5); await tap(curveBtn)
await at(9.4); await scroll(300, 1000)
await at(12.0); await caption(...T.c1b)
await bring(review, 800, 150)
// a finished one, set beside the person's usual gaps
await at(13.0); await tap(F.getByRole('button', { name: T.prega }).first())
await at(14.0); await scroll(330, 2200)
await at(17.0); await bring(review, 700, 150)
await at(17.4); await caption(...T.c1c)
// a start made during a flare, with other changes around it
await at(17.8); await tap(F.getByRole('button', { name: T.amitrip }).first())
await at(18.8); await scroll(300, 2000)
await at(21.2); await unhl(); await cam({ z: 1, ms: 500 })

// ── 2. Today: eleven big boxes
await at(21.8); await caption(...T.c2)
await at(22.0); await tab(T.today)
await at(22.9); await F.evaluate(() => scrollTo(0, 0))
const scale = F.getByRole('radiogroup').first()
await at(23.1); await bring(scale, 900, 330)
await at(24.1); await cam({ fy: await phoneY(scale), z: 1.6, ms: 800 })
await at(25.5); await tap(scale.getByRole('radio').nth(7))
await at(28.3); await cam({ z: 1, ms: 500 })

// ── 3. Report: changes in background treatment
await at(28.8); await caption(...T.c3)
await at(29.0); await tab(T.trends)
await at(29.8); await F.evaluate(() => scrollTo(0, 0))
await at(30.0); await tap(F.getByText(T.report))
const rtitle = F.getByText(T.rtitle).first()
await at(31.3); await rtitle.waitFor({ timeout: 8000 })
await bring(rtitle, 1000, 260)
const ry = await phoneY(rtitle) + 70
await at(32.7); await cam({ fx: 100, fy: ry, z: 2.4, ms: 800 })
await at(33.5); await cam({ fx: 290, fy: ry, z: 2.4, ms: 2800 })
await at(36.7); await cam({ z: 1, ms: 500 })

// ── 4. Settings: install card
await at(37.2); await caption(...T.c4)
await at(37.4); await tab(T.settings)
await at(38.3); await F.evaluate(() => scrollTo(0, 0))
const inst = F.getByText(T.install, { exact: true }).first()
await at(38.5); await bring(inst, 1200, 300)
const instCard = await cardOf(inst, 200)
await at(40.0); await hl(instCard); await cam({ fy: await phoneY(instCard), z: 1.4, ms: 800 })
await at(42.5); await unhl(); await cam({ z: 1, ms: 500 })

// ── 5. And also…
await at(42.9); await p.evaluate(() => window.clearCaption()); await cam({ z: 1, dy: 1500, ms: 500 })
await at(43.3); await layer('more', true)
await at(47.3); await layer('more', false)

// ── outro
await at(47.7); await layer('outro', true)
await at(DUR)

await cdp.send('Page.stopScreencast'); await ctx.close(); await b.close()
let list = ''
for (let i = 0; i < frames.length; i++) list += `file '${frames[i].f}'\nduration ${((frames[i + 1]?.t ?? frames[i].t + 0.5) - frames[i].t).toFixed(4)}\n`
list += `file '${frames.at(-1).f}'\n`
const lf = join(work, 'frames.txt'); writeFileSync(lf, list)
const out = process.argv[3] ?? `ouch-0.3-${EN ? 'en' : 'fr'}-${MODE}.mp4`
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lf, '-i', MUSIC,
  '-vf', 'fps=30,tpad=stop_mode=clone:stop_duration=3,pad=ceil(iw/2)*2:ceil(ih/2)*2', '-t', String(DUR),
  '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' })
rmSync(work, { recursive: true, force: true })
console.log('wrote', out)
