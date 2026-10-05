// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { REFERENCES } from '../src/lib/references.ts'
import fr from '../src/i18n/locales/fr.ts'
import en from '../src/i18n/locales/en.ts'

// The Settings sources card reads `sources.items[i]` for each reference, so a
// reference added without its summaries would crash the page.
test('every reference has a summary and a usage line in each language', () => {
  for (const [name, locale] of [['fr', fr], ['en', en]] as const) {
    assert.equal(locale.sources.items.length, REFERENCES.length, `${name}: one entry per reference`)
    locale.sources.items.forEach((item, i) => {
      assert.ok(item.summary.trim(), `${name}: summary ${i + 1}`)
      assert.ok(item.usage.trim(), `${name}: usage ${i + 1}`)
    })
    assert.equal(locale.report.referenceUses.length, REFERENCES.length, `${name}: report use per reference`)
  }
})
