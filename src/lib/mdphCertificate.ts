// The medical certificate (cerfa 15695*01, public/mdph/cerfa-15695-01.pdf): OUCH writes only the box of page 1 that the form gives to the
// patient (« Merci d'aider votre médecin en remplissant les éléments ci-dessous »). The rest is the doctor's statement, which they fill in and
// sign: OUCH prepares a separate page of notes for them, never writes in their parts.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import { GESTURES, type MdphGestures, type MdphMonth } from './mdph.ts'
import type { MdphAsk } from './mdphParcours.ts'
import { winAnsi } from './mdphForm.ts'

export const CERT_FILE = 'mdph/cerfa-15695-01.pdf'

export const CERT_FIELDS = {
  lastName: 'nom de naissance',
  firstNames: 'préno',
  birthDate: 'date naissanc',
  dossier: 'numéro dossier MDPH',
  needs: 'Principaux Besoins',
} as const

/** The box is three short lines: a longer text is cut by the form, so the proposal stays under this. */
export const NEEDS_MAX = 300

export interface CertificateChoice {
  lastName: string
  firstNames: string
  birthDate?: string
  dossier?: string
  needs?: string
}

/** The fields of page 1 and what goes into them; nothing typed, nothing written. */
export function certificateFields(c: CertificateChoice): Record<string, string> {
  const out: Record<string, string> = {}
  const put = (field: string, value: string | undefined) => {
    const v = winAnsi((value ?? '').trim())
    if (v) out[field] = v
  }
  put(CERT_FIELDS.lastName, c.lastName)
  put(CERT_FIELDS.firstNames, c.firstNames)
  if (c.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(c.birthDate)) {
    const [y, m, d] = c.birthDate.split('-')
    put(CERT_FIELDS.birthDate, `${d}/${m}/${y}`)
  }
  put(CERT_FIELDS.dossier, c.dossier)
  put(CERT_FIELDS.needs, c.needs)
  return out
}

/** The words the sentence needs, in French: the certificate is French whatever the app's language. */
export interface NeedsWords {
  asks: Record<MdphAsk, string>
  gestures: Record<(typeof GESTURES)[number], string>
}

/**
 * The proposal for « Quels sont les principaux besoins et attentes exprimés dans votre demande à la MDPH ? », from the person's own answers:
 * what they ask for (« Ton parcours ») and the gestures of B2 they answered « Souvent », then « Parcfois » if there is room. To be changed freely.
 */
export function needsSentence(asks: readonly MdphAsk[] | undefined, gestures: MdphGestures | undefined, w: NeedsWords): string {
  const list = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`)
  const lower = (s: string) => s.charAt(0).toLocaleLowerCase('fr') + s.slice(1)
  const asked = (asks ?? []).filter((a) => a !== 'unsure').map((a) => w.asks[a])
  const often = GESTURES.filter((g) => gestures?.[g] === 'often').map((g) => lower(w.gestures[g]))
  const sometimes = GESTURES.filter((g) => gestures?.[g] === 'sometimes').map((g) => lower(w.gestures[g]))
  const parts: string[] = []
  if (asked.length) parts.push(`Je demande : ${list(asked)}.`)
  // Gestures hold commas (« se laver, aller aux toilettes »): a semicolon keeps them apart.
  if (often.length) parts.push(`Ma douleur me gêne souvent pour : ${often.join(' ; ')}.`)
  const withSometimes = sometimes.length ? [...parts, `Parfois pour : ${sometimes.join(' ; ')}.`] : parts
  return (withSometimes.join(' ').length <= NEEDS_MAX ? withSometimes : parts).join(' ')
}

/** The months of the period sorted as the certificate asks (part 3, « fréquence »): more than 15 days of flare, 15 or fewer, none. */
export function frequencyClasses(months: readonly MdphMonth[]): { over15: number; upTo15: number; none: number } {
  return {
    over15: months.filter((m) => m.flareDays > 15).length,
    upTo15: months.filter((m) => m.flareDays > 0 && m.flareDays <= 15).length,
    none: months.filter((m) => m.flareDays === 0).length,
  }
}
