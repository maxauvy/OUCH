// « Ton parcours » in « Mon dossier MDPH »: which parts of the request form (cerfa 15692*01) the person fills in, from three answers, and what
// to attach. The rules are the form's own, nothing more:
// - page 1: a renewal of the same rights because nothing changed needs parts A and E only; otherwise the whole form, to say every need;
// - part E: a request for the AAH, or about work (RQTH, vocational guidance), needs part D too;
// - part C is the school or studies, part F is for the family carer who wishes to write;
// - page 4: what to attach, always; plus the specialists' reports, which the MDPH advises adding to the certificate.
// OUCH never says what someone is entitled to: it says which parts the form asks for.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

export const REQUEST_KINDS = ['first', 'changed', 'review', 'renewal'] as const
export type MdphRequestKind = (typeof REQUEST_KINDS)[number]

/** What can be asked in part E (adults), plus "not sure yet". */
export const ASKS = ['aah', 'rqth', 'orientation', 'cmi', 'pch', 'unsure'] as const
export type MdphAsk = (typeof ASKS)[number]

export const ATTACHMENTS = ['certificate', 'reports', 'identity', 'address', 'protection'] as const
export type MdphAttachment = (typeof ATTACHMENTS)[number]

export interface MdphParcours {
  kind?: MdphRequestKind
  asks?: MdphAsk[]
  /** The person is at school or studying: part C. */
  studying?: boolean
  /** What the person ticked as ready to attach. */
  attached?: MdphAttachment[]
}

export const PARTS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export type MdphPart = (typeof PARTS)[number]

/** The pages of each part in the request form. */
export const PART_PAGES: Record<MdphPart, [number, number]> = { A: [1, 4], B: [5, 8], C: [9, 12], D: [13, 16], E: [17, 18], F: [19, 20] }

/** Why a part is there or not, for the sentence under it. */
export type PartReason =
  | 'always'
  | 'needs'
  | 'renewalSkip'
  | 'studying'
  | 'notStudying'
  | 'askWork'
  | 'askAah'
  | 'workMaybe'
  | 'carer'

export interface PartLine {
  part: MdphPart
  fill: 'yes' | 'maybe' | 'no'
  reason: PartReason
  /** OUCH has cards for some boxes of this part */
  helped: string[]
}

const WORK_ASKS: readonly MdphAsk[] = ['rqth', 'orientation']

/** The parts of the form, in its order, and whether to fill each one; null until the kind of request is answered. */
export function parcoursParts(p: MdphParcours | undefined): PartLine[] | null {
  if (!p?.kind) return null
  const asks = p.asks ?? []
  const renewal = p.kind === 'renewal'
  const lines: PartLine[] = [{ part: 'A', fill: 'yes', reason: 'always', helped: [] }]
  lines.push(renewal ? { part: 'B', fill: 'no', reason: 'renewalSkip', helped: [] } : { part: 'B', fill: 'yes', reason: 'needs', helped: ['B2', 'B3'] })
  if (renewal) lines.push({ part: 'C', fill: 'no', reason: 'renewalSkip', helped: [] })
  else lines.push(p.studying ? { part: 'C', fill: 'yes', reason: 'studying', helped: [] } : { part: 'C', fill: 'no', reason: 'notStudying', helped: [] })
  if (renewal) lines.push({ part: 'D', fill: 'no', reason: 'renewalSkip', helped: [] })
  else if (asks.includes('aah')) lines.push({ part: 'D', fill: 'yes', reason: 'askAah', helped: ['D1'] })
  else if (asks.some((a) => WORK_ASKS.includes(a))) lines.push({ part: 'D', fill: 'yes', reason: 'askWork', helped: ['D1'] })
  else lines.push({ part: 'D', fill: 'maybe', reason: 'workMaybe', helped: ['D1'] })
  lines.push({ part: 'E', fill: 'yes', reason: 'always', helped: [] })
  lines.push({ part: 'F', fill: 'maybe', reason: 'carer', helped: [] })
  return lines
}

/** The answers as stored, kept only when they are known values (also for a restored backup). */
export function cleanParcours(raw: unknown): MdphParcours | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const r = raw as Record<string, unknown>
  const pick = <T extends string>(list: readonly T[], v: unknown): T[] => (Array.isArray(v) ? list.filter((x) => v.includes(x)) : [])
  const out: MdphParcours = {}
  if ((REQUEST_KINDS as readonly unknown[]).includes(r.kind)) out.kind = r.kind as MdphRequestKind
  const asks = pick(ASKS, r.asks)
  if (asks.length) out.asks = asks
  if (r.studying === true) out.studying = true
  const attached = pick(ATTACHMENTS, r.attached)
  if (attached.length) out.attached = attached
  return Object.keys(out).length ? out : undefined
}

/** "Not sure yet" stands alone: choosing it clears the rest, and choosing anything else clears it. */
export function toggleAsk(asks: readonly MdphAsk[] | undefined, ask: MdphAsk): MdphAsk[] {
  const now = asks ?? []
  if (now.includes(ask)) return now.filter((a) => a !== ask)
  if (ask === 'unsure') return ['unsure']
  return ASKS.filter((a) => a !== 'unsure' && (a === ask || now.includes(a)))
}
