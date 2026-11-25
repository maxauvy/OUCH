// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { CERT_FIELDS, NEEDS_MAX, certificateFields, frequencyClasses, needsSentence } from '../src/lib/mdphCertificate.ts'
import frLocale from '../src/i18n/locales/fr.ts'

const fr = frLocale.mdph
const words = { asks: fr.parcours.asks, gestures: fr.gestures }

test('only the patient box of page 1, and only what was typed', () => {
  assert.deepEqual(certificateFields({ lastName: '', firstNames: '' }), {})
  assert.deepEqual(certificateFields({ lastName: ' Martin ', firstNames: 'Camille', birthDate: '1990-03-07', dossier: '', needs: 'Je demande : AAH.' }), {
    [CERT_FIELDS.lastName]: 'Martin',
    [CERT_FIELDS.firstNames]: 'Camille',
    [CERT_FIELDS.birthDate]: '07/03/1990',
    [CERT_FIELDS.needs]: 'Je demande : AAH.',
  })
})

test('the proposal comes from the person’s answers', () => {
  assert.equal(needsSentence(undefined, undefined, words), '')
  assert.equal(
    needsSentence(['aah', 'rqth', 'unsure'], { hygiene: 'often', dressing: 'often', shopping: 'sometimes', meals: 'no' }, words),
    'Je demande : AAH et RQTH. Ma douleur me gêne souvent pour : se laver, aller aux toilettes ; s’habiller. Parfois pour : faire les courses.'
  )
})

test('the proposal fits the box: « Parfois » goes first when it is too long', () => {
  const all = Object.fromEntries(Object.keys(fr.gestures).map((g, i) => [g, i < 9 ? 'often' : 'sometimes']))
  const s = needsSentence(['aah'], all, words)
  assert.ok(!s.includes('Parfois'))
})

test('months sorted as the certificate asks', () => {
  const m = (flareDays: number) => ({ month: '2026-01', calendarDays: 31, logged: 31, flareDays, strongDays: 0 })
  assert.deepEqual(frequencyClasses([m(0), m(3), m(15), m(16), m(20)]), { over15: 2, upTo15: 2, none: 1 })
})

test('the field names exist in the bundled certificate', async () => {
  const { PDFDocument } = await import('pdf-lib')
  const form = (await PDFDocument.load(readFileSync(new URL('../public/mdph/cerfa-15695-01.pdf', import.meta.url)))).getForm()
  for (const n of Object.values(CERT_FIELDS)) assert.doesNotThrow(() => form.getTextField(n), n)
  assert.ok(NEEDS_MAX <= 320)
})
