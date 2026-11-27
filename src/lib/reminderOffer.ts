// The daily reminder is no longer asked at the first opening (a step fewer before the first entry): it is offered once in « Pour toi »,
// once two days are noted and the person has seen what a day asks. Only to someone new to OUCH (up to two weeks of days noted): a person
// who has gone longer without one has made their choice, and the reminder stays in Settings for them.
//
// Pure, so plain Node can test it.

/** The offer comes from this many days noted… */
export const OFFER_FROM_DAYS = 2
/** …and no longer after this many. */
export const OFFER_UNTIL_DAYS = 14

/** Whether « Un petit rappel ? » is due: no reminder set (neither in the app nor in the calendar), and between 2 and 14 days noted. */
export function reminderOfferDue(input: { loggedDays: number; reminderEnabled: boolean; agendaReminder: boolean }): boolean {
  const { loggedDays, reminderEnabled, agendaReminder } = input
  return !reminderEnabled && !agendaReminder && loggedDays >= OFFER_FROM_DAYS && loggedDays <= OFFER_UNTIL_DAYS
}
