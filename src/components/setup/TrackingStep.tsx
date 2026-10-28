import { useId, type ReactNode } from 'react'
import { updateSettings } from '../../db'
import type { FactorKey } from '../../db/types'
import { useSettings } from '../../hooks/useSettings'
import { useEarlyAccess } from '../../lib/earlyAccess'
import { detailsOf, planForIllnesses, wizardSections, type IndicatorKey } from '../../lib/indicatorCatalog'
import { useTranslation } from '../../i18n'
import { Card } from '../ui/Card'
import { Toggle } from '../ui/Toggle'
import { Chip } from '../ui/Chip'

/** "What you want to track", in three levels: what is recommended for the
 * illnesses declared (ticked the first time, by the setup), what may also help
 * (never ticked), and everything else, folded. Each choice is saved at once. */
export function TrackingStep({
  heading,
  intro,
  hint,
  applied,
  firstPass,
}: {
  heading: ReactNode
  intro: ReactNode
  hint: ReactNode
  /** What the plan pre-selected; null before it has. */
  applied: IndicatorKey[] | null
  firstPass: boolean
}) {
  const t = useTranslation()
  const settings = useSettings()
  const earlyAccess = useEarlyAccess()
  const ids = useId()
  const plan = planForIllnesses(settings.illnesses, { earlyAccess })
  const sections = wizardSections(plan, applied)
  const hasIllness = settings.illnesses.length > 0

  const isOn = (key: IndicatorKey) => settings.enabledFactors.includes(key as FactorKey)
  function toggle(key: IndicatorKey) {
    void updateSettings({
      enabledFactors: isOn(key) ? settings.enabledFactors.filter((k) => k !== key) : [...settings.enabledFactors, key as FactorKey],
    })
  }

  const chip = (key: IndicatorKey) => <Chip key={key} label={t.factors[key as FactorKey].label} selected={isOn(key)} onClick={() => toggle(key)} />

  // A followed indicator brings its options (night wakings under sleep) next to it.
  const chips = (keys: IndicatorKey[]) =>
    keys.map((key) => {
      const details = isOn(key) ? detailsOf(key, earlyAccess) : []
      const severity = key === 'morningStiffness' && isOn(key) && settings.illnesses.includes('arthrite')
      return (
        <span key={key} className="contents">
          {chip(key)}
          {details.map((d) => (
            <Chip key={d} label={`↳ ${t.factors[d as FactorKey].label}`} selected={isOn(d)} onClick={() => toggle(d)} />
          ))}
          {severity && (
            <Chip
              label={`↳ ${t.settings.indicators.severityLabel}`}
              selected={settings.morningStiffnessSeverityEnabled}
              onClick={() => void updateSettings({ morningStiffnessSeverityEnabled: !settings.morningStiffnessSeverityEnabled })}
            />
          )}
        </span>
      )
    })

  const group = (id: string, title: string, children: ReactNode, note?: ReactNode) => (
    <section aria-labelledby={`${ids}-${id}`} className="flex flex-col gap-2">
      <p id={`${ids}-${id}`} className="text-control font-semibold">
        {title}
      </p>
      {note}
      <div role="group" aria-labelledby={`${ids}-${id}`} className="flex flex-wrap gap-2">
        {children}
      </div>
    </section>
  )
  const caption = (text: string) => (
    <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
      {text}
    </p>
  )

  return (
    <>
      {heading}
      {intro}
      <Card>
        <div className="flex flex-col gap-5">
          {sections.recommended.length > 0 &&
            group(
              'recommended',
              t.setup.indicators.recommendedTitle,
              chips(sections.recommended),
              <>
                {caption(!firstPass ? t.setup.indicators.rerunHelper : hasIllness ? t.setup.indicators.recommendedHelper : t.setup.indicators.baseHelper)}
                {firstPass && caption(t.setup.indicators.optional)}
              </>
            )}
          {(sections.suggested.length > 0 || sections.added.length > 0) &&
            group(
              'suggested',
              t.setup.indicators.suggestedTitle,
              <>
                {chips(sections.added)}
                {chips(sections.suggested)}
              </>,
              sections.added.length > 0 ? caption(t.setup.indicators.addedNote) : undefined
            )}
          {sections.others.length > 0 && (
            <details>
              <summary className="text-control font-semibold cursor-pointer min-h-11 flex items-center">{t.setup.indicators.othersSummary}</summary>
              <div role="group" aria-label={t.setup.indicators.othersSummary} className="flex flex-wrap gap-2 mt-2">
                {chips(sections.others)}
              </div>
            </details>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 mt-5">
          <div>
            <p className="text-control font-medium">{t.settings.cycleTracking}</p>
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {t.settings.cycleTrackingHelper}
            </p>
          </div>
          <Toggle checked={settings.cycleTrackingEnabled} onChange={(v) => updateSettings({ cycleTrackingEnabled: v })} label={t.settings.cycleTracking} />
        </div>
      </Card>
      {hint}
    </>
  )
}
