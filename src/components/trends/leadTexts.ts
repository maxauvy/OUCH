import { format, type Translations } from '../../i18n'
import { actionInSentence, type Lead } from '../../lib/leads'

type LeadTexts = { title: string; high: string; low: string; note: string }

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
        note: lead.gap > 0 ? t.leadNoteActionHigher : t.leadNoteAction,
      }
  }
}

/** "After your best nights, your pain is on average 2.1 points lower." An
 * action on the harder days reads as what is seen, not as an effect: the
 * person turns to it because they hurt, not the other way round. */
export function leadSentence(
  lead: Lead,
  t: Translations['trends'],
  nf: Intl.NumberFormat,
  language: string,
  /** The day's page carries the reserve in the card itself; Trends has its own line below */
  place: 'day' | 'trends' = 'trends'
): string {
  const gap = Math.abs(lead.gap)
  // The plural follows the number as shown: 1.97 reads "2,0", so "points".
  const numbers = { gap: nf.format(gap), n: Math.round(gap * 10) / 10 }
  if (lead.kind === 'action' && lead.gap > 0) {
    const sentence = place === 'day' ? t.leadActionSentenceHigherDay : t.leadActionSentenceHigher
    return format(sentence, { ...numbers, action: actionInSentence(lead.action ?? '') }, language)
  }
  return format(lead.gap < 0 ? t.leadSentenceLower : t.leadSentenceHigher, { when: capitalise(leadTexts(lead, t).high), ...numbers }, language)
}

/** What an action that goes with a lower pain does not say, on the day's page. */
export function leadDayNote(lead: Lead, t: Translations['trends']): string | null {
  return lead.kind === 'action' && lead.gap < 0 ? t.leadActionLowerDayNote : null
}
