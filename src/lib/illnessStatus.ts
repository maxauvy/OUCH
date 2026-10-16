// What the person says of each illness they track: confirmed by a health
// professional, or only suspected. Optional on purpose: nothing is assumed, so
// an illness with no status is listed as before, with none.

import type { Illness, IllnessDetails, IllnessStatus } from '../db/types.ts'

export const OTHER_ILLNESS_NAME_MAX = 60

/** Earliest year accepted for a diagnosis. */
export const FIRST_DIAGNOSIS_YEAR = 1900

interface IllnessState {
  illnesses: Illness[]
  illnessStatus?: IllnessDetails['status']
  otherIllnessName?: string
  illnessYear?: IllnessDetails['year']
}

/** The settings patch for ticking or unticking an illness. Unticking drops
 * its status, and the name typed for "autre", so nothing stale is kept. */
export function toggleIllness(state: IllnessState, illness: Illness): Partial<IllnessState> {
  if (!state.illnesses.includes(illness)) return { illnesses: [...state.illnesses, illness] }
  const { [illness]: _dropped, ...status } = state.illnessStatus ?? {}
  const { [illness]: _year, ...years } = state.illnessYear ?? {}
  return {
    illnesses: state.illnesses.filter((i) => i !== illness),
    illnessStatus: status,
    illnessYear: years,
    ...(illness === 'autre' ? { otherIllnessName: undefined } : {}),
  }
}

/** The patch for choosing a status; choosing the one already set clears it
 * (no answer is a valid answer). The year of the diagnosis only goes with
 * "diagnosed": any other state drops it. */
export function setIllnessStatus(state: IllnessState, illness: Illness, status: IllnessStatus): Partial<IllnessState> {
  const { [illness]: current, ...rest } = state.illnessStatus ?? {}
  const next: NonNullable<IllnessState['illnessStatus']> = current === status ? rest : { ...rest, [illness]: status }
  if (next[illness] === 'diagnosed') return { illnessStatus: next }
  const { [illness]: _year, ...years } = state.illnessYear ?? {}
  return { illnessStatus: next, illnessYear: years }
}

/** A year typed for a diagnosis: four digits, from 1900 to `thisYear`. Empty
 * is valid and means "not given" (null); anything else is not (undefined). */
export function parseDiagnosisYear(value: string, thisYear: number): number | null | undefined {
  const text = value.trim()
  if (text === '') return null
  if (!/^\d{4}$/.test(text)) return undefined
  const year = Number(text)
  return year >= FIRST_DIAGNOSIS_YEAR && year <= thisYear ? year : undefined
}

/** The patch for a diagnosis year typed for an illness (null clears it). */
export function setIllnessYear(state: IllnessState, illness: Illness, year: number | null): Partial<IllnessState> {
  const { [illness]: _old, ...rest } = state.illnessYear ?? {}
  return { illnessYear: year === null ? rest : { ...rest, [illness]: year } }
}

/** The name typed for "autre", trimmed and cut; undefined when empty. */
export function cleanOtherName(value: string): string | undefined {
  return value.trim().slice(0, OTHER_ILLNESS_NAME_MAX) || undefined
}

/** The illnesses the Kids tab explains. Its texts say "has X": for an illness
 * only suspected that would announce a diagnosis that does not exist yet, so
 * it gets the general text ("autre") instead, once however many there are. */
export function kidsIllnesses(illnesses: Illness[], status: IllnessDetails['status']): Illness[] {
  const out: Illness[] = []
  for (const illness of illnesses) {
    const shown = status?.[illness] === 'suspected' ? 'autre' : illness
    if (!out.includes(shown)) out.push(shown)
  }
  return out
}
