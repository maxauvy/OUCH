// Screenshots each .sheet of the given HTML files into apercus/<name>-<n>.png, to check the layout.
// Run through build.py --previews. Needs `npm i --no-save playwright` at the repo root.
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { basename, dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const out = join(dirname(fileURLToPath(import.meta.url)), 'apercus')
mkdirSync(out, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ deviceScaleFactor: 1.6, viewport: { width: 900, height: 1200 } })
for (const f of process.argv.slice(2)) {
  await p.goto(pathToFileURL(f).href, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(600)
  for (const [i, s] of (await p.locator('.sheet').all()).entries())
    await s.screenshot({ path: join(out, `${basename(f, '.html')}-${i + 1}.png`) })
}
await b.close()
