// Builds the card a doctor hands out (A6, recto and verso): its QR code (qr.svg, to maxauvy.github.io/OUCH/?de=medecin, which opens the setup
// with « Ton médecin t'a conseillé ce carnet »), then the PDF with Chrome.
//   node docs/carte-medecin/build.mjs
import { encode } from 'uqr'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const { data, size } = encode('https://maxauvy.github.io/OUCH/?de=medecin', { ecc: 'M', border: 0 })
const cells = data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : ''))).join('')
writeFileSync(join(here, 'qr.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><path fill="#1f1d44" d="${cells}"/></svg>`)
mkdirSync(join(here, 'pdf'), { recursive: true })
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
for (const [src, out] of [['carte.html', 'OUCH-carte-medecin-A6.pdf']]) {
  execFileSync(chrome, ['--headless=new', '--no-pdf-header-footer', '--allow-file-access-from-files', '--virtual-time-budget=6000', `--print-to-pdf=${join(here, 'pdf', out)}`, join(here, src)], { stdio: 'ignore' })
  console.log(out)
}
