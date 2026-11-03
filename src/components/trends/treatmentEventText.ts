import type { TreatmentEvent } from '../../lib/treatmentEvents'
import { formatPosology } from '../../lib/medicationFormat'
import { format, type Language, type useTranslation } from '../../i18n'

/** One line for a start, a dose change or a stop of a treatment ("Début de X", "X : nouvelle dose…"). */
export function treatmentEventText(event: TreatmentEvent, i18n: ReturnType<typeof useTranslation>, language: Language, intlLocale: string): string {
  const { med, kind, period } = event
  const t = i18n.trends
  return kind === 'started'
    ? format(t.timelineStarted, { name: med.name }, language)
    : kind === 'stopped'
      ? format(t.timelineStopped, { name: med.name }, language)
      : format(t.timelineDose, { name: med.name, dose: formatPosology(i18n, med.regimen, period, intlLocale) }, language)
}
