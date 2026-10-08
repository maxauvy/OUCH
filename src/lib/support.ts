// Where "buy me a coffee" leads. A plain outgoing link, nothing loaded from
// there: no script, no widget, no data sent, so the app's promises about
// what leaves the device stay true. While the address is empty the card is
// not shown at all, rather than pointing nowhere.

/** The donation page, e.g. 'https://ko-fi.com/…'. Empty until there is one. */
export const SUPPORT_URL = 'https://ko-fi.com/maxauvy'

/** Its name, as the card says it. */
export const SUPPORT_SERVICE = 'Ko-fi'

/** Days with an entry before the card is shown: someone who has just
 * arrived does not yet know whether OUCH is of use, and is not asked. */
export const SUPPORT_MIN_DAYS = 15

/** `loggedDays` is undefined until the entries have been counted. */
export function showSupport(url: string, loggedDays: number | undefined): boolean {
  return url !== '' && loggedDays !== undefined && loggedDays >= SUPPORT_MIN_DAYS
}
