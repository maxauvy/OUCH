// Takes the screenshots of the guide and the slides for health professionals (docs/presentation-soignants/img) from the app's demo mode
// (fictional data, French). Needs the app served (npm run dev -- --port 5180) and Playwright (npm i --no-save playwright).
//   node scripts/capture-presentation.mjs [--base http://localhost:5180] [--out DIR] [--only today,trends]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
const base = opt('base', 'http://localhost:5180')
const out = opt('out', join(root, 'docs', 'presentation-soignants', 'img'))
const only = opt('only', '') ? new Set(opt('only', '').split(',')) : null
const want = (k) => !only || only.has(k)
mkdirSync(out, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch())

async function open(viewport, { dpr = 2, path = '' } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, locale: 'fr-FR', colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto(`${base}/${path}?demo=fr`)
  await sleep(1800)
  await page.getByRole('button', { name: /Passer la visite/ }).click({ timeout: 4000 }).catch(() => {})
  await sleep(1500)
  await unveil(page)
  await hideFixed(page, false)
  return { ctx, page }
}
// The floating "Mode démo" pill (and, when asked, the fixed tab bar) are kept out of the pictures.
const hideFixed = (page, withNav) =>
  page.evaluate((nav) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!/Mode démo|Demo mode/.test(n.textContent || '')) continue
      for (let el = n.parentElement; el && el !== document.body; el = el.parentElement) {
        if (getComputedStyle(el).position === 'fixed') { el.style.display = 'none'; break }
      }
    }
    if (nav) document.querySelectorAll('nav').forEach((el) => { if (getComputedStyle(el).position === 'fixed') el.style.display = 'none' })
  }, withNav)
// The visit and the sheets dim the page with a translucent layer: it must not end up as a grey veil in a picture.
const unveil = (page) =>
  page.evaluate(() => {
    document.querySelectorAll('body *').forEach((el) => {
      const cs = getComputedStyle(el)
      if (cs.position !== 'fixed') return
      const r = el.getBoundingClientRect()
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/)
      const a = m ? (m[1].split(',')[3] === undefined ? 1 : parseFloat(m[1].split(',')[3])) : 0
      if (a > 0 && a < 0.95 && r.width >= innerWidth - 2 && r.height >= innerHeight - 2) el.style.background = 'transparent'
      if (cs.backdropFilter && cs.backdropFilter !== 'none') el.style.backdropFilter = 'none'
    })
  })
const tab = async (page, name) => { await page.locator('nav').getByRole('button', { name }).click(); await sleep(1500); await unveil(page); await hideFixed(page, false) }
const top = (page) => page.evaluate(() => window.scrollTo(0, 0)).then(() => sleep(300))
const scrollToText = async (page, re, off = -16) => {
  const el = page.getByText(re).first()
  await el.evaluate((e, o) => { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, o) }, off)
  await sleep(450)
}
const KEEP_NAV = new Set(['today-1'])
const shot = async (page, name, opts = {}) => { if (!KEEP_NAV.has(name)) await hideFixed(page, true); await page.screenshot({ path: join(out, `${name}.png`), ...opts }) }

const PHONE = { width: 390, height: 844 }

// Every picture in its own try: a label that moved must not stop the others.
const step = async (key, fn) => {
  if (!want(key)) return
  try { await fn(); console.log('ok  ', key) } catch (e) { console.log('FAIL', key, String(e).split('\n')[0]) }
}

await step('today', async () => {
  const { ctx, page } = await open(PHONE)
  await top(page)
  await shot(page, 'today-1')
  await page.getByRole('button', { name: /Afficher le formulaire complet/ }).click().catch(() => {})
  await sleep(600)
  await scrollToText(page, /Où as-tu mal/i)
  await shot(page, 'today-zones')
  await scrollToText(page, /Médicaments pris|Mes médicaments/i, -70)
  await shot(page, 'today-meds')
  await ctx.close()
})

await step('journal', async () => {
  const { ctx, page } = await open(PHONE)
  await tab(page, /Journal/)
  await top(page)
  await shot(page, 'journal')
  await ctx.close()
})

await step('trends', async () => {
  const { ctx, page } = await open(PHONE)
  await tab(page, /Tendances/)
  await page.getByRole('radio', { name: '90 j' }).click().catch(() => {})
  await sleep(900)
  await top(page)
  await shot(page, 'trends-1')
  await ctx.close()
})

await step('soulager', async () => {
  const { ctx, page } = await open(PHONE)
  await tab(page, /Soulager/)
  await top(page)
  await shot(page, 'soulager')
  await ctx.close()
})

await step('consultation', async () => {
  const { ctx, page } = await open(PHONE)
  await tab(page, /Consultation/)
  await top(page)
  await shot(page, 'consultation')
  await ctx.close()
})

// A sub-page opened from a row of Tendances / Consultation / Today, then the page itself (full height) and its top.
const sub = (key, tabName, rowRe, file) =>
  step(key, async () => {
    const { ctx, page } = await open(PHONE)
    if (tabName) await tab(page, tabName)
    await page.getByRole('button', { name: rowRe }).first().click()
    await sleep(1500)
    await unveil(page)
    await hideFixed(page, true)
    await top(page)
    await page.screenshot({ path: join(out, `${file}.png`) })
    await ctx.close()
  })
await sub('zones', /Tendances/, /Où ça fait mal/, 'zones')
await sub('treatments', /Tendances/, /Mes traitements/, 'treatments')
await sub('compare', /Tendances/, /Comparer deux périodes/, 'compare')
await sub('caresheet', /Consultation/, /Fiche pour un soignant/, 'caresheet')
await sub('kids', null, /Mes enfants/, 'kids')
// The weather sheet slides over the page and dims it: only the sheet is photographed, on white.
await step('weather', async () => {
  const { ctx, page } = await open(PHONE)
  await page.getByRole('button', { name: /Météo du jour/ }).first().click()
  await sleep(1500)
  await unveil(page)
  const box = await page.evaluate(() => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!/Partager ma météo/.test(n.textContent || '')) continue
      for (let el = n.parentElement; el; el = el.parentElement) {
        if (parseFloat(getComputedStyle(el).borderTopLeftRadius) > 8) {
          // The sheet is the rounded panel; its siblings (the dimming layer) go.
          for (let up = el; up && up !== document.body; up = up.parentElement) {
            ;[...(up.parentElement ? up.parentElement.children : [])].forEach((sib) => { if (sib !== up && sib.tagName !== 'SCRIPT') sib.style.visibility = 'hidden' })
          }
          document.documentElement.style.background = '#fff'; document.body.style.background = '#fff'
          const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }
        }
      }
    }
    return null
  })
  if (!box) throw new Error('sheet not found')
  await page.screenshot({ path: join(out, 'weather.png'), clip: box })
  await ctx.close()
})
await sub('plan', /Soulager/, /Ouvrir mon plan/, 'plan')
await sub('breathing', /Soulager/, /Respirer lentement/, 'breathing')
await sub('gestures', /Soulager/, /Voir et choisir mes gestes/, 'gestures')

await step('lead', async () => {
  const { ctx, page } = await open({ width: 390, height: 1400 }, { dpr: 3 })
  await tab(page, /Tendances/)
  await page.getByRole('button', { name: /Mes habitudes/ }).click()
  await sleep(1300)
  await hideFixed(page, true)
  const card = page.locator('main').getByText(/Ce que tes notes racontent/).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]')
  await card.scrollIntoViewIfNeeded()
  await sleep(300)
  await card.screenshot({ path: join(out, 'lead.png') })
  await ctx.close()
})

// The two reports (A4 pages, 1100 px wide window): every page, one picture each.
await step('report', async () => {
  for (const [slug, label] of [['gp', /Médecin traitant/], ['cetd', /Centre douleur/]]) {
    const { ctx, page } = await open({ width: 1100, height: 1400 })
    await tab(page, /Consultation/)
    await page.getByRole('button', { name: /Préparer le rapport/ }).click()
    await sleep(2200)
    await page.getByRole('radio', { name: label }).click()
    const d = new Date(); d.setDate(d.getDate() - 31)
    await page.locator('input[type=date]').first().fill(d.toISOString().slice(0, 10))
    await sleep(4500)
    await hideFixed(page, true)
    const pages = page.locator('.report-page:visible')
    const n = await pages.count()
    const wanted = slug === 'gp' ? [0] : [0, 1, 4] // the pages the guide and the slides show
    for (const i of wanted.filter((k) => k < n)) {
      await pages.nth(i).scrollIntoViewIfNeeded()
      await sleep(250)
      await pages.nth(i).screenshot({ path: join(out, `report-${slug}-${i + 1}.png`) })
    }
    console.log('     ', slug, n, 'pages')
    await ctx.close()
  }
})

await browser.close()
console.log('captures in', out)
