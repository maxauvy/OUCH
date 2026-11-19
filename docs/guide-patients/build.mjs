// Builds the PDFs of the users' guide (A4, French guide.html and English guide.en.html), and, with --previews, one PNG per page into apercus/.
//   node docs/guide-patients/build.mjs [--previews]
// Needs Playwright (npm i --no-save playwright at the repo root; the installed Chrome is used) and `npm install` (Public Sans is read from node_modules).
// Styles, logo, QR code and screenshots are shared with docs/presentation-soignants.
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const previews = process.argv.includes('--previews')
const pdfDir = join(here, 'pdf'); mkdirSync(pdfDir, { recursive: true })
const prevDir = join(here, 'apercus'); if (previews) mkdirSync(prevDir, { recursive: true })

const b = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch())
for (const [src, pdf, prefix] of [['guide.html', 'OUCH-guide-utilisateurs.pdf', 'guide'], ['guide.en.html', 'OUCH-user-guide.pdf', 'guide-en']]) {
  const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: previews ? 1.5 : 1 })
  await p.goto(pathToFileURL(join(here, src)).href, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)
  // A page that overflows is a mistake to fix, not to ship: report it.
  const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((el, i) => {
    const foot = el.querySelector('.foot')
    const limit = foot ? foot.getBoundingClientRect().top - 2 : el.getBoundingClientRect().bottom
    let worst = 0
    el.querySelectorAll('*').forEach((c) => { if (c.closest('.foot') || c.closest('.scr') || getComputedStyle(c).position === 'absolute') return; const cr = c.getBoundingClientRect(); if (cr.height > 0) worst = Math.max(worst, cr.bottom - limit) })
    return worst > 1 ? `${i + 1}: +${Math.round(worst)}px` : null
  }).filter(Boolean))
  console.log(src, over.length ? 'OVERFLOW ' + over.join(' · ') : 'no overflow')
  await p.pdf({ path: join(pdfDir, pdf), printBackground: true, preferCSSPageSize: true })
  if (previews) {
    const els = await p.locator('.page').all()
    for (const [i, el] of els.entries()) await el.screenshot({ path: join(prevDir, `${prefix}-${String(i + 1).padStart(2, '0')}.png`) })
  }
}
await b.close()
