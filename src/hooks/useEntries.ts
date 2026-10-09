import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayISO } from '../db'
import type { DailyEntry, LoggedEntry } from '../db/types'
import { hasPain, loggedEntries } from '../lib/loggedEntries'

export function useAllEntries(): DailyEntry[] | undefined {
  return useLiveQuery(() => db.entries.orderBy('date').reverse().toArray(), [])
}

/** The days with a pain level, for statistics; undefined until read. */
export function useLoggedEntries(): LoggedEntry[] | undefined {
  const all = useAllEntries()
  return useMemo(() => (all ? loggedEntries(all) : undefined), [all])
}

/** How many days have a pain level; undefined until counted. */
export function useEntryCount(): number | undefined {
  return useLiveQuery(() => db.entries.filter(hasPain).count(), [])
}

export function useEntry(date: string): DailyEntry | undefined {
  return useLiveQuery(() => db.entries.where('date').equals(date).first(), [date])
}

export function useTodayEntry(): DailyEntry | undefined {
  return useEntry(todayISO())
}

export async function upsertEntry(date: string, patch: Partial<DailyEntry>): Promise<void> {
  const existing = await db.entries.where('date').equals(date).first()
  const now = Date.now()
  if (existing) {
    await db.entries.update(existing.id!, { ...patch, updatedAt: now })
  } else {
    await db.entries.add({
      date,
      createdAt: now,
      updatedAt: now,
      ...patch,
    } as DailyEntry)
  }
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id)
}
