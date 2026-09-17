/** Replaces `{{name}}` placeholders in a translation string with values. */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ''))
}
