// Why OUCH draws the days of a trial: a simulation where the true effect of an
// action is known, and four ways of reading "what helped" from a diary with one
// pain score a day. Its figures are the ones quoted in the methodological note
// (annex on the drawn trial).
//
//   node scripts/simulate-trial-designs.ts
//
// Model: the day's underlying pain follows an AR(1) around 4.5 (coefficient 0.7,
// noise of sd about 1.4, a rare flare of +3). The action is taken on 70 % of the
// days whose underlying pain is 6 or more and on 10 % of the others ("chosen"),
// or on days drawn at random. It can ease the pain of that day ("same day") or
// the next day's underlying pain ("next day"). The score noted is rounded to 0-10.

import { shiftISO } from '../src/lib/dates.ts'
import { drawPlan } from '../src/lib/leadTrial.ts'

type Day = { date: string; pain: number; x: boolean }
const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN)

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function simulate(seed: number, n: number, same: number, next: number, choose: (latent: number, i: number, r: () => number) => boolean): Day[] {
  const r = rng(seed)
  const noise = () => {
    let s = 0
    for (let i = 0; i < 6; i++) s += r()
    return (s - 3) * 1.4
  }
  let latent = 4.5
  let carry = 0
  const out: Day[] = []
  for (let i = 0; i < n; i++) {
    latent = 4.5 + 0.7 * (latent - 4.5) + noise() + (r() < 0.03 ? 3 : 0) + carry
    const x = choose(latent, i, r)
    out.push({ date: shiftISO('2026-01-01', i), pain: Math.round(Math.min(10, Math.max(0, latent + (x ? same : 0)))), x })
    carry = x ? next : 0
  }
  return out
}

/** A: same day. B: next day. C: change to the next day at equal pain on the day. D: the day at equal pain the day before. */
function readings(days: Day[]) {
  const A = mean(days.filter((d) => d.x).map((d) => d.pain)) - mean(days.filter((d) => !d.x).map((d) => d.pain))
  const pairs = days.slice(0, -1).map((d, i) => ({ x: d.x, p0: d.pain, p1: days[i + 1].pain }))
  const B = mean(pairs.filter((p) => p.x).map((p) => p.p1)) - mean(pairs.filter((p) => !p.x).map((p) => p.p1))
  const strat = (rows: { x: boolean; p0: number; y: number }[]) => {
    let num = 0
    let w = 0
    for (let lvl = 0; lvl <= 10; lvl++) {
      const yes = rows.filter((p) => p.p0 === lvl && p.x)
      const no = rows.filter((p) => p.p0 === lvl && !p.x)
      if (!yes.length || !no.length) continue
      num += yes.length * (mean(yes.map((p) => p.y)) - mean(no.map((p) => p.y)))
      w += yes.length
    }
    return num / w
  }
  const C = strat(pairs.map((p) => ({ x: p.x, p0: p.p0, y: p.p1 - p.p0 })))
  const D = strat(days.slice(1).map((d, i) => ({ x: d.x, p0: days[i].pain, y: d.pain })))
  return { A, B, C, D }
}

const f = (v: number) => (Number.isFinite(v) ? (v >= 0 ? '+' : '') + v.toFixed(1) : '—')
const scenarios: [string, number, number][] = [
  ['no effect', 0, 0],
  ['eases the day (−1.5)', -1.5, 0],
  ['eases the next day (−1)', 0, -1],
]
const chosen = (latent: number, _i: number, r: () => number) => r() < (latent >= 6 ? 0.7 : 0.1)
const random = (_l: number, _i: number, r: () => number) => r() < 0.3

for (const [label, choose] of [['chosen on hard days', chosen], ['drawn at random', random]] as const) {
  console.log(`\n${label}, 330 days, mean of 200 runs (true: same day / next day)`)
  for (const [name, same, next] of scenarios) {
    const runs = Array.from({ length: 200 }, (_, s) => readings(simulate((s + 1) * 97, 330, same, next, choose)))
    const m = (k: 'A' | 'B' | 'C' | 'D') => f(mean(runs.map((x) => x[k]).filter(Number.isFinite)))
    console.log(`  ${name.padEnd(26)} true ${f(same)} / ${f(next)}   A ${m('A')}   B ${m('B')}   C ${m('C')}   D ${m('D')}`)
  }
}

// The trial itself: 10 days, 5 with and 5 without, all logged. How far the gap strays by chance alone.
const gaps: number[] = []
for (let s = 1; s <= 2000; s++) {
  const r = rng(s * 31)
  const plan = drawPlan(r)
  const days = simulate(s * 7919, 10, 0, 0, (_l, i) => plan[i] === 'with')
  gaps.push(mean(days.filter((d) => d.x).map((d) => d.pain)) - mean(days.filter((d) => !d.x).map((d) => d.pain)))
}
const sorted = gaps.map(Math.abs).sort((a, b) => a - b)
console.log(`\nDrawn 10-day trial, no effect: |gap| exceeds ${sorted[Math.floor(sorted.length * 0.5)].toFixed(1)} half the time, ${sorted[Math.floor(sorted.length * 0.9)].toFixed(1)} one time in ten`)
