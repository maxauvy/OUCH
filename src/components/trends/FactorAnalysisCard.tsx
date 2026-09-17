import type { FactorAnalysis } from '../../lib/insights'
import { colorForPainValue } from '../../lib/painWeather'
import { themeFor } from '../../lib/theme'
import { useSettings } from '../../hooks/useSettings'
import { useIsDark } from '../../hooks/useIsDark'
import { format, useTranslation } from '../../i18n'

export function FactorAnalysisCard({ analysis }: { analysis: FactorAnalysis }) {
  const settings = useSettings()
  const t = themeFor(useIsDark(settings.theme))
  const i18n = useTranslation()
  const hasData = analysis.buckets.some((b) => b.count > 0)
  if (!hasData) return null

  const maxAvg = Math.max(...analysis.buckets.map((b) => b.avgPain ?? 0), 1)
  const insightText = analysis.insight
    ? format(
        analysis.insight.painHigherWhenFactorHigh ? i18n.trends.insightHigher : i18n.trends.insightLower,
        {
          label: analysis.label.toLowerCase(),
          diff: analysis.insight.diffAbs.toFixed(1),
          points: analysis.insight.diffAbs >= 2 ? i18n.trends.pointPlural : i18n.trends.pointSingular,
        }
      )
    : null

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-medium text-[14px]">{analysis.label}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {analysis.buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-2.5">
            <span className="text-[12px] w-14 shrink-0" style={{ color: t.inkMuted }}>
              {b.label}
            </span>
            <div className="flex-1 h-3 rounded-full" style={{ background: t.brandSoft }}>
              {b.avgPain != null && (
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${Math.max((b.avgPain / maxAvg) * 100, 6)}%`,
                    background: colorForPainValue(b.avgPain),
                  }}
                />
              )}
            </div>
            <span className="text-[12px] tabular-nums w-16 text-right shrink-0" style={{ color: t.inkMuted }}>
              {b.avgPain != null ? `${b.avgPain.toFixed(1)}/10` : `n=${b.count}`}
            </span>
          </div>
        ))}
      </div>
      {insightText && (
        <p className="text-[13px] mt-2.5 leading-snug" style={{ color: t.ink }}>
          💡 {insightText}
        </p>
      )}
    </div>
  )
}
