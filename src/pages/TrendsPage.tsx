import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { IconChevronRight, IconFileText } from '@tabler/icons-react'
import { useAllEntries } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { Card, SectionTitle } from '../components/ui/Card'
import { Footer } from '../components/layout/Footer'
import { PainTrendChart, type ChartMarker } from '../components/trends/PainTrendChart'
import { MedicationsCard } from '../components/trends/MedicationsCard'
import { FlaresCard } from '../components/trends/FlaresCard'
import { TreatmentReviewCard } from '../components/trends/TreatmentReviewCard'
import { useFlares } from '../hooks/useFlares'
import { flareDayCount, flaresOverlapping } from '../lib/flares'
import { useMedications } from '../hooks/useMedications'
import { todayISO } from '../db'
import { formatPosology } from '../lib/medicationFormat'
import { FactorAnalysisCard } from '../components/trends/FactorAnalysisCard'
import { DoctorReportPage } from './DoctorReportPage'
import { analyzeFactor, analyzeTagPresence, bestAndWorstWeekday } from '../lib/insights'
import { usePalette } from '../hooks/usePalette'
import { subDays } from 'date-fns'
import { format, useLocale, useTranslation, type Translations } from '../i18n'
import { shiftISO } from '../lib/medications'
import type { DailyEntry, Settings } from '../db/types'

const FACTOR_DEFS: {
  key: string
  getValue: (e: DailyEntry) => number | null | undefined
  label: (i18n: Translations) => string
  bucketing?: 'fixed' | 'terciles'
  /** Which settings toggle gates this factor; defaults to matching enabledFactors by key. */
  isEnabled: (settings: Settings) => boolean
}[] = [
  { key: 'sleepQuality', getValue: (e) => e.sleepQuality, label: (i18n) => i18n.factors.sleep.label, isEnabled: (s) => s.enabledFactors.includes('sleep') },
  { key: 'stressLevel', getValue: (e) => e.stressLevel, label: (i18n) => i18n.factors.stress.label, isEnabled: (s) => s.enabledFactors.includes('stress') },
  { key: 'fatigueLevel', getValue: (e) => e.fatigueLevel, label: (i18n) => i18n.factors.fatigue.label, isEnabled: (s) => s.enabledFactors.includes('fatigue') },
  { key: 'brainFog', getValue: (e) => e.brainFog, label: (i18n) => i18n.factors.brainFog.label, isEnabled: (s) => s.enabledFactors.includes('brainFog') },
  { key: 'moodLevel', getValue: (e) => e.moodLevel, label: (i18n) => i18n.factors.mood.label, isEnabled: (s) => s.enabledFactors.includes('mood') },
  { key: 'activityLevel', getValue: (e) => e.activityLevel, label: (i18n) => i18n.factors.activity.label, isEnabled: (s) => s.enabledFactors.includes('activity') },
  {
    key: 'tempC',
    getValue: (e) => e.weather?.tempC,
    label: (i18n) => i18n.trends.temperatureLabel,
    bucketing: 'terciles',
    isEnabled: (s) => s.enabledFactors.includes('weather'),
  },
]

export function TrendsPage() {
  const entries = useAllEntries()
  const settings = useSettings()
  const i18n = useTranslation()
  const t = usePalette()
  const [rangeIdx, setRangeIdx] = useState(1)
  const medications = useMedications()
  const flares = useFlares()
  const { intlLocale } = useLocale()
  const [reporting, setReporting] = useState(false)
  const reportIds = useId()
  const reportButtonRef = useRef<HTMLButtonElement>(null)
  const returningFromReport = useRef(false)

  // Coming back from the report: focus returns to the button that opened it.
  useEffect(() => {
    if (reporting || !returningFromReport.current) return
    returningFromReport.current = false
    reportButtonRef.current?.focus()
  }, [reporting])

  const RANGES = [
    { label: i18n.trends.range7, days: 7 },
    { label: i18n.trends.range30, days: 30 },
    { label: i18n.trends.range90, days: 90 },
    { label: i18n.trends.rangeAll, days: null as number | null },
  ]

  const filtered = useMemo(() => {
    if (!entries) return []
    const days = RANGES[rangeIdx].days
    if (days == null) return entries
    const cutoff = subDays(new Date(), days)
    return entries.filter((e) => new Date(e.date + 'T00:00:00') >= cutoff)
  }, [entries, rangeIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const avgPain = filtered.length ? filtered.reduce((s, e) => s + e.painLevel, 0) / filtered.length : null
  const weekdayIndices = bestAndWorstWeekday(filtered)
  const weekdayInsight = weekdayIndices
    ? { best: i18n.weekdaysFull[weekdayIndices.bestIdx], worst: i18n.weekdaysFull[weekdayIndices.worstIdx] }
    : null

  const bucketLabels: [string, string, string] = [i18n.trends.bucketLow, i18n.trends.bucketMid, i18n.trends.bucketHigh]
  const analyses = FACTOR_DEFS.filter((f) => f.isEnabled(settings)).map((f) =>
    analyzeFactor(filtered, f.getValue, f.key, f.label(i18n), bucketLabels, {
      bucketing: f.bucketing,
    })
  )

  // The range as dates, for medication periods (the entry filter above works
  // on timestamps). "All" starts at the first logged day.
  const today = todayISO()
  const rangeDays = RANGES[rangeIdx].days
  const rangeFrom = rangeDays == null ? (entries?.at(-1)?.date ?? today) : shiftISO(today, -rangeDays)
  const medicationsTracked = settings.enabledFactors.includes('medications')
  const doseMarkers: ChartMarker[] = medicationsTracked
    ? (medications ?? []).flatMap((m) =>
        m.regimen !== 'scheduled'
          ? []
          : m.periods.flatMap((p, i) =>
              i > 0 && p.start >= rangeFrom && p.start <= today
                ? [{ date: p.start, label: format(i18n.trends.posologyChangeMarker, { name: m.name, dose: formatPosology(i18n, m.regimen, p, intlLocale) }) }]
                : []
            )
      )
    : []

  const positiveActionAnalyses = settings.enabledFactors.includes('positiveActions')
    ? analyzeTagPresence(filtered, (e) => e.positiveActions, [i18n.trends.bucketWithout, i18n.trends.bucketWith])
    : []

  if (reporting) {
    return (
      <DoctorReportPage
        onBack={() => {
          returningFromReport.current = true
          setReporting(false)
        }}
      />
    )
  }

  if (!entries) return null

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-title font-semibold px-1">{i18n.trends.title}</h1>

      {entries.length > 0 && (
        <button
          ref={reportButtonRef}
          type="button"
          onClick={() => setReporting(true)}
          aria-labelledby={`${reportIds}-title`}
          aria-describedby={`${reportIds}-help`}
          className="text-left rounded-[var(--radius-card)] p-4 flex items-center gap-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', boxShadow: 'var(--card-shadow)' }}
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
            aria-hidden
          >
            <IconFileText size={22} />
          </span>
          <span className="flex-1">
            <span id={`${reportIds}-title`} className="block text-body font-semibold">
              {i18n.doctorReport.entryTitle}
            </span>
            <span id={`${reportIds}-help`} className="block text-caption" style={{ color: t.inkMuted }}>
              {i18n.doctorReport.entryHelper}
            </span>
          </span>
          <IconChevronRight size={20} aria-hidden style={{ color: t.inkMuted }} />
        </button>
      )}

      <div className="flex gap-2 px-1">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRangeIdx(i)}
            className="rounded-[var(--radius-control)] px-3.5 py-1.5 text-caption font-semibold"
            style={{
              background: i === rangeIdx ? t.brand : t.brandSoft,
              color: i === rangeIdx ? 'var(--color-on-brand)' : t.brand,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-control text-center py-4" style={{ color: t.inkMuted }}>
            {i18n.trends.noData}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="flex flex-col items-center py-4">
              <span className="text-display font-bold" style={{ color: t.ink }}>
                {filtered.length}
              </span>
              <span className="text-caption" style={{ color: t.inkMuted }}>
                {filtered.length === 1 ? i18n.trends.daysTrackedOne : i18n.trends.daysTrackedOther}
              </span>
            </Card>
            <Card className="flex flex-col items-center py-4">
              <span className="text-display font-bold" style={{ color: t.ink }}>
                {avgPain != null ? avgPain.toFixed(1) : '—'}
              </span>
              <span className="text-caption" style={{ color: t.inkMuted }}>
                {i18n.trends.avgPain}
              </span>
            </Card>
          </div>

          <Card>
            <SectionTitle>{i18n.trends.painEvolution}</SectionTitle>
            <PainTrendChart
              entries={entries ?? []}
              from={rangeFrom}
              to={today}
              markers={doseMarkers}
              flares={flares?.episodes}
              showMean={rangeDays !== 7}
            />
          </Card>

          {flares?.detectable && (
            <FlaresCard
              episodes={flaresOverlapping(flares.episodes, rangeFrom, today)}
              days={flareDayCount(flares.episodes, rangeFrom, today)}
            />
          )}

          {medicationsTracked && medications && (
            <>
              <MedicationsCard entries={filtered} medications={medications} from={rangeFrom} to={today} />
              <TreatmentReviewCard entries={entries} medications={medications} episodes={flares?.detectable ? flares.episodes : null} today={today} />
            </>
          )}

          {weekdayInsight && (
            <Card>
              <p className="text-control leading-snug">
                {format(i18n.trends.weekdayInsight, {
                  best: weekdayInsight.best,
                  worst: weekdayInsight.worst,
                })}
              </p>
            </Card>
          )}

          {analyses.some((a) => a.buckets.some((b) => b.count > 0)) && (
            <Card>
              <SectionTitle>{i18n.trends.whatAffectsPain}</SectionTitle>
              <p className="text-caption -mt-2 mb-1" style={{ color: t.inkMuted }}>
                {i18n.trends.averagesObserved}
              </p>
              <div className="flex flex-col">
                {analyses.map((a, i) => (
                  <div key={a.key} style={i > 0 ? { borderTop: `1px solid ${t.hairline}` } : undefined}>
                    <FactorAnalysisCard analysis={a} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {positiveActionAnalyses.length > 0 && (
            <Card>
              <SectionTitle>{i18n.trends.whatHelps}</SectionTitle>
              <p className="text-caption -mt-2 mb-1" style={{ color: t.inkMuted }}>
                {i18n.trends.averagesObserved}
              </p>
              <div className="flex flex-col">
                {positiveActionAnalyses.map((a, i) => (
                  <div key={a.key} style={i > 0 ? { borderTop: `1px solid ${t.hairline}` } : undefined}>
                    <FactorAnalysisCard
                      analysis={a}
                      insightHigherText={i18n.trends.insightTagHigher}
                      insightLowerText={i18n.trends.insightTagLower}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
      <Footer />
    </div>
  )
}
