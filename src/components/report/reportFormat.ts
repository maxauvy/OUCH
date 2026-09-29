import type { DoseUnit, MedicationPeriod, MedicationRegimen } from '../../db/types'
import { format, getTranslations, type Language, type Translations } from '../../i18n'
import { formatPosology, unitWord } from '../../lib/medicationFormat'

const LOCALES: Record<Language, string> = { fr: 'fr-FR', en: 'en-US' }

/** Number, date and posology formatting in the report's own language, which
 * may differ from the app's. */
export interface ReportFormat {
  t: Translations['report']
  all: Translations
  format: typeof format
  /** Fixed number of decimals */
  nf: (v: number, digits?: number) => string
  /** Decimal only when needed (medians of integer scores can end in .5) */
  nfx: (v: number) => string
  pct: (share: number) => string
  /** "+12 %", "−8 %", "±0 %" */
  signedPct: (share: number) => string
  signed: (v: number, digits?: number) => string
  dayMonth: (iso: string) => string
  month: (iso: string) => string
  fullDate: (iso: string) => string
  weekdayDate: (iso: string) => string
  posology: (regimen: MedicationRegimen, period: MedicationPeriod | undefined) => string
  /** The unit agreed with the amount */
  unit: (unit: DoseUnit, amount: number) => string
}

export function reportFormat(language: Language): ReportFormat {
  const all = getTranslations(language)
  const locale = LOCALES[language]
  const date = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { timeZone: 'UTC', ...o })
  const nf = (v: number, digits = 1) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)
  const pct = (share: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(share)
  // The sign follows the value as displayed: 0.02 at one decimal is ±0.0, not +0.0.
  const signed = (v: number, digits = 0) => {
    const shown = Number(v.toFixed(digits))
    return `${shown > 0 ? '+' : shown < 0 ? '−' : '±'}${nf(Math.abs(shown), digits)}`
  }
  return {
    t: all.report,
    all,
    // Plurals in the report's language, which may differ from the app's.
    format: (template, vars) => format(template, vars, language),
    nf,
    nfx: (v) => nf(v, Number.isInteger(v) ? 0 : 1),
    pct,
    signedPct: (share) => `${share > 0 ? '+' : share < 0 ? '−' : '±'}${pct(Math.abs(share))}`,
    signed,
    dayMonth: (iso) => date(iso, { day: 'numeric', month: 'short' }),
    month: (iso) => date(iso, { month: 'short' }),
    fullDate: (iso) => date(iso, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    weekdayDate: (iso) => date(iso, { weekday: 'short', day: 'numeric', month: 'short' }),
    posology: (regimen, period) => formatPosology(all, regimen, period, locale),
    unit: (unit, amount) => unitWord(all, unit, amount, locale),
  }
}
