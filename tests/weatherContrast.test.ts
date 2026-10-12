// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { theme } from '../src/lib/theme.ts'
import { painWeatherByLevel } from '../src/lib/painWeather.ts'

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const LEVELS = [1, 2, 3, 4, 5] as const

test('the weather ink reads on its own tint: 4.5:1 at least, for the day number and the icon', () => {
  for (const level of LEVELS) {
    const { ink, soft } = theme.weather[level]
    assert.ok(contrast(ink, soft) >= 4.5, `level ${level}: ${contrast(ink, soft).toFixed(2)}`)
  }
})

test('the five weathers have five different icons, so shape tells them apart where colour cannot', () => {
  const icons = LEVELS.map((level) => painWeatherByLevel(level).icon)
  assert.equal(new Set(icons).size, 5)
})
