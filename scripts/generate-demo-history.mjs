// Generates a 90-day demo history as an encrypted OUCH backup, importable
// from Settings → Backup (password: see DEMO_PASSWORD).
//
//   node scripts/generate-demo-history.mjs [output.json] [end-date YYYY-MM-DD]
//   DEMO_LANG=en node scripts/generate-demo-history.mjs …   (English tags, notes and medication names)
//   DEMO_TODAY=empty …        leave today without an entry, to open on an empty Today page
//   DEMO_ILLNESSES=fibromyalgie,migraine …   several tracked illnesses (default: fibromyalgie only)
//   DEMO_DAYS=330 …           a longer history (default 90): the story below ends the same way, and
//                             calmer months come before it, with one more background treatment (the
//                             review of a change in Trends needs about eight months to set a change
//                             beside the person's usual month-to-month gaps)
//
// Built to demo the app straight after import. Data is deterministic
// (seeded PRNG) and tells one story every screen can show:
// - a flare in late summer, another that leads to a consultation where the
//   duloxetine dose is raised (about four weeks before the end, so it shows
//   in Trends' default 30-day view), pain easing over the following weeks,
//   then a new flare that runs up to yesterday: the Today page opens on its
//   soft "harder days" card (it looks at the days before today). Today's
//   entry is an easier day, so the report counts that flare as over; with
//   DEMO_TODAY=empty it reads "ongoing". Flares are found relative to the
//   person's own usual pain;
// - an earlier background treatment stopped for side effects, as-needed
//   painkillers with relief ratings;
// - pain following sleep, stress, pressure drops, storms and periods, and
//   "what helped" tags with clear associations (and one reverse one: rest is
//   taken on bad days);

// The history itself lives in src/lib/demoData.ts, shared with the app's own
// demo mode (Settings, or the ?demo link): this script only wraps it in an
// encrypted backup, so a copy can still be imported on a device.

import { webcrypto as crypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { buildDemoHistory, DEMO_STORY_DAYS } from '../src/lib/demoData.ts'

const DEMO_PASSWORD = 'demo'
const output = process.argv[2] ?? 'ouch-demo-90j.json'
const endDate = process.argv[3] ?? new Date().toISOString().slice(0, 10)
const language = process.env.DEMO_LANG === 'en' ? 'en' : 'fr'

// Must match src/lib/crypto.ts
const PBKDF2_ITERATIONS = 600_000
const MAGIC = 'OUCH1'

const { entries, medications, settings } = buildDemoHistory({
  endDate,
  language,
  days: Number(process.env.DEMO_DAYS ?? DEMO_STORY_DAYS),
  emptyToday: process.env.DEMO_TODAY === 'empty',
  illnesses: (process.env.DEMO_ILLNESSES ?? 'fibromyalgie').split(',').map((s) => s.trim()).filter(Boolean),
})
const bundle = { version: 2, exportedAt: new Date().toISOString(), entries, medications, settings }

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64')
const salt = crypto.getRandomValues(new Uint8Array(16))
const iv = crypto.getRandomValues(new Uint8Array(12))
const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(DEMO_PASSWORD), 'PBKDF2', false, ['deriveKey'])
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
  baseKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt']
)
const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(bundle)))

writeFileSync(
  output,
  JSON.stringify({
    magic: MAGIC,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString(),
    iterations: PBKDF2_ITERATIONS,
  })
)

const avg = entries.reduce((s, e) => s + (e.painLevel ?? 0), 0) / entries.length
console.log(`${entries.length} entries (${entries[0]?.date} → ${endDate}), avg pain ${avg.toFixed(1)} → ${output} (password: "${DEMO_PASSWORD}")`)
