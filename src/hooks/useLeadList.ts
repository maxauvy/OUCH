import { useMemo } from 'react'
import { subDays } from 'date-fns'
import { useLoggedEntries } from './useEntries'
import { useSettings } from './useSettings'
import { arrangeLeads, findLeads, leadFactors, type LeadList } from '../lib/leads'

/** The days Trends looks at when it opens, and so what the dot and the card on
 * the day's page speak of. */
const LEAD_RANGE_DAYS = 30

/** The leads Trends shows by default, arranged by what the person answered; null until the diary is read. */
export function useLeadList(): LeadList | null {
  const entries = useLoggedEntries()
  const { enabledFactors, leadChoices } = useSettings()
  return useMemo(() => {
    if (!entries) return null
    const cutoff = subDays(new Date(), LEAD_RANGE_DAYS)
    const recent = entries.filter((e) => new Date(e.date + 'T00:00:00') >= cutoff)
    return arrangeLeads(findLeads(recent, leadFactors(enabledFactors)), leadChoices)
  }, [entries, enabledFactors, leadChoices])
}
