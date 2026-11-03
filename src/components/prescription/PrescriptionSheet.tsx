import { useState } from 'react'
import { updateSettings } from '../../db'
import type { Settings } from '../../db/types'
import { useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'
import { draftPrescription, type PrescriptionDraft } from '../../lib/prescription'
import { PrescriptionFields } from './PrescriptionFields'

/** The prescription's own sheet: its length, its day, when to be reminded. `initialStart` is for a new one (the day it was renewed). */
export function PrescriptionSheet({ settings, today, initialStart, onClose }: { settings: Settings; today: string; initialStart?: string; onClose: () => void }) {
  const t = useTranslation().prescription
  const current = settings.prescription
  const [draft, setDraft] = useState<PrescriptionDraft>({
    months: current?.months ?? null,
    start: initialStart ?? current?.start ?? today,
    remindDays: current?.remindDays ?? 7,
    label: current?.label ?? '',
  })
  const p = draftPrescription(draft)

  function save() {
    if (!p) return
    void updateSettings({ prescription: p, prescriptionCardState: undefined })
    onClose()
  }
  function remove() {
    void updateSettings({ prescription: undefined, prescriptionCardState: undefined })
    onClose()
  }

  return (
    <ModalSheet title={t.sheetTitle} closeLabel={t.close} onClose={onClose}>
      <PrescriptionFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      <button
        type="button"
        onClick={save}
        disabled={!p}
        className="rounded-[var(--radius-control)] py-3.5 text-body font-semibold text-[var(--color-on-brand)] disabled:opacity-40"
        style={{ background: 'var(--color-brand)' }}
      >
        {t.save}
      </button>
      {current && (
        <button type="button" onClick={remove} className="min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-ink-muted)' }}>
          {t.remove}
        </button>
      )}
    </ModalSheet>
  )
}
