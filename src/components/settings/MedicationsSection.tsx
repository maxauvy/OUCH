import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { todayISO } from '../../db'
import {
  DOSE_UNITS,
  MEDICATION_REGIMENS,
  MEDICATION_STOP_REASONS,
  type Dose,
  type DoseUnit,
  type Medication,
  type MedicationRegimen,
  type MedicationStopReason,
} from '../../db/types'
import { deleteMedication, isMedicationUsed, saveMedication, useMedications } from '../../hooks/useMedications'
import { changePosology, currentPeriod, isStopped, newMedicationId, resumeMedication, sameName, stopMedication } from '../../lib/medications'
import { formatISODate, formatPosology } from '../../lib/medicationFormat'
import { radioGroupProps, radioProps } from '../../lib/a11y'
import { format, useLocale, useTranslation } from '../../i18n'
import { Chip } from '../ui/Chip'

const inputStyle = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
const inputClass = 'w-full rounded-xl px-3.5 py-2.5 text-body outline-none'

const editButtonId = (medId: string) => `medication-edit-${medId}`
const ADD_BUTTON_ID = 'medication-add'

export function MedicationsSection() {
  const t = useTranslation()
  const medications = useMedications()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  // Closing an editor unmounts whatever had focus inside it; send focus back
  // to the button that opened it (or to the new medication's own button),
  // once the list has re-rendered, so keyboard users don't land on <body>.
  // After a save, the list only refreshes a moment later (and a stopped or
  // resumed item moves to the other list, remounting its button), so the
  // target is kept until the refreshed data has rendered.
  const focusTarget = useRef<{ id: string; until?: Medication[] } | null>(null)
  useEffect(() => {
    const target = focusTarget.current
    if (!target) return
    document.getElementById(target.id)?.focus()
    if (!target.until || medications !== target.until) focusTarget.current = null
  }, [editing, medications])

  function close(focusId: string, dataChanged: boolean) {
    focusTarget.current = { id: focusId, until: dataChanged ? medications : undefined }
    setEditing(null)
  }

  if (!medications) return null
  const active = medications.filter((m) => !isStopped(m))
  const stopped = medications.filter(isStopped)

  return (
    <div className="flex flex-col">
      <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
        {t.medications.helper}
      </p>

      {medications.length === 0 && (
        <p className="text-control mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          {t.medications.empty}
        </p>
      )}

      {active.map((m) => (
        <MedicationItem
          key={m.id}
          med={m}
          all={medications}
          open={editing === m.id}
          onToggle={() => setEditing(editing === m.id ? null : m.id)}
          onDone={(r) => close(r?.deleted ? ADD_BUTTON_ID : editButtonId(m.id), !!r)}
        />
      ))}

      {editing === 'new' ? (
        <div className="pt-3" style={{ borderTop: active.length ? '1px solid var(--color-hairline)' : undefined }}>
          <MedicationEditor all={medications} onDone={(r) => close(r?.savedId ? editButtonId(r.savedId) : ADD_BUTTON_ID, !!r)} />
        </div>
      ) : (
        <button
          id={ADD_BUTTON_ID}
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-[var(--radius-control)] px-4 py-2 mt-3 text-caption font-semibold self-start"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
        >
          <span aria-hidden>+ </span>
          {t.medications.add}
        </button>
      )}

      {stopped.length > 0 && (
        <>
          <h3 className="text-caption font-semibold uppercase tracking-[0.06em] mt-5 mb-1" style={{ color: 'var(--color-ink-muted)' }}>
            {t.medications.stoppedSection}
          </h3>
          {stopped.map((m) => (
            <MedicationItem
              key={m.id}
              med={m}
              all={medications}
              open={editing === m.id}
              onToggle={() => setEditing(editing === m.id ? null : m.id)}
              onDone={(r) => close(r?.deleted ? ADD_BUTTON_ID : editButtonId(m.id), !!r)}
            />
          ))}
        </>
      )}
    </div>
  )
}

function MedicationItem({
  med,
  all,
  open,
  onToggle,
  onDone,
}: {
  med: Medication
  all: Medication[]
  open: boolean
  onToggle: () => void
  onDone: (result?: EditorResult) => void
}) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const period = currentPeriod(med)
  const stopped = isStopped(med)
  const summary = stopped
    ? format(t.medications.stoppedOn, { date: formatISODate(period!.end!, intlLocale) })
    : [t.medications.regimens[med.regimen], formatPosology(t, med.regimen, period, intlLocale)].filter(Boolean).join(' · ')

  return (
    <div className="py-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium">{med.name}</p>
          <p className="text-caption" style={{ color: med.regimen === 'unspecified' && !stopped ? 'var(--color-brand)' : 'var(--color-ink-muted)' }}>
            {summary}
          </p>
        </div>
        {/* Same visible label on every row: the accessible name adds the
            medication, and aria-expanded tells whether the editor is open. */}
        <button
          id={editButtonId(med.id)}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={open ? `${editButtonId(med.id)}-editor` : undefined}
          aria-label={format(t.medications.editItem, { name: med.name })}
          className="rounded-[var(--radius-control)] px-3 py-1.5 text-caption font-semibold"
          style={
            open
              ? { background: 'var(--color-brand)', color: 'var(--color-on-brand)' }
              : { background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }
          }
        >
          {t.medications.edit}
        </button>
      </div>
      {open && (
        <div className="mt-3" id={`${editButtonId(med.id)}-editor`}>
          <MedicationEditor med={med} all={all} onDone={onDone} />
        </div>
      )}
    </div>
  )
}

/** How an editor closed, so focus can go somewhere that still exists. */
interface EditorResult {
  savedId?: string
  deleted?: boolean
}

/** Create (no `med`) or edit a medication. Editing the dose fields corrects
 * the current period; "Change the dosage" starts a new dated one instead. */
function MedicationEditor({
  med,
  all,
  onDone,
}: {
  med?: Medication
  all: Medication[]
  onDone: (result?: EditorResult) => void
}) {
  const t = useTranslation()
  const ids = useId()
  const { intlLocale } = useLocale()
  const period = med ? currentPeriod(med) : undefined
  const [name, setName] = useState(med?.name ?? '')
  const [regimen, setRegimen] = useState<MedicationRegimen>(med?.regimen ?? 'scheduled')
  const [dose, setDose] = useState<DoseFields>(toFields(period?.dose, period?.perDay))
  const [reason, setReason] = useState(med?.reason ?? '')
  const [since, setSince] = useState(med?.periods[0]?.start ?? todayISO())
  const [panel, setPanel] = useState<'posology' | 'stop' | null>(null)
  const [used, setUsed] = useState(true)
  const stopped = med ? isStopped(med) : false

  useEffect(() => {
    if (med) isMedicationUsed(med.id).then(setUsed)
  }, [med])

  const nameTaken = all.some((m) => m.id !== med?.id && sameName(m.name, name))
  const canSave = name.trim() !== '' && !nameTaken

  async function save() {
    if (!canSave) return
    const now = Date.now()
    const described = regimen !== 'unspecified'
    const posology = described ? fromFields(dose) : {}
    const base: Medication = med ?? { id: newMedicationId(), name, regimen, periods: [], createdAt: now, updatedAt: now }
    const periods = base.periods.length ? base.periods.slice() : [{ start: since }]
    // The start date can move as long as the first period stays non-empty.
    const firstLimit = periods[0].end ?? periods[1]?.start
    if (!firstLimit || since <= firstLimit) periods[0] = { ...periods[0], start: since }
    const last = periods.length - 1
    periods[last] = { ...periods[last], dose: posology.dose, perDay: posology.perDay }
    await saveMedication({ ...base, name, regimen, reason: reason.trim() || undefined, periods })
    onDone({ savedId: base.id })
  }

  async function update(periods: Medication['periods']) {
    if (!med) return
    await saveMedication({ ...med, periods })
    onDone({ savedId: med.id })
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label={t.medications.name} htmlFor={`${ids}-name`}>
        <input
          id={`${ids}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.medications.namePlaceholder}
          aria-invalid={nameTaken || undefined}
          aria-describedby={nameTaken ? `${ids}-name-error` : undefined}
          autoFocus
          className={inputClass}
          style={inputStyle}
        />
        {/* Always rendered, so the live region exists before the message appears. */}
        <p id={`${ids}-name-error`} aria-live="polite" className="text-caption" style={{ color: 'var(--color-weather-5-text)' }}>
          {nameTaken ? t.medications.nameTaken : ''}
        </p>
      </Field>

      <Field label={t.medications.regimenTitle}>
        <div className="flex gap-2" {...radioGroupProps(t.medications.regimenTitle)} aria-describedby={`${ids}-regimen-help`}>
          {MEDICATION_REGIMENS.map((r) => (
            <button
              key={r}
              type="button"
              {...radioProps(regimen === r)}
              onClick={() => setRegimen(r)}
              className="flex-1 rounded-[var(--radius-control)] px-2 py-2 text-caption font-semibold"
              style={{
                background: regimen === r ? 'var(--color-brand)' : 'var(--color-brand-soft)',
                color: regimen === r ? 'var(--color-on-brand)' : 'var(--color-brand)',
              }}
            >
              {t.medications.regimens[r]}
            </button>
          ))}
        </div>
        <p id={`${ids}-regimen-help`} className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
          {t.medications.regimenHelpers[regimen]}
        </p>
      </Field>

      {regimen !== 'unspecified' && <DoseInputs value={dose} onChange={setDose} regimen={regimen} />}

      <Field label={t.medications.reason} htmlFor={`${ids}-reason`}>
        <input id={`${ids}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.medications.reasonPlaceholder} className={inputClass} style={inputStyle} />
      </Field>

      <Field label={t.medications.since} htmlFor={`${ids}-since`}>
        <input id={`${ids}-since`} type="date" value={since} max={todayISO()} onChange={(e) => e.target.value && setSince(e.target.value)} className={inputClass} style={inputStyle} />
      </Field>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="flex-1 rounded-[var(--radius-control)] py-2.5 text-control font-semibold text-[var(--color-on-brand)] disabled:opacity-40"
          style={{ background: 'var(--color-brand)' }}
        >
          {t.medications.save}
        </button>
        <button
          type="button"
          onClick={() => onDone()}
          className="rounded-[var(--radius-control)] px-4 py-2.5 text-control font-semibold"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
        >
          {t.medications.cancel}
        </button>
      </div>

      {med && (
        <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
          {!stopped && med.regimen !== 'unspecified' && (
            <SecondaryButton expanded={panel === 'posology'} onClick={() => setPanel(panel === 'posology' ? null : 'posology')}>
              {t.medications.changePosology}
            </SecondaryButton>
          )}
          {!stopped && (
            <SecondaryButton expanded={panel === 'stop'} onClick={() => setPanel(panel === 'stop' ? null : 'stop')}>
              {t.medications.stop}
            </SecondaryButton>
          )}
          {stopped && <SecondaryButton onClick={() => update(resumeMedication(med, todayISO()))}>{t.medications.resume}</SecondaryButton>}
          {!used && (
            <SecondaryButton
              onClick={async () => {
                if (!window.confirm(format(t.medications.deleteConfirm, { name: med.name }))) return
                await deleteMedication(med.id)
                onDone({ deleted: true })
              }}
            >
              {t.medications.delete}
            </SecondaryButton>
          )}
        </div>
      )}

      {med && panel === 'posology' && <PosologyPanel med={med} onSave={(periods) => update(periods)} />}
      {med && panel === 'stop' && <StopPanel med={med} onSave={(periods) => update(periods)} />}

      {med && med.periods.length > 1 && (
        <div>
          <p className="text-caption font-semibold mb-1" style={{ color: 'var(--color-ink-muted)' }}>
            {t.medications.history}
          </p>
          <ul className="text-caption flex flex-col gap-0.5" style={{ color: 'var(--color-ink-muted)' }}>
            {med.periods.map((p, i) => (
              <li key={i}>
                {formatISODate(p.start, intlLocale)} → {p.end ? formatISODate(p.end, intlLocale) : '…'}
                {formatPosology(t, med.regimen, p, intlLocale) && ` · ${formatPosology(t, med.regimen, p, intlLocale)}`}
                {p.stopReason && ` · ${t.medications.stopReasons[p.stopReason]}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PosologyPanel({ med, onSave }: { med: Medication; onSave: (periods: Medication['periods']) => void }) {
  const t = useTranslation()
  const period = currentPeriod(med)
  const [from, setFrom] = useState(todayISO())
  const [dose, setDose] = useState<DoseFields>(toFields(period?.dose, period?.perDay))
  const id = useId()
  return (
    <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: 'var(--color-paper)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}>
      <Field label={t.medications.changeFrom} htmlFor={id}>
        <input id={id} autoFocus type="date" value={from} min={med.periods[0]?.start} onChange={(e) => e.target.value && setFrom(e.target.value)} className={inputClass} style={inputStyle} />
      </Field>
      <DoseInputs value={dose} onChange={setDose} regimen={med.regimen} />
      <PrimaryButton onClick={() => onSave(changePosology(med, from, fromFields(dose)))}>{t.medications.save}</PrimaryButton>
    </div>
  )
}

function StopPanel({ med, onSave }: { med: Medication; onSave: (periods: Medication['periods']) => void }) {
  const t = useTranslation()
  const [end, setEnd] = useState(todayISO())
  const [reason, setReason] = useState<MedicationStopReason | undefined>()
  const id = useId()
  return (
    <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: 'var(--color-paper)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}>
      <Field label={t.medications.stopDate} htmlFor={id}>
        <input id={id} autoFocus type="date" value={end} min={currentPeriod(med)?.start} onChange={(e) => e.target.value && setEnd(e.target.value)} className={inputClass} style={inputStyle} />
      </Field>
      <Field label={t.medications.stopReasonTitle} group>
        <div className="flex flex-wrap gap-2">
          {MEDICATION_STOP_REASONS.map((r) => (
            <Chip key={r} label={t.medications.stopReasons[r]} selected={reason === r} onClick={() => setReason(reason === r ? undefined : r)} />
          ))}
        </div>
      </Field>
      <PrimaryButton onClick={() => onSave(stopMedication(med, end, reason))}>{t.medications.stop}</PrimaryButton>
    </div>
  )
}

// Dose fields are kept as strings while typing (an empty box is not 0).
interface DoseFields {
  amount: string
  unit: DoseUnit
  perDay: string
}

function toFields(dose: Dose | undefined, perDay: number | undefined): DoseFields {
  return { amount: dose ? String(dose.amount) : '', unit: dose?.unit ?? 'mg', perDay: perDay ? String(perDay) : '' }
}

function fromFields(f: DoseFields): { dose?: Dose; perDay?: number } {
  const amount = parseFloat(f.amount.replace(',', '.'))
  const perDay = parseInt(f.perDay, 10)
  return {
    dose: amount > 0 ? { amount, unit: f.unit } : undefined,
    perDay: perDay > 0 ? perDay : undefined,
  }
}

function DoseInputs({ value, onChange, regimen }: { value: DoseFields; onChange: (v: DoseFields) => void; regimen: MedicationRegimen }) {
  const t = useTranslation()
  const perDayLabel = regimen === 'asNeeded' ? t.medications.perDayAsNeeded : t.medications.perDayScheduled
  const perDayId = useId()
  return (
    <>
      <Field label={t.medications.dose} group>
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            value={value.amount}
            onChange={(e) => onChange({ ...value, amount: e.target.value })}
            placeholder={t.medications.doseAmountPlaceholder}
            aria-label={t.medications.dose}
            className={`${inputClass} min-w-0`}
            style={inputStyle}
          />
          <select
            value={value.unit}
            onChange={(e) => onChange({ ...value, unit: e.target.value as DoseUnit })}
            aria-label={t.medications.unit}
            className="shrink-0 rounded-xl px-2 py-2.5 text-body outline-none"
            style={inputStyle}
          >
            {DOSE_UNITS.map((u) => (
              <option key={u} value={u}>
                {t.medications.units[u]}
              </option>
            ))}
          </select>
        </div>
      </Field>
      <Field label={perDayLabel} htmlFor={perDayId}>
        <input
          id={perDayId}
          inputMode="numeric"
          value={value.perDay}
          onChange={(e) => onChange({ ...value, perDay: e.target.value.replace(/\D/g, '') })}
          placeholder="1"
          className="w-24 rounded-xl px-3.5 py-2.5 text-body outline-none"
          style={inputStyle}
        />
      </Field>
    </>
  )
}

/**
 * A visible caption above one or more controls, named once for screen readers:
 * - `htmlFor`: a single control, captioned by a real <label>;
 * - `group`: several controls (amount + unit, reason chips) named as a group;
 * - neither: the control names itself (the regimen radiogroup), so the
 *   caption is only visual.
 */
function Field({ label, htmlFor, group, children }: { label: string; htmlFor?: string; group?: boolean; children: ReactNode }) {
  const captionClass = 'block text-caption font-medium mb-1'
  const captionStyle = { color: 'var(--color-ink-muted)' }
  return (
    <div role={group ? 'group' : undefined} aria-label={group ? label : undefined}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={captionClass} style={captionStyle}>
          {label}
        </label>
      ) : (
        <span className={captionClass} style={captionStyle} aria-hidden>
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--radius-control)] py-2.5 text-control font-semibold text-[var(--color-on-brand)]"
      style={{ background: 'var(--color-brand)' }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ onClick, expanded, children }: { onClick: () => void; expanded?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="rounded-[var(--radius-control)] px-3.5 py-1.5 text-caption font-semibold"
      style={{ background: 'var(--color-surface)', color: 'var(--color-brand)', boxShadow: 'inset 0 0 0 1px var(--color-brand)' }}
    >
      {children}
    </button>
  )
}
