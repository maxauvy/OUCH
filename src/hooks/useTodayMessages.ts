import { useEffect, useMemo } from 'react'
import { updateSettings } from '../db'
import { todayISO } from '../lib/dates'
import { IS_DEMO } from '../lib/demoMode'
import { useEarlyAccess } from '../lib/earlyAccess'
import { flaresApply } from '../lib/flares'
import { forecastReading, isFresh } from '../lib/forecast'
import { fetchPressureForecast } from '../lib/weather'
import { flareUnderWay } from '../lib/hardDays'
import { shouldShowInvite } from '../lib/indicatorInvite'
import { NO_LEADS_SEEN, trialToRepeat } from '../lib/leadHints'
import { triedKeys } from '../lib/leadTrial'
import { monthSummary } from '../lib/monthSummary'
import { ongoingMarked } from '../lib/markedFlares'
import { bigDayBefore } from '../lib/pacing'
import { missedYesterday } from '../lib/yesterdayEntry'
import { recentReturn, todayMessages, type TodayMessages } from '../lib/todayMessages'
import { weeklyFinding } from '../lib/weeklySentence'
import { useFlares } from './useFlares'
import { useLeadList } from './useLeadList'
import { useLoggedEntries } from './useEntries'
import { useSettings } from './useSettings'

/** What waits on the day's page (the line under the title and the sheet it opens), or null until the diary is read. */
export function useTodayMessages(): TodayMessages | null {
  const logged = useLoggedEntries()
  const leadList = useLeadList()
  const settings = useSettings()
  const earlyAccess = useEarlyAccess()
  const flares = useFlares()
  const today = todayISO()

  // The forecast for the day, asked once and kept on the device. Only when the person said yes and a position is set.
  const lat = settings.autoWeatherLat
  const lon = settings.autoWeatherLon
  const hasPlace = lat !== undefined && lon !== undefined
  const forecastOn = !!settings.forecastEnabled && settings.enabledFactors.includes('weather') && (hasPlace || IS_DEMO)
  const fresh = isFresh(settings.forecastCache, today)
  useEffect(() => {
    if (!forecastOn || IS_DEMO || fresh || lat === undefined || lon === undefined) return
    let live = true
    fetchPressureForecast(lat, lon)
      .then(async (days) => {
        if (live && days.length) await updateSettings({ forecastCache: { fetchedOn: today, days } })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [forecastOn, fresh, lat, lon, today])

  return useMemo(() => {
    if (!logged || !leadList) return null
    // A stretch the person marked counts like a detected one: nothing is brought.
    const flare = (flaresApply(settings.illnesses) && flareUnderWay(logged, today)) || !!ongoingMarked(settings.markedFlares, today)
    const trialsOn = settings.suggestionsEnabled && settings.enabledFactors.includes('positiveActions')
    return todayMessages({
      today,
      quiet: flare,
      later: settings.leadsSeen?.later,
      allow: { leads: settings.suggestionsEnabled, weekly: settings.suggestionsEnabled, trials: trialsOn, calm: settings.suggestionsEnabled, month: settings.suggestionsEnabled, rest: settings.suggestionsEnabled && settings.enabledFactors.includes('activity'), weather: settings.suggestionsEnabled && forecastOn },
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
      calm: recentReturn(flares?.episodes ?? [], today),
      month: monthSummary({ today, entries: logged, history: settings.leadTrialHistory ?? [], episodes: flares?.episodes ?? [] }),
      rest: bigDayBefore(logged, today),
      weather: forecastOn ? forecastReading(logged, settings.forecastCache, today) : null,
      yesterday: settings.suggestionsEnabled ? missedYesterday(logged, today) : null,
      trial: settings.leadTrial,
    })
  }, [logged, leadList, settings, earlyAccess, today, flares, forecastOn])
}
