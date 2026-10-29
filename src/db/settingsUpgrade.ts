import type { LegacySettings, Settings } from './types'

/** In place, and safe to run on current settings: moves a pre-v4
 * `childIllness` into `illnesses`, turns a pre-v5 'cycle' factor into
 * `cycleTrackingEnabled`, drops the pre-v6 `design` choice, and keeps the
 * Kids tab for whoever set the app up before it became optional (pre-v7), and
 * folds the four suggestion switches (pre-v8) into one that stays on unless
 * the person had turned any of them off. */
export function upgradeLegacySettings(s: LegacySettings): asserts s is Partial<Settings> {
  if (s.childIllness && !s.illnesses) s.illnesses = [s.childIllness]
  delete s.childIllness
  delete s.design
  if (s.onboardingDone && s.kidsTabEnabled === undefined) s.kidsTabEnabled = true
  if (s.enabledFactors?.includes('cycle')) {
    s.enabledFactors = s.enabledFactors.filter((k) => k !== 'cycle')
    s.cycleTrackingEnabled = true
  }
  const switches = [s.leadPromptEnabled, s.weeklySentenceEnabled, s.leadDotEnabled, s.trialsEnabled]
  if (s.suggestionsEnabled === undefined && switches.includes(false)) s.suggestionsEnabled = false
  delete s.leadPromptEnabled
  delete s.weeklySentenceEnabled
  delete s.leadDotEnabled
  delete s.trialsEnabled
}
