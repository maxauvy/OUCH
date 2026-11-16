export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night'

/** Which part of the day an hour (0-23) belongs to. */
export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}
