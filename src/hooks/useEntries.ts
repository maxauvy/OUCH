import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayISO } from '../db'
import type { DailyEntry } from '../db/types'

export function useAllEntries(): DailyEntry[] | undefined {
  return useLiveQuery(() => db.entries.orderBy('date').reverse().toArray(), [])
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
      painLevel: 0,
      createdAt: now,
      updatedAt: now,
      ...patch,
    } as DailyEntry)
  }
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id)
}
