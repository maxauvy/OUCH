// « Mon formulaire pré-rempli »: what OUCH writes into the official request form (cerfa 15692*01, public/mdph/cerfa-15692-01.pdf), by the
// names of its fields. Pure, so the mapping can be tested without the PDF: `fillCerfa` (in the component) only applies it.
//
// Nothing is ticked that the person did not answer: the box of page 1 is their kind of request, the needs of B2 their own grid (« Souvent » or
// « Parfois »), the requests of part E their own choices. The mobility inclusion card is left to them, since the form asks to pick a mention
// (invalidité or stationnement); so is everything for under-20s, whose part E has other boxes. Address, social security number, resources and
// the signature are never asked for nor written.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { GestureAnswer, MdphGesture, MdphGestures } from './mdph.ts'
import type { MdphAsk, MdphRequestKind } from './mdphParcours.ts'

export const CERFA_FILE = 'mdph/cerfa-15692-01.pdf'

export const KIND_FIELDS: Record<MdphRequestKind, string> = {
  first: 'Première demande à la MDPH',
  changed: 'Ma situation a changé',
  review: 'Réévaluation de ma situation',
  renewal: 'Renouvellement droits identiques',
}

/** The boxes of B2 (pages 6 and 7) for the gestures of « Mon dossier MDPH ». */
export const GESTURE_FIELDS: Record<MdphGesture, string> = {
  hygiene: "Besoin pour l'hygiène corporelle",
  dressing: "Besoin pour s'habiller",
  shopping: 'Besoin pour faire les courses',
  meals: 'Besoin pour préparer les repas',
  eating: 'Besoin pour prendre les repas',
  housework: 'Besoin pour faire le ménage',
  health: 'Besoin pour prendre soin de sa santé',
  moveHome: 'Pour se déplacer dans le domicile',
  goOut: 'Pour sortir du domicile ou y entrer',
  moveOut: "Pour se déplacer à l'extérieur du domicile",
  vehicle: 'Pour utiliser un véhicule',
  transport: 'Pour utiliser les transports en commun',
  leisure: 'Pour avoir des activités sportives',
  social: 'Pour les relations avec les autres',
  family: "Pour s'occuper de sa famille",
}

/** The boxes of part E for adults (pages 17 and 18); the card (`cmi`) is left to the person, who picks its mention. */
export const ASK_FIELDS: Partial<Record<MdphAsk, string>> = {
  aah: 'Vous avez plus de 20 ans Allocations aux adultes handicapés',
  pch: 'Prestation de compensation du handicap',
  rqth: 'RQTH',
  orientation: 'Orientation professionnelle',
}

export const TEXT_FIELDS = {
  lastName: 'Nom de naissance p2',
  firstNames: 'Prénoms p2',
  birthDay: 'DN J p2',
  birthMonth: 'DN M p2',
  birthYear: 'DN A p2',
  footerLastName: 'NOM BAS DE PAGE',
  footerFirstName: 'PRENOM BAS DE PAGE',
  b3: 'Autres renseignements concernant votre vie quotidienne',
  d1: 'Difficultés liées à votre handicap Préciser',
} as const

/** What the person kept in the review, each block on or off. */
export interface FormChoice {
  lastName: string
  firstNames: string
  /** ISO date, when known and kept */
  birthDate?: string
  kind?: MdphRequestKind
  gestures?: MdphGestures
  asks?: MdphAsk[]
  b3?: string
  d1?: string
}

export interface FormFields {
  checks: string[]
  texts: Record<string, string>
}

const NEEDS: readonly GestureAnswer[] = ['often', 'sometimes']

/** The age in whole years on `today`. */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number]
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number]
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}

/** The fields of the form and what goes into them. */
export function formFields(c: FormChoice, today: string): FormFields {
  const checks: string[] = []
  const texts: Record<string, string> = {}
  const last = c.lastName.trim()
  const first = c.firstNames.trim()
  if (last) texts[TEXT_FIELDS.lastName] = texts[TEXT_FIELDS.footerLastName] = last
  if (first) texts[TEXT_FIELDS.firstNames] = texts[TEXT_FIELDS.footerFirstName] = first
  if (c.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(c.birthDate)) {
    const [y, m, d] = c.birthDate.split('-') as [string, string, string]
    texts[TEXT_FIELDS.birthDay] = d
    texts[TEXT_FIELDS.birthMonth] = m
    texts[TEXT_FIELDS.birthYear] = y
  }
  if (c.kind) checks.push(KIND_FIELDS[c.kind])
  for (const [g, a] of Object.entries(c.gestures ?? {}) as [MdphGesture, GestureAnswer][]) if (NEEDS.includes(a)) checks.push(GESTURE_FIELDS[g])
  // Part E for adults only: under 20 the form has other boxes.
  const adult = !c.birthDate || ageOn(c.birthDate, today) >= 20
  if (adult) for (const a of c.asks ?? []) if (ASK_FIELDS[a]) checks.push(ASK_FIELDS[a]!)
  if (c.b3?.trim()) texts[TEXT_FIELDS.b3] = winAnsi(c.b3.trim())
  if (c.d1?.trim()) texts[TEXT_FIELDS.d1] = winAnsi(c.d1.trim())
  for (const k of Object.keys(texts)) texts[k] = winAnsi(texts[k]!)
  return { checks, texts }
}

// The form's fields are drawn in Helvetica, which only knows the Windows-1252 characters: the thin spaces of French typography become plain
// spaces, and anything else it cannot draw is dropped rather than failing the whole form.
const EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
export function winAnsi(text: string): string {
  return text
    .replace(/[     ]/g, ' ')
    .replace(/[‐‑‒]/g, '-')
    .replace(/./gsu, (ch) => {
      const code = ch.codePointAt(0)!
      return code === 10 || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || EXTRA.includes(ch) ? ch : ''
    })
}
