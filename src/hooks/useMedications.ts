import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Medication, MedicationRegimen } from '../db/types'
import { newMedicationId, sameName } from '../lib/medications'

/** All medications, alphabetical. */
export function useMedications(): Medication[] | undefined {
  return useLiveQuery(() => db.medications.orderBy('name').toArray(), [])
}

/** Returns the medication with this name, creating it if needed. Used by the
 * daily form, where typing a new name must stay as quick as before. */
export async function findOrCreateMedication(
  name: string,
  firstDate: string,
  regimen: MedicationRegimen = 'unspecified'
): Promise<Medication> {
  const all = await db.medications.toArray()
  const existing = all.find((m) => sameName(m.name, name))
  if (existing) return existing
  const now = Date.now()
  const med: Medication = {
    id: newMedicationId(),
    name: name.trim(),
    regimen,
    periods: [{ start: firstDate }],
    createdAt: now,
    updatedAt: now,
  }
  await db.medications.add(med)
  return med
}

export async function saveMedication(med: Medication): Promise<void> {
  await db.medications.put({ ...med, name: med.name.trim(), updatedAt: Date.now() })
}

/** Deleting is only offered for medications no entry refers to, so the
 * history never points at a missing medication. */
export async function isMedicationUsed(id: string): Promise<boolean> {
  const found = await db.entries.filter((e) => !!e.intakes?.some((i) => i.medicationId === id)).first()
  return !!found
}

export async function deleteMedication(id: string): Promise<void> {
  await db.medications.delete(id)
}
