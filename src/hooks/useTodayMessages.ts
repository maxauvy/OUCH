import { useMemo } from 'react'
import { todayISO } from '../lib/dates'
import { IS_DEMO } from '../lib/demoMode'
import { useEarlyAccess } from '../lib/earlyAccess'
import { flaresApply } from '../lib/flares'
import { flareUnderWay } from '../lib/hardDays'
import { shouldShowInvite } from '../lib/indicatorInvite'
import { NO_LEADS_SEEN, trialToRepeat } from '../lib/leadHints'
import { triedKeys } from '../lib/leadTrial'
import { todayMessages, type TodayMessages } from '../lib/todayMessages'
import { weeklyFinding } from '../lib/weeklySentence'
import { useLeadList } from './useLeadList'
import { useLoggedEntries } from './useEntries'
import { useSettings } from './useSettings'

/** What waits on the day's page (the line under the title and the sheet it opens), or null until the diary is read. */
export function useTodayMessages(): TodayMessages | null {
  const logged = useLoggedEntries()
  const leadList = useLeadList()
  const settings = useSettings()
  const earlyAccess = useEarlyAccess()
  const today = todayISO()

  return useMemo(() => {
    if (!logged || !leadList) return null
    const flare = flaresApply(settings.illnesses) && flareUnderWay(logged, today)
    const trialsOn = settings.trialsEnabled && settings.leadPromptEnabled && settings.enabledFactors.includes('positiveActions')
    return todayMessages({
      today,
      quiet: flare,
      later: settings.leadsSeen?.later,
      allow: { leads: settings.leadPromptEnabled, weekly: settings.weeklySentenceEnabled, trials: trialsOn },
      leads: leadList.shown,
      leadChoices: settings.leadChoices,
      tried: triedKeys(settings.leadTrial, settings.leadTrialHistory),
      weekly: weeklyFinding(logged, today, flare),
      repeat: trialToRepeat({
        history: settings.leadTrialHistory,
        current: settings.leadTrial,
        seen: { ...NO_LEADS_SEEN, ...settings.leadsSeen },
        entries: logged,
        today,
        enabled: trialsOn,
        quiet: flare,
      }),
      invite: !IS_DEMO && shouldShowInvite(settings, { earlyAccess, today, quiet: flare }),
      trial: settings.leadTrial,
    })
  }, [logged, leadList, settings, earlyAccess, today])
}
