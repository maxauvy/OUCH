import { useMemo, useState } from 'react'
import { useAllEntries } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { Card, SectionTitle } from '../components/ui/Card'
import { Footer } from '../components/layout/Footer'
import { PainTrendChart } from '../components/trends/PainTrendChart'
import { FactorAnalysisCard } from '../components/trends/FactorAnalysisCard'
import { analyzeFactor, bestAndWorstWeekday } from '../lib/insights'
import { themeFor } from '../lib/theme'
import { useIsDark } from '../hooks/useIsDark'
import { subDays } from 'date-fns'
import { format, useTranslation } from '../i18n'

const FACTOR_DEFS: { key: 'fatigueLevel' | 'sleepQuality' | 'stressLevel' | 'brainFog' | 'moodLevel' | 'activityLevel'; factorKey: 'sleep' | 'stress' | 'fatigue' | 'brainFog' | 'mood' | 'activity'; positivePhrasing?: boolean }[] = [
  { key: 'sleepQuality', factorKey: 'sleep', positivePhrasing: true },
  { key: 'stressLevel', factorKey: 'stress' },
  { key: 'fatigueLevel', factorKey: 'fatigue' },
  { key: 'brainFog', factorKey: 'brainFog' },
  { key: 'moodLevel', factorKey: 'mood', positivePhrasing: true },
  { key: 'activityLevel', factorKey: 'activity' },
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
  const analyses = FACTOR_DEFS.filter((f) => settings.enabledFactors.includes(f.factorKey)).map((f) =>
    analyzeFactor(filtered, f.key, i18n.factors[f.factorKey].label, bucketLabels, { positivePhrasing: f.positivePhrasing })
  )

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
        </>
      )}
      <Footer />
    </div>
  )
}
