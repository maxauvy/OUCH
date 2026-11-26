/** Replaces `{{name}}` placeholders in a translation string with values.
 *
 * `{{n:jour|jours}}` picks the singular or plural word for the number in `n`,
 * following the language's rules (French puts 0 in the singular, English
 * doesn't); without a language, English rules apply. A figure already
 * written with a decimal comma counts by its value. */
/** A number, or a figure already written for a language (« 1,5 », « 1 234 »): the plural follows its value. */
const asNumber = (v: string | number | undefined) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/[\s\u00a0\u202f]/g, '').replace(',', '.')))

export function format(template: string, vars: Record<string, string | number>, language = 'en'): string {
  const rules = new Intl.PluralRules(language)
  return template
    .replace(/\{\{(\w+):([^|{}]*)\|([^{}]*)\}\}/g, (_, key: string, one: string, other: string) =>
      rules.select(asNumber(vars[key])) === 'one' ? one : other
    )
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ''))
}
