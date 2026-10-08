import type { DailyEntry, Medication } from '../../db/types'
import { medicationReports, reportPeriods, type MedicationReport } from '../../lib/report'
import { periodOn } from '../../lib/medications'
import { formatPosology } from '../../lib/medicationFormat'
import { usePalette } from '../../hooks/usePalette'
import { format, useLocale, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

/**
 * How each treatment was used over the chosen range: adherence for ongoing
 * ones, days and doses for as-needed ones, reported relief and side effects.
 * On purpose there is no "pain with vs without" for as-needed medications:
 * they're taken on bad days, so the comparison would always read as if they
 * made pain worse. Changes of a background treatment have their own card.
 */
export function MedicationsCard({
  entries,
  medications,
  from,
  to,
}: {
  /** Entries in the chosen range */
  entries: DailyEntry[]
  medications: Medication[]
  from: string
  to: string
}) {
  const t = usePalette()
  const i18n = useTranslation()
  const { intlLocale } = useLocale()
  const reports = medicationReports(entries, medications, reportPeriods(from, to)).filter(
    (m) => m.daysTaken > 0 || m.daysMissed > 0
  )
  if (!reports.length) return null

  const pct = (v: number) => new Intl.NumberFormat(intlLocale, { style: 'percent', maximumFractionDigits: 0 }).format(v)

  return (
    <Card>
      <SectionTitle>{i18n.trends.medicationsTitle}</SectionTitle>
      <p className="text-caption -mt-2 mb-1" style={{ color: t.inkMuted }}>
        {i18n.trends.medicationsCaption}
      </p>
      <div className="flex flex-col">
        {reports.map((m, i) => (
          <MedicationRow
            key={m.med.id}
            report={m}
            logged={entries.length}
            first={i === 0}
            posology={formatPosology(i18n, m.regimen, periodOn(m.med, to) ?? m.med.periods[m.med.periods.length - 1], intlLocale)}
            pct={pct}
          />
        ))}
      </div>
    </Card>
  )
}

function count(n: number, one: string, other: string) {
  return format(n === 1 ? one : other, { n })
}

function MedicationRow({
  report: m,
  logged,
  first,
  posology,
  pct,
}: {
  report: MedicationReport
  logged: number
  first: boolean
  posology: string
  pct: (v: number) => string
}) {
  const t = usePalette()
  const i18n = useTranslation()
  const tr = i18n.trends
  const days = (n: number) => count(n, tr.daysOne, tr.daysOther)

  const scheduled = m.regimen === 'scheduled'
  const total = scheduled ? m.daysTaken + m.daysMissed : logged
  const share = total ? m.daysTaken / total : 0
  const usage = scheduled
    ? format(tr.takenScheduled, { days: days(m.daysTaken), total })
    : m.daysWithoutCount === m.daysTaken
      ? format(tr.takenAsNeeded, { days: days(m.daysTaken), total })
      : format(tr.takenAsNeededWithDoses, {
          days: days(m.daysTaken),
          total,
          doses: count(m.doses, tr.dosesOne, tr.dosesOther),
        })
  const rated = m.relief.reduce((a, b) => a + b, 0)
  const sideEffects = [...m.sideEffects].map(([effect, dates]) => `${effect} (${days(dates.length)})`).join(', ')

  return (
    <div className={first ? 'pb-3' : 'py-3'} style={first ? undefined : { borderTop: `1px solid ${t.hairline}` }}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="font-medium text-control">{m.med.name}</span>
        <span className="text-caption text-right" style={{ color: t.inkMuted }}>
          {[i18n.medications.regimens[m.regimen], posology].filter(Boolean).join(' · ')}
        </span>
      </div>
      {/* The sentence below carries the numbers; the bar is for the eye. */}
      <div className="h-3 rounded-full" style={{ background: t.brandSoft }} aria-hidden>
        <div className="h-3 rounded-full" style={{ width: `${Math.max(share * 100, share ? 4 : 0)}%`, background: t.brand }} />
      </div>
      <p className="text-caption mt-1.5" style={{ color: t.ink }}>
        {usage}
      </p>
      {!scheduled && rated > 0 && (
        <p className="text-caption" style={{ color: t.inkMuted }}>
          {format(tr.reliefShare, { share: pct((m.relief[2] + m.relief[3]) / rated) })}
        </p>
      )}
      {sideEffects && (
        <p className="text-caption" style={{ color: t.inkMuted }}>
          {format(tr.sideEffects, { list: sideEffects })}
        </p>
      )}
    </div>
  )
}
