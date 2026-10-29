// Descriptive statistics over plain number lists. Pure, so plain Node can test
// it. Nothing here interprets a result.


export const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length

export function sd(a: number[]): number {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1))
}

/** Linear interpolation between order statistics (same as R's type 7). */
export function quantile(a: number[], p: number): number {
  const s = [...a].sort((x, y) => x - y)
  const pos = (s.length - 1) * p
  const lo = Math.floor(pos)
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo)
}

export const median = (a: number[]) => quantile(a, 0.5)

function ranks(a: number[]): number[] {
  const order = a.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0])
  const r = new Array<number>(a.length)
  for (let i = 0; i < order.length; ) {
    let j = i
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++
    for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2 + 1
    i = j + 1
  }
  return r
}

function pearson(x: number[], y: number[]): number {
  const mx = mean(x)
  const my = mean(y)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN
}

/** Spearman's rank correlation (ties get their average rank). */
export const spearman = (x: number[], y: number[]) => pearson(ranks(x), ranks(y))
