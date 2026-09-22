import { useMemo, useState } from 'react'
import { useAllEntries } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { Card, SectionTitle } from '../components/ui/Card'
import { Footer } from '../components/layout/Footer'
import { PainTrendChart } from '../components/trends/PainTrendChart'
import { FactorAnalysisCard } from '../components/trends/FactorAnalysisCard'
import { analyzeFactor, analyzeTagPresence, bestAndWorstWeekday } from '../lib/insights'
import { themeFor } from '../lib/theme'
import { useIsDark } from '../hooks/useIsDark'
import { subDays } from 'date-fns'
import { format, useTranslation, type Translations } from '../i18n'
import type { DailyEntry, Settings } from '../db/types'

const FACTOR_DEFS: {
  key: string
  getValue: (e: DailyEntry) => number | null | undefined
  label: (i18n: Translations) => string
  positivePhrasing?: boolean
  bucketing?: 'fixed' | 'terciles'
  /** Which settings toggle gates this factor; defaults to matching enabledFactors by key. */
  isEnabled: (settings: Settings) => boolean
}[] = [
  { key: 'sleepQuality', getValue: (e) => e.sleepQuality, label: (i18n) => i18n.factors.sleep.label, positivePhrasing: true, isEnabled: (s) => s.enabledFactors.includes('sleep') },
  { key: 'stressLevel', getValue: (e) => e.stressLevel, label: (i18n) => i18n.factors.stress.label, isEnabled: (s) => s.enabledFactors.includes('stress') },
  { key: 'fatigueLevel', getValue: (e) => e.fatigueLevel, label: (i18n) => i18n.factors.fatigue.label, isEnabled: (s) => s.enabledFactors.includes('fatigue') },
  { key: 'brainFog', getValue: (e) => e.brainFog, label: (i18n) => i18n.factors.brainFog.label, isEnabled: (s) => s.enabledFactors.includes('brainFog') },
  { key: 'moodLevel', getValue: (e) => e.moodLevel, label: (i18n) => i18n.factors.mood.label, positivePhrasing: true, isEnabled: (s) => s.enabledFactors.includes('mood') },
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
  const t = themeFor(useIsDark(settings.theme))
  const [rangeIdx, setRangeIdx] = useState(1)

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
      positivePhrasing: f.positivePhrasing,
      bucketing: f.bucketing,
    })
  )

  const positiveActionAnalyses = settings.enabledFactors.includes('positiveActions')
    ? analyzeTagPresence(filtered, (e) => e.positiveActions, [i18n.trends.bucketWithout, i18n.trends.bucketWith])
    : []

  if (!entries) return null

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-[22px] font-semibold px-1">{i18n.trends.title}</h1>

      <div className="flex gap-2 px-1">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRangeIdx(i)}
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
            style={{
              background: i === rangeIdx ? t.brand : t.brandSoft,
              color: i === rangeIdx ? 'white' : t.brand,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-[14px] text-center py-4" style={{ color: t.inkMuted }}>
            {i18n.trends.noData}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="flex flex-col items-center py-4">
              <span className="text-[28px] font-bold" style={{ color: t.ink }}>
                {filtered.length}
              </span>
              <span className="text-[12px]" style={{ color: t.inkMuted }}>
                {format(filtered.length === 1 ? i18n.trends.daysTrackedOne : i18n.trends.daysTrackedOther, {
                  n: filtered.length,
                })}
              </span>
            </Card>
            <Card className="flex flex-col items-center py-4">
              <span className="text-[28px] font-bold" style={{ color: t.ink }}>
                {avgPain != null ? avgPain.toFixed(1) : '—'}
              </span>
              <span className="text-[12px]" style={{ color: t.inkMuted }}>
                {i18n.trends.avgPain}
              </span>
            </Card>
          </div>

          <Card>
            <SectionTitle>{i18n.trends.painEvolution}</SectionTitle>
            <PainTrendChart entries={filtered} />
          </Card>

          {weekdayInsight && (
            <Card>
              <p className="text-[14px] leading-snug">
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
              <p className="text-[12px] -mt-2 mb-1" style={{ color: t.inkMuted }}>
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
              <p className="text-[12px] -mt-2 mb-1" style={{ color: t.inkMuted }}>
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
