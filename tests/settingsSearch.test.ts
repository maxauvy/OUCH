// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchesSearch, normalizeSearch, SETTING_IDS, type SettingId } from '../src/lib/settingsSearch.ts'
import fr from '../src/i18n/locales/fr.ts'
import en from '../src/i18n/locales/en.ts'

test('accents, case and apostrophes do not matter', () => {
  assert.equal(normalizeSearch('  Météo  PARTAGÉE '), 'meteo partagee')
  assert.equal(normalizeSearch('l’app'), "l'app")
  assert.ok(matchesSearch('meteo', ['Prévoir demain', 'pression météo']))
  assert.ok(matchesSearch('KINÉ', ['Suivi kiné']))
})

test('every word typed must be found, and an empty query finds nothing', () => {
  assert.ok(matchesSearch('sauvegarde auto', ['Sauvegarde automatique']))
  assert.equal(matchesSearch('sauvegarde verrou', ['Sauvegarde automatique']), false)
  assert.equal(matchesSearch('   ', ['Sauvegarde automatique']), false)
})

/** The ids a query finds with a locale's short names and keywords (the page adds the title and the group). */
const found = (t: typeof fr, q: string) => SETTING_IDS.filter((id) => matchesSearch(q, [t.settings.short[id], t.settings.keywords[id]]))

test('the words people use find the setting, in French', () => {
  assert.ok(found(fr, 'code').includes('lock'))
  assert.ok(found(fr, 'dropbox').includes('autoBackup'))
  assert.ok(found(fr, 'kiné').includes('physio'))
  assert.ok(found(fr, 'sombre').includes('appearance'))
  const meteo = found(fr, 'météo')
  for (const id of ['weatherPlace', 'forecast', 'flareImage'] as SettingId[]) assert.ok(meteo.includes(id), id)
})

test('and in English', () => {
  assert.ok(found(en, 'passcode').includes('lock'))
  assert.ok(found(en, 'dark').includes('appearance'))
  assert.ok(found(en, 'physio').includes('physio'))
})

test('every setting has a short name and keywords in both languages', () => {
  for (const t of [fr, en]) for (const id of SETTING_IDS) {
    assert.ok(t.settings.short[id]?.trim(), `short ${id}`)
    assert.ok(t.settings.keywords[id]?.trim(), `keywords ${id}`)
  }
})
