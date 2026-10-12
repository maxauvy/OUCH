// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { languageFromBrowser, parseDemoFlag, withoutDemoParam } from '../src/lib/demoMode.ts'

test('the demo flag holds a language the app speaks, nothing else', () => {
  assert.equal(parseDemoFlag('fr'), 'fr')
  assert.equal(parseDemoFlag('en'), 'en')
  for (const bad of [null, '', '1', 'de', 'FR']) assert.equal(parseDemoFlag(bad), null, String(bad))
})

test('the browser decides the language by its first language the app speaks, French by default', () => {
  assert.equal(languageFromBrowser(['en-US', 'fr']), 'en')
  assert.equal(languageFromBrowser(['fr-FR', 'en']), 'fr')
  assert.equal(languageFromBrowser(['de-DE', 'en-GB']), 'en')
  assert.equal(languageFromBrowser(['de-DE', 'es']), 'fr')
  assert.equal(languageFromBrowser([]), 'fr')
})

test('the ?demo link is cleaned from the address, the rest of it kept', () => {
  assert.equal(withoutDemoParam('https://maxauvy.github.io/OUCH/?demo'), '/OUCH/')
  assert.equal(withoutDemoParam('https://maxauvy.github.io/OUCH/?demo=1&x=2#top'), '/OUCH/?x=2#top')
  assert.equal(withoutDemoParam('https://maxauvy.github.io/OUCH/?x=2'), null)
  assert.equal(withoutDemoParam('https://maxauvy.github.io/OUCH/'), null)
})
