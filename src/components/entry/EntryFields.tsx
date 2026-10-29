import type { Icon } from '@tabler/icons-react'
import { IconBone, IconBrain, IconClock } from '@tabler/icons-react'
import { HEADACHE_DURATIONS, JOINT_REGIONS, type DailyEntry, type JointKey } from '../../db/types'
import { useTranslation } from '../../i18n'
import { Slider } from '../ui/Slider'
import { Chip } from '../ui/Chip'
import { TagInput } from './TagInput'

export type Category = 'pain' | 'fatigue' | 'sleep' | 'stress' | 'fog' | 'mood' | 'activity' | 'cycle'

export function CategoryIcon({ icon: I, cat, size = 28 }: { icon: Icon; cat: Category; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-[7px]"
      style={{ width: size, height: size, background: `var(--cat-${cat}-soft)`, color: `var(--cat-${cat})` }}
      aria-hidden
    >
      <I size={Math.round(size * 0.62)} stroke={1.8} />
    </span>
  )
}

export function MetricRow({
  icon,
  cat,
  label,
  value,
  onChange,
  endLabels,
  max = 10,
  step = 1,
  formatValue,
}: {
  icon: Icon
  cat: Category
  label: string
  value: number | undefined
  onChange: (v: number) => void
  endLabels: [string, string]
  max?: number
  step?: number
  formatValue?: (v: number) => string
}) {
  return (
    <div className="px-4 pt-3.5 pb-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
      <div className="flex items-center gap-2.5">
        <CategoryIcon icon={icon} cat={cat} />
        <span className="flex-1 text-body font-medium">{label}</span>
        <span className="tabular-nums text-heading font-bold">
          {value === undefined ? (
            <span style={{ color: 'var(--color-ink-muted)', fontWeight: 500 }}>—</span>
          ) : formatValue ? (
            formatValue(value)
          ) : (
            <>
              {value}
              <span className="text-caption font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                {' '}/ {max}
              </span>
            </>
          )}
        </span>
      </div>
      <Slider
        bare
        label={label}
        value={value}
        onChange={onChange}
        max={max}
        step={step}
        endLabels={endLabels}
        accent={`var(--cat-${cat})`}
      />
    </div>
  )
}

/** A choice among a few bands rather than a slider (the duration of a stiffness). Pressing the
 * chosen band again clears it: a day left blank is not the same as the first band. */
export function ChoiceRow({
  icon,
  cat,
  label,
  options,
  value,
  onChange,
}: {
  icon: Icon
  cat: Category
  label: string
  options: { value: string; label: string }[]
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  return (
    <div className="px-4 pt-3.5 pb-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
      <div className="flex items-center gap-2.5">
        <CategoryIcon icon={icon} cat={cat} />
        <span id={`choice-${cat}-${label}`} className="flex-1 text-body font-medium">
          {label}
        </span>
      </div>
      <div role="group" aria-labelledby={`choice-${cat}-${label}`} className="flex flex-wrap gap-2 mt-3">
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={value === o.value} onClick={() => onChange(value === o.value ? undefined : o.value)} />
        ))}
      </div>
    </div>
  )
}

/** Yes/no flags as chips on one row, each its own answer (the day's pain at the toilet, urinary trouble…).
 * A chip pressed again goes back to "not answered", which is not the same as no. */
export function FlagRow({
  icon,
  cat,
  label,
  flags,
}: {
  icon: Icon
  cat: Category
  label: string
  flags: { label: string; value: boolean | undefined; onChange: (v: boolean | undefined) => void }[]
}) {
  return (
    <div className="px-4 pt-3.5 pb-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
      <div className="flex items-center gap-2.5">
        <CategoryIcon icon={icon} cat={cat} />
        <span className="flex-1 text-body font-medium">{label}</span>
      </div>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2 mt-3">
        {flags.map((f) => (
          <Chip key={f.label} label={f.label} selected={f.value === true} onClick={() => f.onChange(f.value === true ? undefined : true)} />
        ))}
      </div>
    </div>
  )
}

/** The joints the person feels as painful or swollen: yes or no, then which, by side. A feeling, not a count. */
export function JointsRow({ value, onChange, label }: { value: DailyEntry['jointsFelt']; onChange: (v: DailyEntry['jointsFelt']) => void; label: string }) {
  const t = useTranslation()
  const chosen = value?.joints ?? []
  const toggle = (joint: JointKey) => onChange({ yes: true, joints: chosen.includes(joint) ? chosen.filter((j) => j !== joint) : [...chosen, joint] })
  return (
    <>
      <ChoiceRow
        icon={IconBone}
        cat="activity"
        label={label}
        options={[
          { value: 'no', label: t.entryForm.joints.no },
          { value: 'yes', label: t.entryForm.joints.yes },
        ]}
        value={value === undefined ? undefined : value.yes ? 'yes' : 'no'}
        onChange={(v) => onChange(v === undefined ? undefined : { yes: v === 'yes' })}
      />
      {value?.yes && (
        <div className="px-4 pb-3.5">
          <p className="text-caption mb-2" style={{ color: 'var(--color-ink-muted)' }}>
            {t.entryForm.joints.which}
          </p>
          <div className="flex flex-col gap-2">
            {JOINT_REGIONS.map((region) => (
              <div key={region} role="group" aria-label={t.entryForm.joints.regions[region]} className="flex items-center gap-2">
                <span className="w-24 text-control">{t.entryForm.joints.regions[region]}</span>
                {(['left', 'right'] as const).map((side) => {
                  const joint = `${side}${region.charAt(0).toUpperCase()}${region.slice(1)}` as JointKey
                  return <Chip key={joint} label={t.bodyMap[side]} selected={chosen.includes(joint)} onClick={() => toggle(joint)} />
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/** A headache day, for illnesses that come in attacks: yes or no, and only on a yes what goes with it. */
export function HeadacheBlock({ value, onChange, knownTriggers }: { value: DailyEntry['headache']; onChange: (v: DailyEntry['headache']) => void; knownTriggers: string[] }) {
  const t = useTranslation().entryForm.headache
  const set = (patch: Partial<NonNullable<DailyEntry['headache']>>) => onChange({ ...(value ?? { today: true }), today: true, ...patch })
  return (
    <>
      <ChoiceRow
        icon={IconBrain}
        cat="pain"
        label={t.question}
        options={[
          { value: 'no', label: t.no },
          { value: 'yes', label: t.yes },
        ]}
        value={value === undefined ? undefined : value.today ? 'yes' : 'no'}
        onChange={(v) => onChange(v === undefined ? undefined : v === 'yes' ? { ...(value ?? {}), today: true } : { today: false })}
      />
      {value?.today && (
        <>
          <ChoiceRow
            icon={IconClock}
            cat="pain"
            label={t.duration}
            options={HEADACHE_DURATIONS.map((d) => ({ value: d, label: t.durations[d] }))}
            value={value.duration}
            onChange={(v) => set({ duration: v as NonNullable<DailyEntry['headache']>['duration'] })}
          />
          <FlagRow
            icon={IconBrain}
            cat="pain"
            label={t.with}
            flags={[
              { label: t.aura, value: value.aura, onChange: (v) => set({ aura: v }) },
              { label: t.nausea, value: value.nausea, onChange: (v) => set({ nausea: v }) },
              { label: t.sensitivity, value: value.sensitivity, onChange: (v) => set({ sensitivity: v }) },
              { label: t.acuteMed, value: value.acuteMed, onChange: (v) => set({ acuteMed: v }) },
            ]}
          />
          <div className="px-4 pb-3.5">
            <p className="text-caption mb-2" style={{ color: 'var(--color-ink-muted)' }}>
              {t.triggers}
            </p>
            <TagInput values={value.triggers ?? []} onChange={(v) => set({ triggers: v })} placeholder={t.triggersPlaceholder} label={t.triggers} suggestions={knownTriggers} />
          </div>
        </>
      )}
    </>
  )
}
