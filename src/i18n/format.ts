/** Replaces `{{name}}` placeholders in a translation string with values.
 *
 * `{{n:jour|jours}}` picks the singular or plural word for the number in `n`,
 * following the language's rules (French puts 0 in the singular, English
 * doesn't); without a language, English rules apply. */
export function format(template: string, vars: Record<string, string | number>, language = 'en'): string {
  const rules = new Intl.PluralRules(language)
  return template
    .replace(/\{\{(\w+):([^|{}]*)\|([^{}]*)\}\}/g, (_, key: string, one: string, other: string) =>
      rules.select(Number(vars[key])) === 'one' ? one : other
    )
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ''))
}
