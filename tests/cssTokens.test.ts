// Run with `npm test`. The check that runs on the built CSS (scripts/check-css-tokens.mjs, after `npm run build`) is tested here on small pieces.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { declaredTokens, missingTokens, readTokens } from '../scripts/check-css-tokens.mjs'

test('what the code reads: plain names, names with a fallback left out, level templates expanded, comments ignored', () => {
  const read = readTokens(`
    style={{ background: 'var(--a)', color: 'var(--b, var(--c))' }}
    const tile = \`var(--color-weather-\${level}-tile)\`
    const other = \`var(--look-\${tone}-soft)\`
    // var(--in-a-line-comment)
    /* var(--in-a-block-comment) */
  `)
  assert.deepEqual([...read].sort(), ['--a', '--c', '--color-weather-1-tile', '--color-weather-2-tile', '--color-weather-3-tile', '--color-weather-4-tile', '--color-weather-5-tile'])
})

test('what the built CSS declares in its base rules: not the dark rules, not a rule under an attribute', () => {
  const css = `
    @layer theme { :root, :host { --base: 1; } }
    :root { --plain: 2; }
    @media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { --only-dark: 3; --plain: 4; } }
    :root[data-theme='dark'] { --also-dark: 5; }
    :root[data-look='meteo'] { --look-bg: 6; }
    @media (min-width: 700px) { :root { --wide: 7; } }
    @property --registered { syntax: '*'; inherits: false; }
  `
  assert.deepEqual([...declaredTokens(css)].sort(), ['--base', '--plain', '--registered', '--wide'])
})

test('a colour declared only in the dark rules is missing: the light mode had nothing to read', () => {
  const css = `:root { --ok: 1; } @media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { --tile: 2; } }`
  assert.deepEqual(missingTokens({ css, sources: [`'var(--ok)'`, `'var(--tile)'`] }), ['--tile'])
})

test('a name the code sets itself at run time, one of an optional look, or one with a fallback is not missing', () => {
  const css = `:root { --ok: 1; }`
  const sources = [`style={{ ['--r' as string]: '3deg' }}`, `animation: x var(--r)`, `'var(--look-bg)'`, `'var(--nothing, red)'`, `'var(--ok)'`]
  assert.deepEqual(missingTokens({ css, sources }), [])
})
