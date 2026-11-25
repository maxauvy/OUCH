// Draws the README's picture (docs/images/ouch-readme.fr.png and .en.png, 2400 x 1200) from the app's demo captures, in the
// « Aube » look of the flyers: a dawn background, « Ce qui l'aggrave, ce qui l'apaise » in Bricolage with its last words coloured
// letter by letter (coral to violet), « Ta douleur : » first so the « l’ » says what it stands for, the day's page in a phone, a lead drawn from the notes and the report, four stickers.
// Run after the captures are retaken (node scripts/capture-presentation.mjs, and with --lang en for the guide):
//   node scripts/render-readme.mjs
// Needs Playwright (npm i --no-save playwright) and `npm install` (the fonts come from node_modules).
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const data = (path, type) => `data:${type};base64,${readFileSync(join(root, path)).toString('base64')}`
const font = (pkg, file) => data(`node_modules/@fontsource-variable/${pkg}/files/${file}`, 'font/woff2')

// One solid colour per letter, coral to violet, as on the flyers (a gradient clipped to text prints as a block in some viewers).
const dawn = (words) => {
  const letters = [...words]
  const n = Math.max(1, letters.filter((c) => c.trim()).length - 1)
  let i = 0
  return letters
    .map((c) => {
      if (!c.trim()) return c
      const t = i++ / n
      const rgb = [[0xff, 0xc4], [0x5f, 0x6b], [0x3d, 0xd6]].map(([a, b]) => Math.round(a + (b - a) * t))
      return `<span style="color:rgb(${rgb.join(',')})">${c}</span>`
    })
    .join('')
}

const TEXT = {
  fr: {
    img: 'docs/presentation-soignants/img',
    // Each line of the title; the second item of a line is coloured letter by letter.
    lines: [['Ta douleur :'], ['ce qui l’aggrave,'], ['ce qui ', 'l’apaise.']],
    size: 62,
    line: 'Un carnet de douleur pour la fibromyalgie et les autres douleurs chroniques. Une minute par jour, des pistes tirées de tes notes, et un rapport pour ton médecin.',
    chips: [['Gratuit', 'ni pub, ni compte'], ['Libre', 'code ouvert'], ['1 min', 'par jour'], ['Chez toi', 'sur ton téléphone']],
  },
  en: {
    img: 'docs/guide-patients/img-en',
    lines: [['Your pain:'], ['what makes it worse,'], ['what ', 'eases it.']],
    // Longer than the French lines: a little smaller, so each stays on one line.
    size: 60,
    line: 'A pain diary for fibromyalgia and other chronic pain. A minute a day, leads drawn from your notes, and a report for your doctor.',
    chips: [['Free', 'no ads, no account'], ['Open', 'open source'], ['1 min', 'a day'], ['At home', 'on your phone']],
  },
}

const page = (t) => `<!doctype html><html><head><meta charset="utf-8">
<style>
@font-face { font-family: 'Bricolage'; src: url(${font('bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: 'Public Sans'; src: url(${font('public-sans', 'public-sans-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 600px; overflow: hidden; position: relative; font-family: 'Public Sans', sans-serif; color: #1f1d44;
  background: radial-gradient(620px 460px at 88% 6%, #ffb58a66, transparent 70%), radial-gradient(700px 540px at 0% 60%, #c9bdff55, transparent 70%), linear-gradient(180deg, #fff3ea 0%, #f6efff 60%, #ece6ff 100%); }
.left { position: absolute; left: 60px; top: 50px; width: 620px; }
.brand { display: flex; align-items: center; gap: 14px; font-family: 'Bricolage', sans-serif; font-weight: 800; font-size: 30px; letter-spacing: .02em; }
.brand img { width: 58px; height: 58px; border-radius: 14px; display: block; }
h1 { margin-top: 26px; font-family: 'Bricolage', sans-serif; font-weight: 800; font-size: ${t.size}px; line-height: .98; letter-spacing: -.04em; white-space: nowrap; }
h1 span.l { display: block; }
p.line { margin-top: 26px; font-size: 21px; line-height: 1.42; color: #3b3863; width: 540px; }
.stk { position: absolute; font-family: 'Bricolage', sans-serif; font-weight: 800; font-size: 30px; line-height: 1; border-radius: 14px; padding: 10px 15px; }
.stk small { display: block; font-family: 'Public Sans', sans-serif; font-weight: 700; font-size: 13px; margin-top: 4px; }
.s1 { left: 60px; top: 470px; background: #ffc285; transform: rotate(-4deg); }
.s2 { left: 210px; top: 478px; background: #9cc8ff; transform: rotate(3deg); }
.s3 { left: 345px; top: 466px; background: #ff7a59; transform: rotate(-2deg); }
.s4 { left: 478px; top: 476px; background: #e4dcff; transform: rotate(2.5deg); }
.phone { position: absolute; left: 690px; top: 70px; width: 236px; height: 560px; border-radius: 30px; overflow: hidden; border: 7px solid #0f0e26; box-shadow: 16px 20px 0 #ffb58a; transform: rotate(-4deg); background: #f4f6f9; }
.phone img, .card img { display: block; width: 100%; }
.card { position: absolute; background: #fff; overflow: hidden; border: 1.5px solid #1f1d4433; }
.lead { left: 940px; top: 26px; width: 228px; height: 336px; border-radius: 18px; transform: rotate(3deg); box-shadow: 10px 12px 0 #ffd2b3; }
.report { left: 770px; top: 396px; width: 410px; height: 250px; border-radius: 10px; transform: rotate(-2.5deg); box-shadow: 10px 12px 0 #ffd2b3; }
</style></head><body>
<div class="left">
  <div class="brand"><img src="${data('public/apple-touch-icon.png', 'image/png')}" alt="">OUCH</div>
  <h1>${t.lines.map(([plain, coloured]) => `<span class="l">${plain}${coloured ? dawn(coloured) : ''}</span>`).join('')}</h1>
  <p class="line">${t.line}</p>
</div>
${t.chips.map(([b, s], i) => `<div class="stk s${i + 1}">${b}<small>${s}</small></div>`).join('')}
<div class="phone"><img src="${data(`${t.img}/today-1.png`, 'image/png')}" alt=""></div>
<div class="card lead"><img src="${data(`${t.img}/lead.png`, 'image/png')}" alt=""></div>
<div class="card report"><img src="${data(`${t.img}/report-gp-1.png`, 'image/png')}" alt=""></div>
</body></html>`

const browser = await chromium.launch({ channel: 'chrome' })
for (const [lang, t] of Object.entries(TEXT)) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 600 }, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.setContent(page(t), { waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  const out = `docs/images/ouch-readme.${lang}.png`
  await p.screenshot({ path: out })
  console.log(out)
  await ctx.close()
}
await browser.close()
