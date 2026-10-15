import { db, updateSettings } from '../db'
import { NO_LEADS_SEEN, type LeadsSeen } from './leadHints'

/** Changes what the lead cards have shown on this device. Read back from the
 * database first, so a write never lands on what a card remembered a moment ago. */
export async function updateLeadsSeen(change: (seen: LeadsSeen) => LeadsSeen): Promise<void> {
  const current = { ...NO_LEADS_SEEN, ...(await db.settings.get(1))?.leadsSeen }
  const next = change(current)
  if (next !== current) await updateSettings({ leadsSeen: next })
}
