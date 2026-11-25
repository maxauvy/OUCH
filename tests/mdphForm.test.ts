// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { ASK_FIELDS, GESTURE_FIELDS, KIND_FIELDS, TEXT_FIELDS, ageOn, formFields, winAnsi } from '../src/lib/mdphForm.ts'
import { GESTURES } from '../src/lib/mdph.ts'

const TODAY = '2026-11-25'

test('only what the person answered is ticked', () => {
  const f = formFields({ lastName: ' Martin ', firstNames: 'Camille', kind: 'first', gestures: { hygiene: 'often', dressing: 'sometimes', shopping: 'no' }, asks: ['aah', 'cmi', 'unsure'] }, TODAY)
  assert.deepEqual(f.checks, ['Première demande à la MDPH', "Besoin pour l'hygiène corporelle", "Besoin pour s'habiller", 'Vous avez plus de 20 ans Allocations aux adultes handicapés'])
  assert.equal(f.texts[TEXT_FIELDS.lastName], 'Martin')
  assert.equal(f.texts[TEXT_FIELDS.footerLastName], 'Martin')
  assert.equal(f.texts[TEXT_FIELDS.footerFirstName], 'Camille')
})

test('nothing typed, nothing chosen: nothing written', () => {
  assert.deepEqual(formFields({ lastName: '', firstNames: '' }, TODAY), { checks: [], texts: {} })
})

test('the birth date goes in three boxes; under 20, part E is left to the person', () => {
  const f = formFields({ lastName: '', firstNames: '', birthDate: '1990-03-07', asks: ['rqth'] }, TODAY)
  assert.deepEqual([f.texts[TEXT_FIELDS.birthDay], f.texts[TEXT_FIELDS.birthMonth], f.texts[TEXT_FIELDS.birthYear]], ['07', '03', '1990'])
  assert.deepEqual(f.checks, ['RQTH'])
  assert.deepEqual(formFields({ lastName: '', firstNames: '', birthDate: '2008-01-01', asks: ['rqth'] }, TODAY).checks, [])
  assert.equal(ageOn('2006-11-26', TODAY), 19)
  assert.equal(ageOn('2006-11-25', TODAY), 20)
})

test('text the form font cannot draw is made safe', () => {
  assert.equal(winAnsi('12 mois « ok » – l’été\u{1F600}'), '12 mois « ok » – l’été')
})

test('every field name exists in the bundled form, of the right kind', async () => {
  const { PDFDocument } = await import('pdf-lib')
  const form = (await PDFDocument.load(readFileSync(new URL('../public/mdph/cerfa-15692-01.pdf', import.meta.url)))).getForm()
  for (const n of [...Object.values(KIND_FIELDS), ...GESTURES.map((g) => GESTURE_FIELDS[g]), ...Object.values(ASK_FIELDS)]) assert.doesNotThrow(() => form.getCheckBox(n!), n)
  for (const n of Object.values(TEXT_FIELDS)) assert.doesNotThrow(() => form.getTextField(n), n)
})
