// Renders the posts of 0.10.0 to PNG (1080x1350), and each carousel to a PDF (LinkedIn "document") made of those pictures:
//   visuels.html   -> patients   : ouch-0.10.0-post.png, ouch-0.10.0-carrousel-N.png, ouch-0.10.0-carrousel.pdf
//   soignants.html -> clinicians : ouch-0.10.0-soignants-post.png, ouch-0.10.0-soignants-carrousel-N.png, ouch-0.10.0-soignants-carrousel.pdf
//   node communication/visuels-0.10.0/render.mjs [visuels|soignants|lire]     (both by default)
// Needs Playwright (npm i --no-save playwright at the repo root; the installed Chrome is used) and a connection for the fonts (Google Fonts).
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'png'); mkdirSync(out, { recursive: true })
const which = process.argv[2]
const SETS = [
  { src: 'visuels.html', prefix: 'ouch-0.10.0' },
  { src: 'soignants.html', prefix: 'ouch-0.10.0-soignants' },
  { src: 'lire.html', prefix: 'ouch-lire-un-rapport' },
].filter((s) => !which || s.src.startsWith(which))

const b = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const ctx = await b.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
for (const { src, prefix } of SETS) {
  const work = mkdtempSync(join(tmpdir(), 'ouch-visuels-'))
  await p.goto(pathToFileURL(join(here, src)).href, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800)
  const slides = await p.locator('.post').all()
  const names = slides.map((_, i) => (i === 0 ? `${prefix}-post.png` : `${prefix}-carrousel-${i}.png`))
  // The PNGs are 1080x1350 (what the networks ask for); the same pictures at twice the size, in `work`, make the PDF.
  for (const [i, s] of slides.entries()) {
    await s.screenshot({ path: join(out, names[i]), scale: 'css' })
    await s.screenshot({ path: join(work, names[i]) })
  }
  // The PDF is built from the pictures of the slides, not printed from the page: Chrome draws the soft shadows of a printed
  // page as black veils, and a picture is what a viewer shows as is. The single post image is not part of it.
  const pages = names.slice(1).map((n) => `<img src="${n}">`).join('')
  writeFileSync(join(work, 'carrousel.html'), `<style>@page{size:1080px 1350px;margin:0}body{margin:0}img{display:block;width:1080px;height:1350px;break-after:page}</style>${pages}`)
  await p.goto(pathToFileURL(join(work, 'carrousel.html')).href, { waitUntil: 'load' })
  await p.pdf({ path: join(out, `${prefix}-carrousel.pdf`), width: '1080px', height: '1350px', printBackground: true, preferCSSPageSize: true })
  rmSync(work, { recursive: true, force: true })
}
await b.close()
