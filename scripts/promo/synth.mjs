// Synthesizes the 50 s ambient backing track of the promo videos (soft pad,
// plucked arpeggio, then a light beat from 11 s), no samples or assets needed.
//   node scripts/promo/synth.mjs [output.wav]   (needs ffmpeg for echo + fades)
import { writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const OUT = process.argv[2] ?? 'ouch-promo-music.wav'
const RAW = join(tmpdir(), 'ouch-promo-music.f32')
const SR = 44100, DUR = 50, N = SR * DUR
const L = new Float32Array(N), R = new Float32Array(N)
const BPM = 115.2, beat = 60 / BPM, bar = beat * 4, eighth = beat / 2
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)
const chords = [[60, 64, 67, 71], [55, 59, 62, 67], [57, 60, 64, 67], [53, 57, 60, 64]] // Cmaj7 G Am7 Fmaj7
const roots = [36, 43, 45, 41]
function add(t0, dur, fn, gl, gr) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + dur) * SR))
  for (let i = i0; i < i1; i++) { const t = i / SR - t0; const v = fn(t); L[i] += v * gl; R[i] += v * gr }
}
const sm = (x) => x * x * (3 - 2 * x)
// pad: every bar, soft attack/release, overlapping next chord
for (let b = 0; b * bar < DUR; b++) {
  const ch = chords[b % 4], t0 = b * bar, len = bar + 1.2
  for (const [k, m] of ch.entries()) {
    const f = mtof(m + 12), pan = k % 2 ? 0.6 : 0.4
    add(t0, len, (t) => {
      const env = sm(Math.min(1, t / 0.9)) * sm(Math.min(1, (len - t) / 1.2))
      return env * 0.05 * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t))
    }, pan * 2, (1 - pan) * 2)
  }
}
const drums = (t) => t >= 11 && t < 45.6
const music = (t) => t >= 3.5 && t < 46.5
for (let b = 0; b * bar < DUR; b++) {
  const ch = chords[b % 4], root = roots[b % 4]
  for (let e = 0; e < 8; e++) {
    const t = b * bar + e * eighth
    if (music(t)) {
      // arpeggio pluck, ping-pong
      const m = ch[[0, 1, 2, 3, 2, 1, 2, 3][e]] + 24, f = mtof(m), g = e % 2 ? [0.5, 1.1] : [1.1, 0.5]
      const vol = t < 11 ? 0.10 : 0.15
      add(t, 0.9, (x) => Math.exp(-x * 6) * vol * (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(2 * Math.PI * f * 2 * x) * Math.exp(-x * 12)), g[0], g[1])
    }
    if (music(t) && (e === 0 || e === 3 || e === 4)) {
      const f = mtof(root) * (e === 4 ? 1 : 1)
      add(t, 0.55, (x) => Math.min(1, x / 0.01) * Math.exp(-x * 4) * 0.22 * Math.sin(2 * Math.PI * f * x), 1, 1)
    }
    if (drums(t)) {
      if (e === 0 || e === 4) add(t, 0.3, (x) => Math.exp(-x * 14) * 0.42 * Math.sin(2 * Math.PI * (45 * x + 14 * (1 - Math.exp(-x * 30)) / 30 * 30 * 0 + 90 * (1 - Math.exp(-x * 25)) / 25)), 1, 1)
      if (e % 2 === 1) { let prev = 0; add(t, 0.06, (x) => { const n = Math.random() * 2 - 1; const hp = n - prev; prev = n; return hp * Math.exp(-x * 70) * 0.05 }, 0.8, 1.1) }
      if (e === 2 || e === 6) { let s = 0; add(t, 0.14, (x) => { const n = Math.random() * 2 - 1; s += 0.35 * (n - s); return s * Math.exp(-x * 26) * 0.10 }, 1, 1) }
    }
  }
}
const out = Buffer.alloc(N * 8)
let peak = 0
for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i]); R[i] = Math.tanh(R[i]); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])) }
const g = 0.7 / peak
for (let i = 0; i < N; i++) { out.writeFloatLE(L[i] * g, i * 8); out.writeFloatLE(R[i] * g, i * 8 + 4) }
writeFileSync(RAW, out)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', RAW,
  '-af', 'aecho=0.8:0.55:300|450:0.28|0.2,lowpass=f=9000,afade=t=in:d=1,afade=t=out:st=46.5:d=3.5,loudnorm=I=-16:TP=-1.5',
  '-t', String(DUR), OUT], { stdio: 'inherit' })
console.log('wrote', OUT)
