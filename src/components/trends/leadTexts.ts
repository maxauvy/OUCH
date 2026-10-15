import { format, type Translations } from '../../i18n'
import { actionInSentence, type Lead } from '../../lib/leads'

export type LeadTexts = { title: string; high: string; low: string; note: string }

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The words around a lead, in the app's language: its title, what each of the two numbers is about, and what the lead does not say. */
export function leadTexts(lead: Lead, t: Translations['trends']): LeadTexts {
  const action = actionInSentence(lead.action ?? '')
  switch (lead.kind) {
    case 'sleep':
      return { title: t.leadTitleSleep, high: t.leadSleepHigh, low: t.leadSleepLow, note: t.leadNoteSleep }
    case 'stress':
      return { title: t.leadTitleStress, high: t.leadStressHigh, low: t.leadStressLow, note: t.leadNoteStress }
    case 'activity':
      return { title: t.leadTitleActivity, high: t.leadActivityHigh, low: t.leadActivityLow, note: t.leadNoteActivity }
    case 'action':
      return {
        title: format(t.leadTitleAction, { action }),
        high: format(t.leadActionHigh, { action }),
        low: t.leadActionLow,
        note: t.leadNoteAction,
      }
  }
}

/** "After your best nights, your pain is on average 2.1 points lower." */
export function leadSentence(lead: Lead, t: Translations['trends'], nf: Intl.NumberFormat, language: string): string {
  const gap = Math.abs(lead.gap)
  return format(
    lead.gap < 0 ? t.leadSentenceLower : t.leadSentenceHigher,
    // The plural follows the number as shown: 1.97 reads "2,0", so "points".
    { when: capitalise(leadTexts(lead, t).high), gap: nf.format(gap), n: Math.round(gap * 10) / 10 },
    language
  )
}
