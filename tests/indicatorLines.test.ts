// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nightWakingLines, otherIndicatorLines, stiffnessLines } from '../src/lib/indicatorLines.ts'
import { format } from '../src/i18n/format.ts'
import fr from '../src/i18n/locales/fr.ts'
import en from '../src/i18n/locales/en.ts'
import type { DailyEntry } from '../src/db/types.ts'

const day = (date: string, extra: Partial<DailyEntry>): DailyEntry => ({ date, createdAt: 1, updatedAt: 1, ...extra })
const inFr = (t: string, v: Record<string, string | number>) => format(t, v, 'fr')
const inEn = (t: string, v: Record<string, string | number>) => format(t, v, 'en')
const nf = (v: number) => String(v)

test('nothing noted: no line at all, so a card or a block can stay out', () => {
  const entries = [day('2026-10-01', { painLevel: 4 })]
  assert.deepEqual(stiffnessLines(entries, fr.report, inFr, nf), [])
  assert.deepEqual(nightWakingLines(entries, fr.report, inFr, nf), [])
  assert.deepEqual(otherIndicatorLines(entries, fr.report, inFr), [])
})

test('the stiffness reads as one sentence: days noted, the commonest band, the intensity', () => {
  const lines = stiffnessLines(
    [day('2026-10-01', { morningStiffness: 'lt30', morningStiffnessSeverity: 4 }), day('2026-10-02', { morningStiffness: 'lt30' }), day('2026-10-03', { morningStiffness: 'none' })],
    fr.report,
    inFr,
    nf
  )
  assert.deepEqual(lines, ['3 jours notés. Tranche notée le plus souvent : moins de 30 min. Intensité moyenne notée : 4 sur 10, sur 1 jour.'])
})

test('the wakings: days noted, days with at least one, the mean', () => {
  const lines = nightWakingLines([day('2026-10-01', { nightWakings: 2 }), day('2026-10-02', { nightWakings: 0 })], en.report, inEn, nf)
  assert.deepEqual(lines, ['2 days noted, 1 of them with at least one waking. On average 1 per day noted (“3 times or more” counts as 3).'])
})

test('the other indicators: one line each, a "no" counted over the days answered, in the language asked', () => {
  const entries = [
    day('2026-10-01', { jointsFelt: { yes: true, joints: ['leftWrist'] }, bowelPain: true, headache: { today: true, duration: 'lt4h', acuteMed: true, triggers: ['Stress'] } }),
    day('2026-10-02', { jointsFelt: { yes: false }, bowelPain: false, headache: { today: false } }),
  ]
  const lines = otherIndicatorLines(entries, fr.report, inFr)
  assert.ok(lines.includes('Articulations douloureuses ou gonflées, telles que ressenties : 1 jour sur 2 jours notés.'))
  assert.ok(lines.includes('Les plus signalées : poignet gauche (1).'))
  assert.ok(lines.includes('Douleur à la selle : 1 jour sur 2 jours notés.'))
  assert.ok(lines.includes('Mal de tête : 1 jour sur 2 jours notés ; traitement de crise pris 1 jour.'))
  assert.ok(lines.includes('Déclencheurs les plus cités : stress (1).'))
  const english = otherIndicatorLines(entries, en.report, inEn)
  assert.ok(english.includes('Painful or swollen joints, as felt: 1 day out of 2 noted.'))
  assert.ok(english.includes('Most often named: left wrist (1).'))
})

test('the reference points for medication overuse need a source number, and an attack medication noted', () => {
  const withMed = [day('2026-10-01', { headache: { today: true, acuteMed: true } })]
  const withoutMed = [day('2026-10-01', { headache: { today: true } })]
  // No number given (Trends): no sentence, whatever is noted.
  assert.ok(!otherIndicatorLines(withMed, fr.report, inFr).some((l) => l.includes('repère')))
  // A number and a day with a medication: the sentence, citing it, and saying it concludes nothing.
  const line = otherIndicatorLines(withMed, fr.report, inFr, { mohReference: 19 }).find((l) => l.includes('À titre de repère'))
  assert.ok(line?.includes('référence 19') && line.includes('15 jours par mois') && line.includes('10 jours par mois') && line.includes('seul un médecin'))
  // No medication noted: no sentence, even in the report.
  assert.ok(!otherIndicatorLines(withoutMed, fr.report, inFr, { mohReference: 19 }).some((l) => l.includes('repère')))
  assert.ok(otherIndicatorLines(withMed, en.report, inEn, { mohReference: 19 }).some((l) => l.includes('reference 19') && l.includes('only a doctor')))
})
