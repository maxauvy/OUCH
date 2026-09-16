import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..'
const outDir = path.join(root, 'public', 'icons')
await mkdir(outDir, { recursive: true })

const jobs = [
  { src: 'public/icon-source.svg', out: 'public/icons/icon-192.png', size: 192 },
  { src: 'public/icon-source.svg', out: 'public/icons/icon-512.png', size: 512 },
  { src: 'public/icon-maskable-source.svg', out: 'public/icons/icon-maskable-512.png', size: 512 },
  { src: 'public/icon-source.svg', out: 'public/apple-touch-icon.png', size: 180 },
]

for (const job of jobs) {
  await sharp(path.join(root, job.src))
    .resize(job.size, job.size)
    .png()
    .toFile(path.join(root, job.out))
  console.log('wrote', job.out)
}
