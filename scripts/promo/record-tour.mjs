// Records the "tour" video: the whole of OUCH, not only what is new. A phone
// with the app, captions that come and go, slow camera moves, a soft backing
// track, in the order a person meets the app: a hard day, the daily entry, the
// calendar, the trends, the weekday card, the treatment review, what goes with
// the pain, the weather to share, the Kids tab, the report, the data that stays
// at home (backup, CSV, code lock), dark mode and English, and the documents
// for health professionals.
//
//   npm i --no-save playwright && npx playwright install chromium   # once
//   brew install ffmpeg                                             # once
//   npm run dev -- --port 5180                                      # other terminal
//   node scripts/promo/record-tour.mjs [portrait|landscape] [output.mp4] [app-url]
//   ONLY=4,5 node scripts/promo/record-tour.mjs portrait test.mp4   # a few scenes only, to rehearse
//
// Same machinery as record.mjs (stage.html serves the phone and the captions on
// the app's own origin, so it shares the IndexedDB into which the generated
// 90-day demo history is imported; Chrome's screencast frames are encoded by
// ffmpeg), with two differences: scenes follow one another (no absolute clock,
// the length of the video is what the scenes take) and the backing track is
// made last, to the length of what was recorded.
//
// The demo history is generated with DEMO_TODAY=empty, so that Today opens
// during a flare (the soft message, the pain-only screen). Scene 2 fills today
// in, and from then on today has a weather, which the sharing scene needs.
// French only for now (the selectors are the French labels).
import { chromium } from 'playwright'
import { rmSync, mkdirSync, writeFileSync, readFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODE = process.argv[2] ?? 'portrait'
const APP = process.argv[4] ?? 'http://localhost:5180'
const [VW, VH] = MODE === 'portrait' ? [540, 960] : [960, 540]
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null
const here = (f) => fileURLToPath(new URL(f, import.meta.url))
const ASSETS = (f) => readFileSync(here(`./assets/${f}`))
const work = mkdtempSync(join(tmpdir(), 'ouch-tour-'))
const DEMO = join(work, 'demo.json')
execFileSync('node', [here('../generate-demo-history.mjs'), DEMO], { stdio: 'ignore', env: { ...process.env, DEMO_LANG: 'fr', DEMO_TODAY: 'empty' } })

let STAGE = readFileSync(here('./stage.html'), 'utf8')
  .replace('✦ Nouveau', 'Pour les soignants')
  .replace('<!--DOCS_TITLE-->', 'Des documents <em>pensés pour eux</em>')
  .replace('<!--DOCS_LINES-->', 'Une plaquette de 2 pages, une note méthodologique de 8 pages<small>Chaque calcul, chaque seuil, chaque source. À lire en 2 minutes.</small>')

const b = await chromium.launch({ args: ['--force-device-scale-factor=2'] })
const base = { viewport: { width: VW, height: VH }, deviceScaleFactor: 2, locale: 'fr-FR' }

// prep: import the demo history, show the early-access settings, as a real person would have it
const prep = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, locale: 'fr-FR' })
const pp = await prep.newPage()
await pp.goto(APP); await pp.getByText('Passer').click()
await pp.getByRole('button', { name: /Réglages/ }).click()
await pp.getByRole('button', { name: /Mes données/ }).click(); await pp.waitForTimeout(300)
await pp.locator('input[type=file]').setInputFiles(DEMO)
await pp.locator('input[type=password]').last().fill('demo')
await pp.getByRole('button', { name: 'Importer', exact: true }).click()
await pp.waitForTimeout(4000)
await pp.getByRole('button', { name: /Aujourd/ }).click(); await pp.waitForTimeout(600)
const later = pp.getByRole('button', { name: /^(Plus tard|Later)$/ })
if (await later.count()) { await later.click(); await pp.waitForTimeout(400) }
// A weekday pattern for the video only (Mondays harder, Saturdays easier, before the last week), so that the
// weekday card shows its two tiles instead of "your days look alike". The app's own demo data is left as it is.
await pp.evaluate(async () => {
  const { db } = await import('/src/db/index.ts')
  const recent = Date.now() - 8 * 864e5
  for (const e of await db.entries.toArray()) {
    if (e.painLevel == null) continue
    const d = new Date(e.date + 'T12:00:00')
    if (d.getTime() > recent) continue
    const off = [2, 0, 0, 0, 0, -2, -1][(d.getDay() + 6) % 7]
    if (off) await db.entries.update(e.id, { painLevel: Math.max(0, Math.min(10, e.painLevel + off)) })
  }
})
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
await p.route('**/__docs-brochure.png', (r) => r.fulfill({ contentType: 'image/png', body: ASSETS('docs-brochure-p1.png') }))
await p.route('**/__docs-note.png', (r) => r.fulfill({ contentType: 'image/png', body: ASSETS('docs-note-p1.png') }))
await p.goto(APP + '/__stage.html')
const frameEl = await p.waitForSelector('#app')
const F = await frameEl.contentFrame()
await F.waitForSelector('nav', { timeout: 15000 })
await F.addStyleTag({ content: 'div:has(> p > a[href="https://github.com/maxauvy/OUCH"]){display:none}.promo-hl{outline:3px solid #ffb703;outline-offset:5px;border-radius:12px;animation:hlp 1s ease-in-out infinite}@keyframes hlp{50%{outline-color:#ffe08a;outline-offset:8px}}' })
// the automatic backup is not public yet: it stays out of the picture
const hideAutoBackup = () => F.evaluate(() => {
  for (const h of document.querySelectorAll('h3')) if (h.textContent.includes('Sauvegarde automatique') || h.textContent.includes('Automatic backup')) h.closest('div[class*="rounded"]')?.setAttribute('style', 'display:none')
})
await hideAutoBackup()
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

let camBusyUntil = 0 // clicks are aimed with the current camera transform: wait for it to settle
const cam = (o) => { camBusyUntil = Date.now() + (o.ms ?? 900) + 80; return p.evaluate((o) => window.cam(o), o) }
const settle = () => p.waitForTimeout(Math.max(0, camBusyUntil - Date.now()))
const caption = (k, t, s) => p.evaluate(([k, t, s]) => window.caption(k, t, s), [k, t, s])
const noCaption = () => p.evaluate(() => window.clearCaption())
const layer = (id, on) => p.evaluate(([id, on]) => window.layer(id, on), [id, on])
const wait = (s) => p.waitForTimeout(s * 1000)
async function geom() { return p.evaluate(() => { const r = document.getElementById('app').getBoundingClientRect(); return [r.x, r.y, r.width / 390] }) }
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
const top = () => F.evaluate(() => scrollTo(0, 0))
async function bring(loc, ms = 900, at = 380) { const r = await rectOf(loc); await scroll(r.y + r.h / 2 - at, ms) } // sits around `at` px from the top
const tab = (n) => tap(F.getByRole('button', { name: new RegExp(n) }))
const hl = (h) => h.evaluate((e) => e.classList.add('promo-hl'))
const unhl = () => F.evaluate(() => document.querySelectorAll('.promo-hl').forEach((e) => e.classList.remove('promo-hl')))
const phoneY = async (loc) => { const r = await rectOf(loc); return r.y + r.h / 2 }
async function slide(loc, from, to, ms = 900) { // drags a range input from `from` to `to` (0-1 of its width)
  const { r, s, gx, gy } = await pt(loc)
  const xAt = (v) => gx + (r.x + 12 + (r.w - 24) * v) * s, y = gy + (r.y + r.h / 2) * s
  await drag(xAt(from), y, xAt(to), y, ms)
}
const section = async (title) => { // the card that holds a heading: climb until it is tall enough to be the card
  return F.getByText(title, { exact: false }).first().evaluateHandle((e) => {
    let n = e; while (n.parentElement && n.getBoundingClientRect().height < 150) n = n.parentElement; return n })
}
const scene = async (id, name, fn) => {
  if (ONLY && !ONLY.includes(String(id))) return
  const t0 = Date.now()
  try { await fn() } catch (e) { console.error(`scene ${id} (${name}) failed:`, e.message.split('\n')[0]) }
  console.log(`scene ${id} ${name}: ${((Date.now() - t0) / 1000).toFixed(1)} s`)
}

// ── intro
await layer('intro', true); await wait(3.2); await layer('intro', false)
await cam({ z: 1, ms: 1000 }); await wait(0.8)

// ── 1. A hard day: the soft message, pain only
await scene(1, 'hard day', async () => {
  await caption('Les jours difficiles', 'La douleur *seule* suffit', 'Un mot doux, un écran allégé : onze cases, et c’est noté.')
  await wait(1.2)
  const msg = F.getByText('Ces derniers jours ont été plus durs')
  await hl(await msg.evaluateHandle((e) => e.closest('div[class*=rounded]') ?? e.parentElement))
  await cam({ fy: 250, z: 1.35, ms: 1000 }); await wait(2.6)
  await unhl(); await cam({ z: 1, ms: 800 }); await wait(0.9)
  await tap(F.getByRole('radio', { name: '7', exact: true })); await wait(0.5)
  await cam({ fy: 520, z: 1.4, ms: 900 }); await wait(2.4)
  await cam({ z: 1, ms: 700 }); await wait(0.5)
})

// ── 2. The daily entry
await scene(2, 'daily entry', async () => {
  await caption('Aujourd’hui', 'Ta journée en *10 secondes*', 'Glisse, tape, c’est noté.')
  await top(); await wait(0.8)
  const full = F.getByRole('button', { name: /formulaire complet/ })
  if (await full.count()) { await tap(full); await wait(1.0) }
  const range = F.locator('input[type=range]').first()
  await cam({ fy: await phoneY(range), z: 1.55, ms: 800 }); await wait(0.5)
  await slide(range, 0.2, 0.66, 900)
  await wait(0.3); await cam({ z: 1, ms: 700 }); await wait(0.3)
  await bring(F.getByRole('button', { name: 'Dos bas', exact: true }), 800, 330); await wait(0.2)
  await tap(F.getByRole('button', { name: 'Dos bas', exact: true })); await wait(0.3)
  await tap(F.getByRole('button', { name: 'Cou', exact: true })); await wait(0.3)
  await tap(F.getByRole('button', { name: 'Épaules', exact: true })); await wait(0.4)
  const fat = F.getByRole('slider', { name: 'Fatigue' }).first()
  await bring(fat, 900, 330); await wait(0.3)
  await slide(fat, 0.1, 0.72, 800); await wait(0.2)
  await slide(F.getByRole('slider', { name: 'Qualité du sommeil' }).first(), 0.1, 0.3, 700); await wait(0.3)
  const med = F.getByRole('button', { name: /Paracétamol : une prise de plus/ })
  await bring(med, 1100, 380); await wait(0.3); await tap(med); await wait(0.6)
  await top(); await wait(0.8)
})

// ── 3. The calendar
await scene(3, 'journal', async () => {
  await caption('Journal', 'Chaque jour, *une météo*', 'Ton mois en un coup d’œil, du soleil à l’orage.')
  await tab('^Journal'); await wait(1.2)
  await cam({ fy: 300, z: 1.45, ms: 1000 }); await wait(2.4)
  await tap(F.locator('button', { hasText: '‹' }).first()); await wait(1.3)
  await tap(F.locator('button', { hasText: '›' }).first()); await wait(1.2)
  await cam({ z: 1, ms: 800 }); await wait(0.6)
})

// ── 4. The trends: the curve
await scene(4, 'trends', async () => {
  await caption('Tendances', 'Vois enfin ce qui *change*', 'Courbe de douleur, poussées, changements de dose.')
  await tab('Tendances'); await wait(1.2)
  await tap(F.getByRole('button', { name: /^90 j/ })); await wait(1.1)
  const c = F.locator('.recharts-wrapper').first()
  await cam({ fy: await phoneY(c), z: 1.6, ms: 1000 }); await wait(3.2)
  await cam({ z: 1, ms: 800 }); await wait(0.6)
})

// ── 5. The weekday card
await scene(5, 'weekday', async () => {
  await caption('Pistes', 'Repère tes *jours difficiles*', 'Le jour le plus doux, le plus exigeant, et combien de jours derrière chacun.')
  await tab('Tendances'); await wait(0.6)
  await tap(F.getByRole('button', { name: /^90 j/ })); await wait(0.6)
  const card = await section('Tes jours de la semaine')
  await bring(card, 1300, 400); await wait(0.6)
  await hl(card); await cam({ fy: await phoneY(card), z: 1.45, ms: 1000 }); await wait(3.8)
  await unhl(); await cam({ z: 1, ms: 700 }); await wait(0.5)
})

// ── 6. The treatment review
await scene(6, 'treatment review', async () => {
  await caption('Traitements', 'Ce qui a *changé* avant et après', 'Un changement de dose, comparé à 28 jours avant. Sans conclure.')
  await tab('Tendances'); await wait(0.5)
  const card = await section('Avant et après un changement')
  await bring(card, 1400, 300); await wait(0.7)
  await cam({ fy: await phoneY(card) + 60, z: 1.4, ms: 1000 }); await wait(2.6)
  const other = F.getByRole('button', { name: /^Prégabaline/ })
  if (await other.count()) { await tap(other); await wait(2.6) }
  await cam({ z: 1, ms: 700 }); await wait(0.5)
})

// ── 7. What the notes say
await scene(7, 'leads', async () => {
  await caption('Comprendre', 'Ce que tes notes *racontent*', 'Une piste à la fois. Jamais une preuve.')
  await tab('Tendances'); await wait(0.5)
  const card = await section('Ce que tes notes racontent')
  await bring(card, 1500, 330); await wait(0.6)
  await cam({ fy: await phoneY(card), z: 1.35, ms: 900 }); await wait(2.6)
  const next = F.getByRole('button', { name: 'Piste suivante' })
  if (await next.count()) { await tap(next); await wait(2.4) }
  await cam({ z: 1, ms: 700 }); await wait(0.4)
})

// ── 8. Sharing the weather
await scene(8, 'sharing', async () => {
  await caption('Proches', 'Partage ta *météo* du jour', 'Une image, un petit mot. Rien n’est envoyé sans toi.')
  await tab('Aujourd'); await wait(0.6)
  await top(); await wait(0.5)
  const shareBtn = F.getByRole('button', { name: /Partager ma météo/ })
  await bring(shareBtn, 1300, 420); await wait(0.5)
  await tap(shareBtn); await wait(1.4)
  await cam({ fy: 330, z: 1.35, ms: 900 }); await wait(2.4)
  await p.keyboard.press('Escape'); await cam({ z: 1, ms: 700 }); await wait(0.5)
})

// ── 9. Kids
await scene(9, 'kids', async () => {
  await caption('En famille', 'Explique-le *à tes enfants*', 'Des mots doux, adaptés à chaque âge.')
  await tab('Enfants'); await wait(1.2)
  await tap(F.getByText('8–12 ans')); await wait(1.0)
  await scroll(520, 1400); await wait(1.8)
  await scroll(-520, 800); await wait(0.4)
})

// ── 10. The report
await scene(10, 'report', async () => {
  await caption('Consultation', 'Un rapport pour ton *médecin*', 'Deux versions, prêtes à exporter en PDF.')
  await tab('Tendances'); await wait(0.6); await top(); await wait(0.5)
  await tap(F.getByText('Rapport pour mon médecin')); await wait(1.3)
  await cam({ fy: 300, z: 1.3, ms: 900 }); await wait(2.0)
  await tap(F.getByText('Centre douleur')); await wait(1.0)
  await cam({ z: 1, ms: 700 })
  const pdf = F.getByRole('button', { name: /Exporter en PDF/ })
  await bring(pdf, 1300, 360); await hl(pdf); await wait(1.6); await unhl()
  await scroll(900, 1400); await wait(0.3)
  await scroll(1200, 2000); await wait(0.6)
})

// ── 11. Data stays at home
await scene(11, 'data', async () => {
  await caption('Chez toi', 'Tes données *restent chez toi*', 'Sauvegarde chiffrée, export CSV, suppression en un geste.')
  await tab('Réglages'); await wait(0.6); await hideAutoBackup(); await top()
  const group = F.getByRole('button', { name: /Mes données/ })
  if ((await group.getAttribute('aria-expanded')) !== 'true') { await tap(group); await wait(0.8) }
  const exp = await section('Exporter une sauvegarde')
  await bring(exp, 1300, 360); await wait(1.0)
  await hl(exp); await cam({ fy: await phoneY(exp), z: 1.25, ms: 900 }); await wait(2.0)
  await unhl(); await cam({ z: 1, ms: 700 })
  const zone = await section('Zone sensible')
  await bring(zone, 1400, 360); await wait(0.6)
  await hl(zone); await cam({ fy: await phoneY(zone), z: 1.25, ms: 900 }); await wait(2.2)
  await unhl(); await cam({ z: 1, ms: 700 })
})

// ── 12. The code lock
await scene(12, 'lock', async () => {
  await caption('Verrou', 'Un *code* pour ton journal', 'Quatre chiffres, des points, et rien n’est jamais effacé.')
  await tab('Réglages'); await wait(0.6); await hideAutoBackup()
  const lockCard = await section('Verrou par code')
  await bring(lockCard, 1300, 380); await wait(1.3)
  // set the code and lock, as the person would, then type it on the pad
  await F.evaluate(async () => { const m = await import('/src/lib/appLock.ts'); await m.enableLock('1234', 1, 'fr'); m.lockNow() })
  await wait(1.3)
  await cam({ fy: 330, z: 1.0, ms: 600 })
  for (const d of '1234') { await tap(F.locator('[aria-label="Verrouillage"] button', { hasText: new RegExp(`^${d}$`) })); await wait(0.3) }
  await wait(1.4)
  await F.evaluate(async () => { const m = await import('/src/lib/appLock.ts'); m.disableLock() })
})

// ── 13. Dark mode, English
await scene(13, 'dark and english', async () => {
  await caption('À ton goût', 'Clair, sombre, *français* ou anglais', 'L’app s’habille comme tu préfères.')
  // a group of Settings is out of the accessibility tree while it is folded: open it again each time
  const openDisplay = async (name) => {
    await top(); await wait(0.4)
    const g = F.getByRole('button', { name })
    if ((await g.getAttribute('aria-expanded')) !== 'true') { await tap(g); await wait(0.7) }
  }
  await tab('Réglages'); await wait(0.6); await hideAutoBackup()
  await openDisplay(/Rappel et affichage/)
  const dark = F.getByRole('radio', { name: 'Sombre' })
  await bring(dark, 1200, 380); await wait(0.4)
  await tap(dark); await wait(1.4)
  await tab('Aujourd'); await wait(1.2); await top(); await wait(1.0)
  await tab('Réglages'); await wait(0.6); await hideAutoBackup()
  await openDisplay(/Rappel et affichage/)
  const en = F.getByRole('radio', { name: 'English' })
  await bring(en, 1200, 380); await wait(0.4)
  await tap(en); await wait(1.2)
  await tab('Today'); await wait(1.8)
})

// ── 14. Documents for health professionals
await scene(14, 'professionals', async () => {
  await noCaption(); await cam({ z: 1, dy: 1000, ms: 800 }); await wait(0.6)
  await layer('docs', true); await wait(5.0); await layer('docs', false); await wait(0.6)
})

// ── outro
await noCaption(); await cam({ z: 1, dy: 1000, ms: 900 }); await wait(0.7)
await layer('outro', true); await wait(4.0)

await cdp.send('Page.stopScreencast'); await ctx.close(); await b.close()
const total = (frames.at(-1).t - frames[0].t) + 0.5
const DUR = Math.ceil(total)
let list = ''
for (let i = 0; i < frames.length; i++) list += `file '${frames[i].f}'\nduration ${((frames[i + 1]?.t ?? frames[i].t + 0.5) - frames[i].t).toFixed(4)}\n`
list += `file '${frames.at(-1).f}'\n`
const lf = join(work, 'frames.txt'); writeFileSync(lf, list)
const MUSIC = join(work, 'music.wav')
execFileSync('node', [here('./synth.mjs'), MUSIC, String(DUR), 'bright'], { stdio: 'ignore' })
const out = process.argv[3] ?? `ouch-tour-fr-${MODE}.mp4`
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lf, '-i', MUSIC,
  '-vf', 'fps=30,tpad=stop_mode=clone:stop_duration=3,pad=ceil(iw/2)*2:ceil(ih/2)*2', '-t', String(DUR),
  '-c:v', 'libx264', '-crf', '21', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' })
rmSync(work, { recursive: true, force: true })
console.log('wrote', out, `(${DUR} s)`)
