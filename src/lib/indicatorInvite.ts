// The invitation to someone who already follows their pain, once new
// indicators fit the illnesses they declared: a soft banner on the day's page,
// a sheet with nothing ticked, and "later" that really means later. It only ever
// adds what the person ticks: nothing they follow is removed, nothing is
// ticked for them, and a person who closes it twice is not asked a third time.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { FactorKey, Settings } from '../db/types.ts'
import { detailsOf, planForIllnesses, withoutDetails, type IndicatorKey } from './indicatorCatalog.ts'
import { shiftISO } from './medications.ts'

/** A cross hides the banner for this many days. */
export const INVITE_SNOOZE_DAYS = 5
/** The second cross is the last: the invitation stays in Settings. */
export const INVITE_MAX_DISMISSALS = 2

type InviteSettings = Pick<
  Settings,
  'onboardingDone' | 'illnesses' | 'enabledFactors' | 'indicatorInviteDone' | 'indicatorInviteSnoozeUntil' | 'indicatorInviteDismissCount'
>

/** What the invitation could add: recommended or suggested for the declared
 * illnesses, not followed yet; the options inside an indicator (night wakings)
 * only when their parent is followed, or offered along with it. */
export function invitableIndicators(settings: Pick<Settings, 'illnesses' | 'enabledFactors'>, earlyAccess: boolean): IndicatorKey[] {
  if (settings.illnesses.length === 0) return []
  const plan = planForIllnesses(settings.illnesses, { earlyAccess })
  const followed = (key: IndicatorKey) => settings.enabledFactors.includes(key as FactorKey)
  const top = withoutDetails([...plan.recommended, ...plan.suggested]).filter((k) => !followed(k))
  const planned = new Set<IndicatorKey>([...plan.recommended, ...plan.suggested])
  const details = [...settings.enabledFactors as IndicatorKey[], ...top].flatMap((parent) => detailsOf(parent, earlyAccess)).filter((d) => planned.has(d) && !followed(d))
  return [...new Set([...top, ...details])]
}

/** Whether the banner shows today. `quiet` is a hard day (a flare under way) or a diary not read yet: it waits. */
export function shouldShowInvite(settings: InviteSettings, options: { earlyAccess: boolean; today: string; quiet: boolean }): boolean {
  const { earlyAccess, today, quiet } = options
  if (quiet || !settings.onboardingDone || settings.indicatorInviteDone) return false
  if ((settings.indicatorInviteDismissCount ?? 0) >= INVITE_MAX_DISMISSALS) return false
  if (settings.indicatorInviteSnoozeUntil && today < settings.indicatorInviteSnoozeUntil) return false
  return invitableIndicators(settings, earlyAccess).length > 0
}

/** A cross, or a sheet closed with nothing ticked: later. */
export function snoozeInvite(settings: Pick<Settings, 'indicatorInviteDismissCount'>, today: string): Pick<Settings, 'indicatorInviteDismissCount' | 'indicatorInviteSnoozeUntil'> {
  const count = Math.min(INVITE_MAX_DISMISSALS, (settings.indicatorInviteDismissCount ?? 0) + 1)
  return { indicatorInviteDismissCount: count, indicatorInviteSnoozeUntil: count >= INVITE_MAX_DISMISSALS ? undefined : shiftISO(today, INVITE_SNOOZE_DAYS) }
}

/** "Add": only what was ticked joins what is followed, nothing else moves, and the invitation is over. */
export function completeInvite(settings: Pick<Settings, 'enabledFactors'>, chosen: readonly IndicatorKey[]): Pick<Settings, 'enabledFactors' | 'indicatorInviteDone'> {
  const added = (chosen as FactorKey[]).filter((k) => !settings.enabledFactors.includes(k))
  return { enabledFactors: [...settings.enabledFactors, ...added], indicatorInviteDone: true }
}
