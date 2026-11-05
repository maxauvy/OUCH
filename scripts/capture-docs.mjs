// Retakes the screenshots used by the documents, flyers and leaflets from the app's demo mode (fictional data, French and English).
// Needs the app served (npm run dev, or the preview) and Google Chrome:
//   node scripts/capture-docs.mjs [--base http://localhost:5180] [--out DIR] [--only today,trends,report]
// Without --out the images go where the documents read them (docs/, communication/). The images keep the app's own light background:
// nothing dark is drawn behind or around them (no shadow, no frame, no transparent corner).
import { chromium } from 'playwright'
import { mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
const base = opt('base', 'http://localhost:5180')
const tmp = opt('out', join(root, 'node_modules', '.cache', 'doc-captures'))
const only = new Set(opt('only', 'today,hard,trends,lead,report').split(','))
mkdirSync(tmp, { recursive: true })

const T = {
  fr: { skip: /Passer la visite/, full: /Afficher le formulaire complet/, meds: /Mes médicaments/, ninety: '90 j', habits: /Mes habitudes/, trends: /Tendances/, consult: /Consultation/, prepare: /Préparer le rapport/, langLabel: 'Français', clinic: /Centre douleur/, gp: /Médecin traitant/ },
  en: { skip: /Skip the tour/, full: /Show the full form/, meds: /My medications/, ninety: '90 d', habits: /My habits/, trends: /Trends/, consult: /Consultation/, prepare: /Prepare the report/, langLabel: 'English', clinic: /Pain clinic/, gp: /General practitioner/ },
}

const browser = await chromium.launch({ channel: 'chrome' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function open(lang, viewport, dpr) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, locale: lang === 'fr' ? 'fr-FR' : 'en-US', colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto(`${base}/?demo=${lang}`)
  await sleep(1800)
  await page.getByRole('button', { name: T[lang].skip }).click({ timeout: 4000 }).catch(() => {})
  await sleep(500)
  // The "Demo mode" pill floats over the page: keep it out of the pictures.
  await page.addStyleTag({ content: '[class*="DemoPill"], [data-demo-pill]{display:none!important}' })
  return { ctx, page }
}
// The floating "Demo mode" pill (and, when asked, the fixed tab bar) are kept out of the pictures.
const hideFixed = (page, { nav = false } = {}) =>
  page.evaluate((withNav) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!/Mode démo|Demo mode/.test(n.textContent || '')) continue
      for (let el = n.parentElement; el && el !== document.body; el = el.parentElement) {
        if (getComputedStyle(el).position === 'fixed') { el.style.display = 'none'; break }
      }
    }
    if (withNav) document.querySelectorAll('nav').forEach((el) => { if (getComputedStyle(el).position === 'fixed') el.style.display = 'none' })
  }, nav)
const hidePill = (page) => hideFixed(page)
const dayISO = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const shot = (name) => join(tmp, name)

const MEDS = /Médicaments pris|Medications taken|Medication/i
const ZONES = /Où as-tu mal|Where does it hurt/i
const LEAD = /Ce que tes notes racontent|What your notes say/i

async function scrollTo(page, locator, offset = -16) {
  await locator.evaluate((el, off) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, off) }, offset)
  await sleep(350)
}

for (const lang of ['fr', 'en']) {
  const t = T[lang]
  const pre = lang === 'fr' ? '' : 'en-'
  if (only.has('today')) {
    // The day's page in a phone (390 x 844 at 3x), and the 780 x 1180 crops of the leaflets.
    const big = await open(lang, { width: 390, height: 844 }, 3)
    await hidePill(big.page)
    await big.page.evaluate(() => window.scrollTo(0, 0))
    await sleep(300)
    await big.page.screenshot({ path: shot(`${pre}today.png`) })
    await big.ctx.close()
    const s = await open(lang, { width: 390, height: 590 }, 2)
    await hidePill(s.page)
    await s.page.evaluate(() => window.scrollTo(0, 0))
    await sleep(300)
    await s.page.screenshot({ path: shot(`${pre}a-flare.png`) })
    await s.page.getByRole('button', { name: t.full }).click().catch(() => {})
    await sleep(500)
    await scrollTo(s.page, s.page.getByText(MEDS).first(), -70)
    await s.page.screenshot({ path: shot(`${pre}b-meds.png`) })
    await scrollTo(s.page, s.page.getByText(ZONES).first(), -16)
    await s.page.screenshot({ path: shot(`${pre}b-zones.png`) })
    await s.ctx.close()
  }
  if (only.has('hard')) {
    // The soft word of the hard days and the pain card, without the tab bar: 780 wide at 2x.
    const h = await open(lang, { width: 390, height: 1400 }, 2)
    await hidePill(h.page)
    await h.page.evaluate(() => window.scrollTo(0, 0))
    await sleep(300)
    const boxes = await h.page.evaluate(() => {
      // The card that holds a text: the nearest rounded box around it.
      const cardOf = (re) => {
        const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) if (re.test(n.textContent || '')) return n.parentElement.closest('[class*="rounded"]')
        return null
      }
      const banner = cardOf(/Ces derniers jours|The last few days/)
      const pain = cardOf(/Saisi à|Logged at/)
      return { top: banner.getBoundingClientRect().top, bottom: pain.getBoundingClientRect().bottom }
    })
    await hideFixed(h.page, { nav: true })
    await h.page.screenshot({ path: shot(`${pre}allege.png`), clip: { x: 0, y: Math.max(0, boxes.top - 8), width: 390, height: boxes.bottom - boxes.top + 16 } })
    await h.ctx.close()
  }
  if (only.has('trends')) {
    const s = await open(lang, { width: 390, height: 590 }, 2)
    await hidePill(s.page)
    await s.page.locator('nav').getByRole('button', { name: t.trends }).click()
    await sleep(1500)
    await s.page.getByRole('radio', { name: t.ninety }).click().catch(() => {})
    await sleep(900)
    await s.page.evaluate(() => window.scrollTo(0, 0))
    await sleep(300)
    await s.page.screenshot({ path: shot(`${pre}d-trends.png`) })
    await s.ctx.close()
  }
  if (only.has('lead')) {
    // The "what your notes say" card, 358 px wide at 3x (1074 px).
    const s = await open(lang, { width: 390, height: 1400 }, 3)
    await hidePill(s.page)
    await s.page.locator('nav').getByRole('button', { name: t.trends }).click()
    await sleep(1500)
    await s.page.getByRole('button', { name: t.habits }).click()
    await sleep(1200)
    await hideFixed(s.page, { nav: true })
    const card = s.page.locator('main').getByText(LEAD).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]')
    await card.scrollIntoViewIfNeeded()
    await sleep(300)
    await card.screenshot({ path: shot(`${pre}piste.png`) })
    await s.ctx.close()
  }
  if (only.has('report')) {
    // Page 1 of the two reports, from the demo: the page itself (no shadow, no margin), white on white.
    for (const [variant, label] of [['gp', t.gp], ['cetd', t.clinic]]) {
      const s = await open(lang, { width: 1100, height: 1400 }, 2)
      await s.page.locator('nav').getByRole('button', { name: t.consult }).click()
      await sleep(900)
      await s.page.getByRole('button', { name: t.prepare }).click()
      await sleep(2200)
      await s.page.getByRole('radio', { name: label }).click()
      await s.page.getByRole('radio', { name: t.langLabel }).click()
      // Since an appointment a month ago: the period before it has data, so the comparisons show.
      await s.page.locator('input[type=date]').first().fill(dayISO(-31))
      await sleep(4500)
      await hideFixed(s.page, { nav: true })
      const page1 = s.page.locator('.report-page:visible').first()
      await page1.scrollIntoViewIfNeeded()
      await sleep(300)
      const box = await page1.boundingBox()
      const slug = variant === 'gp' ? 'gp' : 'cetd'
      await page1.screenshot({ path: shot(`${pre}${slug}-page1.png`) })
      await s.page.screenshot({ path: shot(`${pre}${slug}-top.png`), clip: { x: box.x, y: box.y, width: box.width, height: Math.round(box.height * 0.5) } })
      await s.ctx.close()
    }
  }
}
await browser.close()
console.log('captures in', tmp)

// Put the pictures where the documents read them (unless --out was given: then they are only taken).
if (!args.includes('--out')) {
  const put = (from, to) => {
    try {
      mkdirSync(dirname(join(root, to)), { recursive: true })
      copyFileSync(join(tmp, from), join(root, to))
      console.log(' ', from, '->', to)
    } catch {
      /* this picture was not taken in this run */
    }
  }
  const patients = 'communication/flyer-plaquette-patients/assets'
  const visuals = 'communication/visuels-presentation/assets'
  for (const f of ['today', 'piste', 'allege']) {
    put(`${f}.png`, `${patients}/${f}.png`)
    put(`en-${f}.png`, `${patients}/en-${f}.png`)
    put(`${f}.png`, `${visuals}/${f}.png`)
    put(`en-${f}.png`, `${visuals}/en-${f}.png`)
  }
  put('en-today.png', `${visuals}/en-today.png`)
  for (const f of ['a-flare', 'b-meds', 'b-zones', 'd-trends']) {
    put(`${f}.png`, `${visuals}/${f}.png`)
    put(`${f}.png`, `docs/plaquette-soignants/img/${f}.png`)
    put(`en-${f}.png`, `docs/plaquette-soignants/img-en/${f}.png`)
  }
  for (const [pre, dir, suffix] of [['', 'img', ''], ['en-', 'img-en', '.en']]) {
    put(`${pre}gp-top.png`, `docs/plaquette-soignants/${dir}/gp-top.png`)
    put(`${pre}cetd-top.png`, `docs/plaquette-soignants/${dir}/cetd-top.png`)
    put(`${pre}gp-top.png`, `docs/lire-un-rapport/rapport${suffix}.png`)
    put(`${pre}gp-page1.png`, `docs/lire-un-rapport/rapport-page1${suffix}.png`)
    put(`${pre}gp-top.png`, `${visuals}/rapport${suffix}.png`)
  }
}
