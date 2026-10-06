// Records a ~59 s "what's new in 0.2.0" video: faster cuts than the first promo
// (record.mjs), a brighter backing track, a "Nouveau" kicker on every scene.
// Same machinery as record.mjs (stage.html, Playwright screencast, ffmpeg).
//
//   npm i --no-save playwright && npx playwright install chromium   # once
//   brew install ffmpeg                                             # once
//   npm run dev -- --port 5180                                      # other terminal
//   node scripts/promo/record-0.2.mjs [portrait|landscape] [output.mp4] [app-url]
//   PROMO_LANG=en node scripts/promo/record-0.2.mjs landscape
//
// The demo history is generated with DEMO_TODAY=empty so that Today opens on
// the soft "harder days" card and the lightened form, with a flare under way.
// PROMO_LANG=en for the English version (default: fr).
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
  locale: 'en-US', settings: /Settings/,
  today: 'Today', journal: 'Journal', trends: 'Trends', d90: /^90 d/, flares: 'Flares', flareBack: /back to usual/,
  word: 'The last few days have been harder.', zones: 'Where it hurts', report: 'Report for my doctor', clinic: 'Pain clinic',
  ctx: 'The 3 days before each flare', profile: /My profile/, about: /About/, sources: 'Scientific sources', refs: /Show the 15 references/,
  intro: 'Version <em>0.2.0</em> is here', outro: 'Clearer. Gentler. <em>Always private.</em>',
  local: '100% local · your data stays on your device', more: 'And also…',
  c1: [NEW, 'Your flares, *finally visible*', 'On the curve, and in a card of their own.'],
  c2: [NEW, 'Spotted in *your journal* too', 'A small mark under each day concerned.'],
  c3: [NEW, 'A kind word *on hard days*', 'With the things that have already helped you.'],
  c4: [NEW, 'A *lighter* screen', 'Pain first, the rest if you want.'],
  c5: [NEW, 'What *came before* each flare', 'Sleep, stress, treatment: described, nothing claimed.'],
  c6: [NEW, 'Settings, *neatly tidied*', 'Five collapsible groups, each summed up in a line.'],
  c7: [NEW, 'An app guided *by science*', '15 published studies inform its benchmarks, with PubMed links.'],
  pills: ['🗑️ Erase all your data', '📍 The place name for the weather', '📂 A real button to import', '🧹 One single design: Health'],
} : {
  locale: 'fr-FR', settings: /Réglages/,
  today: 'Aujourd', journal: 'Journal', trends: 'Tendances', d90: /^90 j/, flares: 'Poussées', flareBack: /retour à l’habituel/,
  word: 'Ces derniers jours ont été plus durs.', zones: 'Où ça fait mal', report: 'Rapport pour mon médecin', clinic: 'Centre douleur (CETD)',
  ctx: 'Les 3 jours avant chaque poussée', profile: /Mon profil/, about: /À propos/, sources: 'Sources scientifiques', refs: /Voir les 15 références/,
  intro: 'La version <em>0.2.0</em> est là', outro: 'Plus clair. Plus doux. <em>Toujours privé.</em>',
  local: '100 % local · tes données restent sur ton appareil', more: 'Et aussi…',
  c1: [NEW, 'Tes poussées, *enfin visibles*', 'Sur la courbe, dans une carte dédiée.'],
  c2: [NEW, 'Repérées aussi *dans ton journal*', 'Un petit trait sous chaque jour concerné.'],
  c3: [NEW, 'Un mot doux *les jours durs*', 'Et tes propres gestes qui t’ont déjà fait du bien.'],
  c4: [NEW, 'Un écran *allégé*', 'La douleur d’abord, le reste si tu veux.'],
  c5: [NEW, 'Ce qui a *précédé* chaque poussée', 'Sommeil, stress, traitement : décrit, sans rien affirmer.'],
  c6: [NEW, 'Des Réglages *bien rangés*', 'Cinq groupes repliables, résumés en une ligne.'],
  c7: [NEW, 'Une app guidée *par la science*', '15 études publiées inspirent ses repères, avec leur lien PubMed.'],
  pills: ['🗑️ Effacer toutes ses données', '📍 Le nom du lieu de la météo', '📂 Un vrai bouton pour importer', '🧹 Un seul design : Santé'],
}
const DUR = 59
const work = mkdtempSync(join(tmpdir(), 'ouch-promo-'))
const DEMO = join(work, 'demo.json')
const MUSIC = join(work, 'music.wav')
const here = (f) => fileURLToPath(new URL(f, import.meta.url))
execFileSync('node', [here('../generate-demo-history.mjs'), DEMO], { stdio: 'ignore', env: { ...process.env, DEMO_TODAY: 'empty', DEMO_LANG: EN ? 'en' : 'fr' } })
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
await at(2.4); await layer('intro', false)
await cam({ z: 1, ms: 900 })

// ── 1. Trends: flares on the curve, then the flares card
await at(3.0); await caption(...T.c1)
await at(3.2); await tab(T.trends)
await at(4.0); await tap(F.getByRole('button', { name: T.d90 }))
await at(4.7)
{ const c = F.locator('.recharts-wrapper').first(); await cam({ fy: await phoneY(c), z: 1.6, ms: 800 }) }
await at(7.0); await cam({ z: 1, ms: 600 })
const flares = F.getByText(T.flares, { exact: true }).first()
await at(7.4); await bring(flares, 900, 300)
const flareCard = await cardOf(F.getByText(T.flareBack).first(), 200)
await at(8.5); await hl(flareCard); await cam({ fy: await phoneY(flareCard), z: 1.4, ms: 800 })
await at(10.6); await unhl(); await cam({ z: 1, ms: 500 })

// ── 2. Journal
await at(11.1); await caption(...T.c2)
await at(11.3); await tab(T.journal)
await at(12.2); await cam({ fy: 270, z: 1.5, ms: 800 })
await at(14.2); await tap(F.locator('button', { hasText: '‹' }).first())
await at(16.4); await cam({ z: 1, ms: 500 })

// ── 3. Today: the kind word
await at(16.9); await caption(...T.c3)
await at(17.1); await tab(T.today)
await at(18.0); await F.evaluate(() => scrollTo(0, 0))
const word = F.getByText(T.word)
const wordCard = await cardOf(word, 200)
await at(18.2); await cam({ fy: await phoneY(wordCard), z: 1.5, ms: 800 })
await at(19.2); await hl(wordCard)
await at(22.0); await unhl(); await cam({ z: 1, ms: 500 })

// ── 4. Today: the lightened form
await at(22.5); await caption(...T.c4)
const range = F.locator('input[type=range]').first()
await at(23.0); await cam({ fy: await phoneY(range), z: 1.6, ms: 700 })
await at(23.8)
{ const { r, s, gx, gy } = await pt(range)
  const xAt = (v) => gx + (r.x + 12 + (r.w - 24) * v / 10) * s, y = gy + (r.y + r.h / 2) * s
  await drag(xAt(0), y, xAt(6), y, 900) }
await at(25.2); await cam({ z: 1, ms: 600 })
await at(25.8); await scroll(240, 700)
const later3 = F.getByText(T.zones).first()
await at(26.6); await cam({ fy: await phoneY(later3), z: 1.5, ms: 800 })
await at(28.0); await cam({ z: 1, ms: 500 })

// ── 5. Report: the 3 days before each flare
await at(28.5); await caption(...T.c5)
await at(28.7); await tab(T.trends)
await at(29.5); await F.evaluate(() => scrollTo(0, 0))
await at(29.7); await tap(F.getByText(T.report))
await at(30.8); await tap(F.getByRole('radio', { name: T.clinic }))
await at(31.8)
const ctxTitle = F.getByText(T.ctx).first()
await ctxTitle.waitFor({ timeout: 8000 })
await bring(ctxTitle, 1200, 260)
const ctxY = await phoneY(ctxTitle) + 70
await at(33.2); await cam({ fx: 100, fy: ctxY, z: 2.5, ms: 800 })
await at(34.2); await cam({ fx: 290, fy: ctxY, z: 2.5, ms: 3200 })
await at(37.7); await cam({ z: 1, ms: 500 })

// ── 6. Settings, tidied
await at(38.5); await caption(...T.c6)
await at(38.7); await tab(T.settings)
await at(39.7); await F.evaluate(() => scrollTo(0, 0))
await at(40.0); await tap(F.getByRole('button', { name: T.profile }))
await at(40.8); await cam({ fy: 250, z: 1.25, ms: 700 })
await at(43.0); await cam({ z: 1, ms: 500 })

// ── 7. Sources: what guides the design of the app
await at(43.5); await caption(...T.c7)
await at(43.7); await tap(F.getByRole('button', { name: T.about }))
const sources = F.getByText(T.sources).first()
await at(44.6); await bring(sources, 900, 300)
await at(46.0); await tap(F.getByText(T.refs))
await at(47.2); await scroll(320, 1300)
await at(49.0); await scroll(420, 1300)

// ── 8. And also…
await at(50.6); await p.evaluate(() => window.clearCaption()); await cam({ z: 1, dy: 1500, ms: 500 })
await at(51.0); await layer('more', true)
await at(55.0); await layer('more', false)

// ── outro
await at(55.4); await layer('outro', true)
await at(DUR)

await cdp.send('Page.stopScreencast'); await ctx.close(); await b.close()
let list = ''
for (let i = 0; i < frames.length; i++) list += `file '${frames[i].f}'\nduration ${((frames[i + 1]?.t ?? frames[i].t + 0.5) - frames[i].t).toFixed(4)}\n`
list += `file '${frames.at(-1).f}'\n`
const lf = join(work, 'frames.txt'); writeFileSync(lf, list)
const out = process.argv[3] ?? `ouch-0.2-${EN ? 'en' : 'fr'}-${MODE}.mp4`
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lf, '-i', MUSIC,
  '-vf', 'fps=30,tpad=stop_mode=clone:stop_duration=3,pad=ceil(iw/2)*2:ceil(ih/2)*2', '-t', String(DUR),
  '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' })
rmSync(work, { recursive: true, force: true })
console.log('wrote', out)
