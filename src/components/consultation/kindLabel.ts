import type { ConsultationKind } from '../../db/types'
import type { Translations } from '../../i18n/types'

/** Who an appointment is with, in a word or two. */
export function kindLabel(kind: ConsultationKind | undefined, t: Pick<Translations['consultation'], 'kindGp' | 'kindCetd' | 'kindKine'>): string {
  return kind === 'cetd' ? t.kindCetd : kind === 'kine' ? t.kindKine : t.kindGp
}
