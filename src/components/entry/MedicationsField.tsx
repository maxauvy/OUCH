import { useState, type ReactNode } from 'react'
import { IconMinus, IconPlus } from '@tabler/icons-react'
import type { Medication, MedicationIntake, ReliefLevel } from '../../db/types'
import { periodOn, sameName } from '../../lib/medications'
import { formatPosology } from '../../lib/medicationFormat'
import { findOrCreateMedication } from '../../hooks/useMedications'
import { format, useLocale, useTranslation } from '../../i18n'
import { Chip } from '../ui/Chip'
import { Toggle } from '../ui/Toggle'
import { TagInput } from './TagInput'

const REGIMEN_ORDER = { scheduled: 0, asNeeded: 1, unspecified: 2 } as const

/**
 * The day's medications, driven by the registry: ongoing treatments as a
 * taken/missed switch, as-needed ones as a dose counter with relief, and
 * undescribed ones as simple chips. Typing a new name still works and
 * creates an 'unspecified' medication, so logging stays as quick as before.
 */
export function MedicationsField({
  date,
  medications,
  intakes,
  onChange,
  placeholder,
}: {
  date: string
  medications: Medication[]
  intakes: MedicationIntake[]
  onChange: (intakes: MedicationIntake[]) => void
  placeholder: string
}) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const [draft, setDraft] = useState('')

  const intakeFor = (id: string) => intakes.find((i) => i.medicationId === id)
  // Shown: everything current on that day, plus anything logged that day
  // even if since stopped (so past days stay editable).
  const shown = medications
    .filter((m) => periodOn(m, date) || intakeFor(m.id))
    .sort((a, b) => REGIMEN_ORDER[a.regimen] - REGIMEN_ORDER[b.regimen] || a.name.localeCompare(b.name))
  const described = shown.filter((m) => m.regimen !== 'unspecified')
  const undescribed = shown.filter((m) => m.regimen === 'unspecified')
  const others = medications.filter((m) => !shown.includes(m))

  function setIntake(id: string, next: MedicationIntake | null) {
    const rest = intakes.filter((i) => i.medicationId !== id)
    onChange(next ? [...rest, next] : rest)
  }

  function defaultDoses(med: Medication): number | undefined {
    if (med.regimen === 'scheduled') return periodOn(med, date)?.perDay ?? 1
    if (med.regimen === 'asNeeded') return 1
    return undefined
  }

  async function addByName(raw: string) {
    const name = raw.trim()
    if (!name) return
    setDraft('')
    const med = medications.find((m) => sameName(m.name, name)) ?? (await findOrCreateMedication(name, date))
    if (!intakeFor(med.id)) setIntake(med.id, { medicationId: med.id, doses: defaultDoses(med) })
  }

  return (
    <div className="flex flex-col">
      {described.map((med, i) => (
        <MedicationRow
          key={med.id}
          med={med}
          date={date}
          intake={intakeFor(med.id)}
          first={i === 0}
          onChange={(next) => setIntake(med.id, next)}
          posology={formatPosology(t, med.regimen, periodOn(med, date), intlLocale)}
        />
      ))}

      {undescribed.length > 0 && (
        <div className={described.length ? 'pt-3 mt-1' : ''} style={described.length ? { borderTop: '1px solid var(--color-hairline)' } : undefined}>
          <div className="flex flex-wrap gap-2">
            {undescribed.map((med) => (
              <Chip
                key={med.id}
                label={med.name}
                selected={!!intakeFor(med.id)}
                onClick={() => setIntake(med.id, intakeFor(med.id) ? null : { medicationId: med.id })}
              />
            ))}
          </div>
          <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {t.medications.unspecifiedHint}
          </p>
        </div>
      )}

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addByName(draft)
          }
        }}
        onBlur={() => draft && addByName(draft)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none mt-3"
        style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
      />
      {others.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {others.slice(0, 10).map((m) => (
            <Chip
              key={m.id}
              label={m.name}
              selected={false}
              onClick={() => addByName(m.name)}
              actionLabel={format(t.entryForm.addTag, { tag: m.name })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MedicationRow({
  med,
  date,
  intake,
  first,
  onChange,
  posology,
}: {
  med: Medication
  date: string
  intake: MedicationIntake | undefined
  first: boolean
  onChange: (next: MedicationIntake | null) => void
  posology: string
}) {
  const t = useTranslation()
  const { language } = useLocale()
  const doses = intake?.doses ?? (intake ? 1 : 0)
  const taken = doses > 0
  const [showSideEffects, setShowSideEffects] = useState(false)
  const sideEffects = intake?.sideEffects ?? []

  function setDoses(n: number) {
    if (med.regimen === 'asNeeded' && n <= 0) return onChange(null)
    onChange({ ...intake, medicationId: med.id, doses: Math.max(0, n) })
  }

  return (
    <div className={first ? 'pb-3' : 'py-3'} style={first ? undefined : { borderTop: '1px solid var(--color-hairline)' }}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium">{med.name}</p>
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {[t.medications.regimens[med.regimen], posology].filter(Boolean).join(' · ')}
          </p>
        </div>

        {med.regimen === 'scheduled' ? (
          <Toggle
            checked={taken}
            onChange={(v) => setDoses(v ? (periodOn(med, date)?.perDay ?? 1) : 0)}
            label={`${med.name} : ${t.medications.taken}`}
          />
        ) : (
          <div className="flex items-center gap-1">
            <StepButton label={format(t.medications.fewerIntakes, { name: med.name })} disabled={!taken} onClick={() => setDoses(doses - 1)}>
              <IconMinus size={16} aria-hidden />
            </StepButton>
            {/* The bare number is for the eye; screen readers get the
                medication and unit, announced on every change. */}
            <span className="tabular-nums text-heading font-bold w-7 text-center" aria-hidden>
              {doses}
            </span>
            <span className="sr-only" aria-live="polite">
              {format(t.medications.doseCount, { name: med.name, n: doses }, language)}
            </span>
            <StepButton label={format(t.medications.moreIntakes, { name: med.name })} onClick={() => setDoses(doses + 1)}>
              <IconPlus size={16} aria-hidden />
            </StepButton>
          </div>
        )}
      </div>

      {med.regimen === 'scheduled' && !taken && intake && (
        <p className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
          {t.medications.missedHint}
        </p>
      )}

      {med.regimen === 'asNeeded' && taken && (
        <div className="mt-2.5" role="group" aria-label={format(t.medications.reliefFor, { name: med.name })}>
          <p className="text-caption mb-1.5" style={{ color: 'var(--color-ink-muted)' }} aria-hidden>
            {t.medications.reliefQuestion}
          </p>
          <div className="flex flex-wrap gap-2">
            {t.medications.relief.map((label, level) => (
              <Chip
                key={label}
                label={label}
                selected={intake?.relief === level}
                onClick={() =>
                  onChange({ ...intake!, relief: intake?.relief === level ? undefined : (level as ReliefLevel) })
                }
              />
            ))}
          </div>
        </div>
      )}

      {taken &&
        (showSideEffects || sideEffects.length > 0 ? (
          <div className="mt-2.5" role="group" aria-label={format(t.medications.sideEffectsFor, { name: med.name })}>
            <p className="text-caption mb-1.5" style={{ color: 'var(--color-ink-muted)' }} aria-hidden>
              {t.medications.sideEffectsTitle}
            </p>
            <TagInput
              values={sideEffects}
              onChange={(v) => onChange({ ...intake!, medicationId: med.id, sideEffects: v.length ? v : undefined })}
              placeholder={t.medications.sideEffectsPlaceholder}
              label={format(t.medications.sideEffectsFor, { name: med.name })}
              suggestions={t.medications.sideEffectsSuggestions}
              autoFocus={showSideEffects && sideEffects.length === 0}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSideEffects(true)}
            className="text-caption font-medium mt-1 min-h-6 py-1 underline underline-offset-2"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            {t.medications.reportSideEffect}
            <span className="sr-only"> ({med.name})</span>
          </button>
        ))}
    </div>
  )
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  // aria-disabled rather than disabled: "−" reaches 0 while focused, and a
  // disabled button would drop keyboard focus onto the page.
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className="w-9 h-9 rounded-full flex items-center justify-center aria-disabled:opacity-35"
      style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
    >
      {children}
    </button>
  )
}
