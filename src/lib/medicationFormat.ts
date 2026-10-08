import type { Dose, DoseUnit, MedicationPeriod, MedicationRegimen } from '../db/types'
import { format, type Translations } from '../i18n'

/** The unit agreed with the amount: "1 goutte", "2 gouttes", "0,5 goutte". */
export function unitWord(t: Translations, unit: DoseUnit, amount: number, intlLocale: string): string {
  const [one, other] = t.medications.unitWords[unit]
  return new Intl.PluralRules(intlLocale).select(amount) === 'one' ? one : other
}

export function formatDose(t: Translations, dose: Dose, intlLocale: string): string {
  return `${new Intl.NumberFormat(intlLocale).format(dose.amount)} ${unitWord(t, dose.unit, dose.amount, intlLocale)}`
}

/** "60 mg · 1/day", "1 g · max 3/day", or '' when nothing is described. */
export function formatPosology(
  t: Translations,
  regimen: MedicationRegimen,
  period: MedicationPeriod | undefined,
  intlLocale: string
): string {
  if (!period || regimen === 'unspecified') return ''
  const parts: string[] = []
  if (period.dose) parts.push(formatDose(t, period.dose, intlLocale))
  if (period.perDay) {
    const tpl = regimen === 'asNeeded' ? t.medications.maxPerDayShort : t.medications.perDayShort
    parts.push(format(tpl, { n: period.perDay }))
  }
  return parts.join(' · ')
}

/** What a dose change goes from and to: the doses when they differ, else the
 * whole posology ("1/day" → "2/day"), so nothing reads "30 mg · 1/day →
 * 60 mg · 1/day". */
export function posologyChange(
  t: Translations,
  regimen: MedicationRegimen,
  previous: MedicationPeriod | undefined,
  current: MedicationPeriod,
  intlLocale: string
): [from: string, to: string] {
  const whole = (p: MedicationPeriod | undefined) => formatPosology(t, regimen, p, intlLocale) || '?'
  if (previous?.dose && current.dose && formatDose(t, previous.dose, intlLocale) !== formatDose(t, current.dose, intlLocale)) {
    return [formatDose(t, previous.dose, intlLocale), formatDose(t, current.dose, intlLocale)]
  }
  return [whole(previous), whole(current)]
}

export function formatISODate(iso: string, intlLocale: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' })
}
