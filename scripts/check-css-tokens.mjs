// After `npm run build`: every custom property the code reads with var(--name) must exist in the CSS that was built.
//   node scripts/check-css-tokens.mjs
// Why: Tailwind keeps from an @theme block only the variables a utility class uses, so a colour declared there and read only by an inline style
// (`style={{ background: 'var(--color-weather-1-tile)' }}`) silently vanishes from the built CSS in light mode: the page then shows nothing, and no
// test on the source can see it. This compares the code with what was really built. The same is done for names built with `${level}` (1 to 5).
// A name must be declared in the BASE rules (the light mode): a declaration found only in the dark rules is exactly the case that went wrong, so it does not count.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const LEVELS = ['1', '2', '3', '4', '5']
/** Tokens of an optional look, declared only when it is on (`[data-look='meteo']`) and read under it or with a fallback. */
const OPTIONAL_PREFIXES = ['--look-']

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\w])\/\/[^\n]*/g, '$1')

/** The custom properties a piece of code reads with `var(--x)`, a template such as `--color-weather-${level}-tile` being expanded over the five levels. */
export function readTokens(source) {
  const used = new Set()
  for (const m of stripComments(source).matchAll(/var\(\s*(--[a-zA-Z0-9_$\-{}]+)\s*([,)])/g)) {
    const name = m[1]
    // `var(--x, fallback)`: the name is optional, the page works without it.
    if (m[2] === ',') continue
    if (!name.includes('${')) {
      if (!name.endsWith('-')) used.add(name)
      continue
    }
    // Only the level templates are checked; another template (a prefix plus a runtime value) cannot be known here.
    if (/^--[a-zA-Z0-9-]*\$\{level\}[a-zA-Z0-9-]*$/.test(name)) for (const l of LEVELS) used.add(name.replace('${level}', l))
  }
  return used
}

/** The blocks of a piece of CSS, as { prelude, body }, one level deep (the body of an at-rule is parsed again by the caller). */
function blocks(css) {
  const out = []
  let depth = 0
  let start = 0
  let bodyStart = -1
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c === '{') {
      if (depth === 0) bodyStart = i + 1
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0) {
        out.push({ prelude: css.slice(start, bodyStart - 1).trim(), body: css.slice(bodyStart, i) })
        start = i + 1
      }
    }
  }
  return out
}

/** The custom properties declared in the BASE rules of the built CSS: not inside a dark-mode media query, not under a selector with an attribute (data-theme, data-look) or a :not(). */
export function declaredTokens(css) {
  const found = new Set()
  const visit = (text) => {
    for (const { prelude, body } of blocks(text)) {
      if (prelude.startsWith('@media')) {
        if (/prefers-color-scheme\s*:\s*dark/.test(prelude)) continue
        visit(body)
      } else if (prelude.startsWith('@layer') || prelude.startsWith('@supports')) {
        visit(body)
      } else if (prelude.startsWith('@property')) {
        const m = prelude.match(/@property\s+(--[a-zA-Z0-9_-]+)/)
        if (m) found.add(m[1])
      } else if (!prelude.startsWith('@') && !/\[|:not\(/.test(prelude)) {
        for (const m of body.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) found.add(m[1])
      }
    }
  }
  visit(css)
  return found
}

/** Names the code sets itself at run time, as a quoted string (`'--r'`): they are no CSS declaration, and need none. */
export function setAtRunTime(source) {
  return new Set([...source.matchAll(/['"`](--[a-zA-Z0-9_-]+)['"`]/g)].map((m) => m[1]))
}

/** What is read but declared nowhere: neither in the built CSS nor by the code at run time. */
export function missingTokens({ css, sources }) {
  const declared = declaredTokens(css)
  const missing = new Set()
  const runtime = new Set()
  for (const s of sources) for (const n of setAtRunTime(s)) runtime.add(n)
  for (const s of sources) for (const n of readTokens(s)) if (!declared.has(n) && !runtime.has(n) && !OPTIONAL_PREFIXES.some((p) => n.startsWith(p))) missing.add(n)
  return [...missing].sort()
}

function walk(dir, ext, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, ext, out)
    else if (ext.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const cssFiles = walk(join(root, 'dist', 'assets'), ['.css'])
  if (!cssFiles.length) {
    console.error('No built CSS in dist/assets: run `npm run build` first.')
    process.exit(2)
  }
  const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n')
  const sources = walk(join(root, 'src'), ['.ts', '.tsx', '.css']).map((f) => readFileSync(f, 'utf8'))
  const missing = missingTokens({ css, sources })
  if (missing.length) {
    console.error(`Read by the code but not declared in the base rules of the built CSS (in an @theme block that no utility class uses? only in the dark rules?):\n  ${missing.join('\n  ')}`)
    process.exit(1)
  }
  console.log(`All the custom properties the code reads are declared in the base rules of the built CSS (${declaredTokens(css).size} declared).`)
}
