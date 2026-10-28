import { updateSettings } from '../../db'
import type { FactorKey, Settings } from '../../db/types'
import { detailsOf, offeredFactors, planForIllnesses, withoutDetails, type IndicatorKey } from '../../lib/indicatorCatalog'
import { useTranslation } from '../../i18n'
import { Toggle } from '../ui/Toggle'

/** What a person follows, listed in the order their illnesses suggest: first
 * what is often followed with them, then what may also help, then everything
 * else, folded. It only orders and highlights: no switch moves by itself, and
 * nothing is out of reach. With no illness declared, a plain list, as before. */
export function IndicatorPicker({ settings, earlyAccess }: { settings: Settings; earlyAccess: boolean }) {
  const t = useTranslation()
  const offered = offeredFactors(earlyAccess)

  const plan = settings.illnesses.length > 0 ? planForIllnesses(settings.illnesses, { earlyAccess }) : null
  const recommended = plan ? withoutDetails(plan.recommended) : []
  const suggested = plan ? withoutDetails(plan.suggested) : []
  const others = plan ? withoutDetails(plan.others) : withoutDetails(offered)

  function toggle(key: IndicatorKey) {
    const factor = key as FactorKey
    const on = settings.enabledFactors.includes(factor)
    void updateSettings({ enabledFactors: on ? settings.enabledFactors.filter((k) => k !== factor) : [...settings.enabledFactors, factor] })
  }

  function row(key: IndicatorKey, indent = false) {
    const text = t.factors[key as FactorKey]
    const on = settings.enabledFactors.includes(key as FactorKey)
    return (
      <div key={key} className={indent ? 'ml-4 pl-3' : undefined} style={indent ? { borderLeft: '2px solid var(--color-hairline)' } : undefined}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-control font-medium">{text.label}</p>
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {text.helper}
            </p>
          </div>
          <Toggle checked={on} onChange={() => toggle(key)} label={text.label} />
        </div>
        {key === 'morningStiffness' && on && (
          <div className="flex items-center justify-between gap-3 mt-3 ml-4 pl-3" style={{ borderLeft: '2px solid var(--color-hairline)' }}>
            <div>
              <p className="text-control font-medium">{t.settings.indicators.severityLabel}</p>
              <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                {t.settings.indicators.severityHelper}
              </p>
            </div>
            <Toggle
              checked={settings.morningStiffnessSeverityEnabled}
              onChange={(v) => void updateSettings({ morningStiffnessSeverityEnabled: v })}
              label={t.settings.indicators.severityLabel}
            />
          </div>
        )}
        {/* The options inside an indicator are only worth offering once it is followed. */}
        {on && detailsOf(key, earlyAccess).length > 0 && (
          <div className="flex flex-col gap-3.5 mt-3">{detailsOf(key, earlyAccess).map((d) => row(d, true))}</div>
        )}
      </div>
    )
  }

  const list = (keys: IndicatorKey[]) => <div className="flex flex-col gap-3.5">{keys.map((k) => row(k))}</div>

  if (!plan) return list(others)

  return (
    <div className="flex flex-col gap-5">
      {recommended.length > 0 && (
        <section aria-labelledby="indicators-recommended">
          <p id="indicators-recommended" className="text-control font-semibold">
            {t.settings.indicators.recommendedTitle}
          </p>
          <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.indicators.recommendedHelper}
          </p>
          {list(recommended)}
        </section>
      )}
      {suggested.length > 0 && (
        <section aria-labelledby="indicators-suggested">
          <p id="indicators-suggested" className="text-control font-semibold mb-3">
            {t.settings.indicators.suggestedTitle}
          </p>
          {list(suggested)}
        </section>
      )}
      {others.length > 0 && (
        <details>
          <summary className="text-control font-semibold cursor-pointer min-h-11 flex items-center">{t.settings.indicators.othersSummary}</summary>
          <div className="mt-3">{list(others)}</div>
        </details>
      )}
    </div>
  )
}
