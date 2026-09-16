import { useMemo, useState } from 'react'
import { useAllEntries } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { Card, SectionTitle } from '../components/ui/Card'
import { PainTrendChart } from '../components/trends/PainTrendChart'
import { FactorAnalysisCard } from '../components/trends/FactorAnalysisCard'
import { analyzeFactor, bestAndWorstWeekday } from '../lib/insights'
import { themeFor } from '../lib/theme'
import { useIsDark } from '../hooks/useIsDark'
import { subDays } from 'date-fns'

const RANGES = [
  { label: '7 j', days: 7 },
  { label: '30 j', days: 30 },
  { label: '90 j', days: 90 },
  { label: 'Tout', days: null as number | null },
]

const FACTOR_DEFS: { key: 'fatigueLevel' | 'sleepQuality' | 'stressLevel' | 'brainFog' | 'moodLevel' | 'activityLevel'; label: string; factorFlag: string; positivePhrasing?: boolean }[] = [
  { key: 'sleepQuality', label: 'Qualité du sommeil', factorFlag: 'sleep', positivePhrasing: true },
  { key: 'stressLevel', label: 'Stress', factorFlag: 'stress' },
  { key: 'fatigueLevel', label: 'Fatigue', factorFlag: 'fatigue' },
  { key: 'brainFog', label: 'Brouillard mental', factorFlag: 'brainFog' },
  { key: 'moodLevel', label: 'Humeur', factorFlag: 'mood', positivePhrasing: true },
  { key: 'activityLevel', label: 'Activité physique', factorFlag: 'activity' },
]

export function TrendsPage() {
  const entries = useAllEntries()
  const settings = useSettings()
  const t = themeFor(useIsDark(settings.theme))
  const [rangeIdx, setRangeIdx] = useState(1)

  const filtered = useMemo(() => {
    if (!entries) return []
    const days = RANGES[rangeIdx].days
    if (days == null) return entries
    const cutoff = subDays(new Date(), days)
    return entries.filter((e) => new Date(e.date + 'T00:00:00') >= cutoff)
  }, [entries, rangeIdx])

  const avgPain = filtered.length ? filtered.reduce((s, e) => s + e.painLevel, 0) / filtered.length : null
  const weekdayInsight = bestAndWorstWeekday(filtered)

  const analyses = FACTOR_DEFS.filter((f) => settings.enabledFactors.includes(f.factorFlag as never)).map((f) =>
    analyzeFactor(filtered, f.key, f.label, { positivePhrasing: f.positivePhrasing })
  )

  if (!entries) return null

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-[22px] font-semibold px-1">Tendances</h1>

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
            Pas encore de données sur cette période.
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
                jour{filtered.length > 1 ? 's' : ''} suivi{filtered.length > 1 ? 's' : ''}
              </span>
            </Card>
            <Card className="flex flex-col items-center py-4">
              <span className="text-[28px] font-bold" style={{ color: t.ink }}>
                {avgPain != null ? avgPain.toFixed(1) : '—'}
              </span>
              <span className="text-[12px]" style={{ color: t.inkMuted }}>
                douleur moyenne
              </span>
            </Card>
          </div>

          <Card>
            <SectionTitle>Évolution de la douleur</SectionTitle>
            <PainTrendChart entries={filtered} />
          </Card>

          {weekdayInsight && (
            <Card>
              <p className="text-[14px] leading-snug">
                🙂 Tes journées sont en moyenne meilleures le <strong>{weekdayInsight.best}</strong>, et plus
                difficiles le <strong>{weekdayInsight.worst}</strong>.
              </p>
            </Card>
          )}

          {analyses.some((a) => a.buckets.some((b) => b.count > 0)) && (
            <Card>
              <SectionTitle>Ce qui semble jouer sur ta douleur</SectionTitle>
              <p className="text-[12px] -mt-2 mb-1" style={{ color: t.inkMuted }}>
                Moyennes observées sur la période — une association, pas une preuve.
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
    </div>
  )
}
