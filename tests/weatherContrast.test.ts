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

// Dark mode: the tiles of the calendar are deep tints of each hue, not the pale ones (13 to 15:1 against the card, they glared).
import { readFileSync } from 'node:fs'
import { WEATHER_TILE_DARK } from '../src/lib/theme.ts'

const DARK_CARD = '#172026'
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
/** The value of a custom property in the nth block that sets it (0 light, 1 the OS dark rule, 2 the explicit dark stamp). */
const token = (name: string, nth: number) => [...css.matchAll(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`, 'g'))][nth]?.[1]

test('dark mode: the number reads on its tile (4.5:1) and the icon too (3:1 for a graphic, 4.5 held), and the tile stays near the card', () => {
  for (const level of LEVELS) {
    const { tile, mark, glyph } = WEATHER_TILE_DARK[level]
    assert.ok(contrast(mark, tile) >= 4.5, `number, level ${level}: ${contrast(mark, tile).toFixed(2)}`)
    assert.ok(contrast(glyph, tile) >= 4.5, `icon, level ${level}: ${contrast(glyph, tile).toFixed(2)}`)
    assert.ok(contrast(tile, DARK_CARD) <= 2, `tile against the card, level ${level}: ${contrast(tile, DARK_CARD).toFixed(2)}`)
  }
})

test('the tile colours of index.css (light, then the two dark rules) say what lib/theme.ts says', () => {
  for (const level of LEVELS) {
    for (const part of ['tile', 'mark', 'glyph'] as const) {
      const name = `--color-weather-${level}-${part}`
      assert.equal(token(name, 1), WEATHER_TILE_DARK[level][part], `${name} (OS dark rule)`)
      assert.equal(token(name, 2), WEATHER_TILE_DARK[level][part], `${name} (explicit dark)`)
    }
    // Light mode keeps the pale tint and its ink, unchanged.
    assert.equal(token(`--color-weather-${level}-tile`, 0)?.toLowerCase(), theme.weather[level].soft)
    assert.equal(token(`--color-weather-${level}-mark`, 0)?.toLowerCase(), theme.weather[level].ink)
    assert.equal(token(`--color-weather-${level}-glyph`, 0)?.toLowerCase(), theme.weather[level].ink)
  }
})

test('the light tile colours are declared outside @theme, where Tailwind would leave them out of the built CSS (only inline styles read them)', () => {
  const open = css.indexOf('@theme {')
  assert.ok(open >= 0)
  let depth = 0
  let close = -1
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}' && --depth === 0) {
      close = i
      break
    }
  }
  assert.ok(close > open, 'the @theme block was found')
  for (const level of LEVELS) {
    for (const part of ['tile', 'mark', 'glyph'] as const) {
      const at = css.indexOf(`--color-weather-${level}-${part}:`)
      assert.ok(at > close, `--color-weather-${level}-${part} is declared inside @theme (light mode would lose it)`)
    }
  }
})
