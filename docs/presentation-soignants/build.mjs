// Builds the PDFs of the guide (A4) and the slides (16:9) from their HTML sources, and, with --previews, one PNG per page into apercus/.
//   node docs/presentation-soignants/build.mjs [guide|diaporama] [--previews]
// Needs Playwright (npm i --no-save playwright at the repo root; the installed Chrome is used) and `npm install` (Public Sans is read from node_modules).
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const previews = args.includes('--previews')
const which = args.find((a) => !a.startsWith('--'))
const pdfDir = join(here, 'pdf'); mkdirSync(pdfDir, { recursive: true })
const prevDir = join(here, 'apercus'); if (previews) mkdirSync(prevDir, { recursive: true })

const b = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch())
const jobs = [
  { name: 'guide', src: 'guide.html', pdf: 'OUCH-guide-presentation-soignants.pdf', sel: '.page', vp: { width: 794, height: 1123 }, pdfOpts: { preferCSSPageSize: true } },
  { name: 'diaporama', src: 'diaporama.html', pdf: 'OUCH-diaporama-soignants.pdf', sel: '.slide', vp: { width: 1280, height: 720 }, pdfOpts: { width: '1280px', height: '720px', preferCSSPageSize: true }, query: '?print' },
].filter((j) => !which || j.name === which)

for (const j of jobs) {
  const p = await b.newPage({ viewport: j.vp, deviceScaleFactor: previews ? 1.5 : 1 })
  await p.goto(pathToFileURL(join(here, j.src)).href + (j.query || ''), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)
  // A page that overflows is a mistake to fix, not to ship: report it.
  const over = await p.evaluate((sel) => [...document.querySelectorAll(sel)].map((el, i) => {
    const r = el.getBoundingClientRect(); const foot = el.querySelector('.foot')
    const limit = foot ? foot.getBoundingClientRect().top - 2 : r.bottom
    let worst = 0
    el.querySelectorAll('*').forEach((c) => { if (c.closest('.foot') || c.closest('.rp') || c.closest('.scr') || getComputedStyle(c).position === 'absolute') return; const cr = c.getBoundingClientRect(); if (cr.height > 0) worst = Math.max(worst, cr.bottom - limit) })
    return worst > 1 ? `${i + 1}: +${Math.round(worst)}px` : null
  }).filter(Boolean), j.sel)
  console.log(j.name, over.length ? 'OVERFLOW ' + over.join(' · ') : 'no overflow')
  await p.pdf({ path: join(pdfDir, j.pdf), printBackground: true, ...j.pdfOpts })
  if (previews) {
    const els = await p.locator(j.sel).all()
    for (const [i, el] of els.entries()) await el.screenshot({ path: join(prevDir, `${j.name}-${String(i + 1).padStart(2, '0')}.png`) })
  }
  await p.close()
}
await b.close()
