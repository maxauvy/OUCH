// Renders the single image of the GitHub README (1600x800, FR and EN): node communication/visuels-presentation/render-readme.mjs
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url)); const out = join(here, 'png'); mkdirSync(out, { recursive: true })
const b = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const p = await (await b.newContext({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1.5 })).newPage()
for (const l of ['fr', 'en']) {
  await p.goto(pathToFileURL(join(here, `readme-${l}.html`)).href, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)
  await p.locator('#hero').screenshot({ path: join(out, `ouch-readme-${l}.png`) })
}
await b.close()
