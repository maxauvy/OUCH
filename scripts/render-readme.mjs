// Draws the README's picture (docs/images/ouch-readme.fr.png and .en.png, 2400 x 1200) from the app's demo captures:
// the day's page, a lead drawn from the notes and the report, beside the line « Ce qui l'aggrave, ce qui l'apaise ».
// Run after the captures are retaken (node scripts/capture-presentation.mjs, and with --lang en for the guide):
//   node scripts/render-readme.mjs
// Needs Playwright (npm i --no-save playwright), `npm install` (fonts from node_modules) and a connection (Instrument Serif, Google Fonts).
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const data = (path, type) => `data:${type};base64,${readFileSync(join(root, path)).toString('base64')}`
const font = (pkg, file) => data(`node_modules/@fontsource-variable/${pkg}/files/${file}`, 'font/woff2')

const TEXT = {
  fr: {
    img: 'docs/presentation-soignants/img',
    worse: 'Ce qui l’aggrave,',
    size: 84,
    eases: 'ce qui l’apaise.',
    line: 'Un carnet de douleur pour la fibromyalgie et les autres douleurs chroniques. Une minute par jour, des pistes tirées de tes notes, et un rapport pour ton médecin.',
    chips: ['Gratuit', 'Libre', 'Sans compte', 'Sur ton téléphone'],
  },
  en: {
    img: 'docs/guide-patients/img-en',
    worse: 'What makes it worse,',
    // Longer than the French line: a little smaller, so it stays on one line.
    size: 68,
    eases: 'what eases it.',
    line: 'A pain diary for fibromyalgia and other chronic pain. A minute a day, leads drawn from your notes, and a report for your doctor.',
    chips: ['Free', 'Open source', 'No account', 'On your phone'],
  },
}

const page = (t) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap">
<style>
@font-face { font-family: 'Bricolage'; src: url(${font('bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: 'Public Sans'; src: url(${font('public-sans', 'public-sans-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 600px; overflow: hidden; background: #574a7e; font-family: 'Public Sans', sans-serif; color: #fff; position: relative; }
.glow { position: absolute; width: 900px; height: 900px; border-radius: 50%; right: -330px; top: -170px; background: #655890; }
.band { position: absolute; inset: 0 0 auto 0; height: 10px; background: linear-gradient(90deg, #e3a73b, #b39ad6 60%, #8f7cc0); }
.left { position: absolute; left: 60px; top: 52px; width: 600px; }
.icon { width: 70px; height: 70px; border-radius: 17px; display: block; box-shadow: 0 10px 24px -12px rgba(0,0,0,.45); }
h1 { margin-top: 26px; line-height: .98; }
h1 .worse { display: block; font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; font-size: ${t.size}px; white-space: nowrap; color: #f3cf7c; letter-spacing: -.5px; }
h1 .eases { display: block; font-family: 'Bricolage', sans-serif; font-weight: 800; font-size: 74px; letter-spacing: -2.5px; margin-top: 6px; }
p.line { margin-top: 48px; font-size: 22px; line-height: 1.42; color: #ecebf6; width: 520px; }
.chips { position: absolute; left: 60px; bottom: 40px; display: flex; gap: 11px; }
.chips span { background: rgba(255,255,255,.14); border-radius: 999px; padding: 8px 18px; font-size: 19px; font-weight: 600; }
.phone { position: absolute; background: #fff; border-radius: 34px; padding: 9px; box-shadow: 0 24px 48px -24px rgba(10,6,30,.7); overflow: hidden; }
.phone .scr { border-radius: 26px; overflow: hidden; background: #f4f6f9; height: 100%; }
.phone img { display: block; width: 100%; }
.today { left: 676px; top: 92px; width: 238px; height: 560px; transform: rotate(-4deg); }
.lead { left: 928px; top: 24px; width: 236px; height: 360px; transform: rotate(3deg); }
.report { left: 748px; top: 402px; width: 418px; height: 260px; border-radius: 10px; padding: 0; transform: rotate(-2.5deg); }
.report img { width: 100%; }
</style></head><body>
<div class="glow"></div><div class="band"></div>
<div class="left">
  <img class="icon" src="${data('public/apple-touch-icon.png', 'image/png')}" alt="">
  <h1><span class="worse">${t.worse}</span><span class="eases">${t.eases}</span></h1>
  <p class="line">${t.line}</p>
</div>
<div class="chips">${t.chips.map((c) => `<span>${c}</span>`).join('')}</div>
<div class="phone today"><div class="scr"><img src="${data(`${t.img}/today-1.png`, 'image/png')}" alt=""></div></div>
<div class="phone lead"><div class="scr"><img src="${data(`${t.img}/lead.png`, 'image/png')}" alt=""></div></div>
<div class="phone report"><img src="${data(`${t.img}/report-gp-1.png`, 'image/png')}" alt=""></div>
</body></html>`

const browser = await chromium.launch({ channel: 'chrome' })
for (const [lang, t] of Object.entries(TEXT)) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 600 }, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.setContent(page(t), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  const out = `docs/images/ouch-readme.${lang}.png`
  await p.screenshot({ path: out })
  console.log(out)
  await ctx.close()
}
await browser.close()
