import { Fragment, type ReactNode } from 'react'
import {
  IconActivityHeartbeat,
  IconBattery2,
  IconBed,
  IconBolt,
  IconBrain,
  IconClock,
  IconDroplet,
  IconHandStop,
  IconMoodSmile,
  IconMoon,
  IconSunrise,
  IconWalk,
  type Icon,
} from '@tabler/icons-react'
import {
  LEG_PAIN_LEVELS,
  MORNING_STIFFNESS_BANDS,
  NIGHT_WAKINGS,
  PERIOD_FLOWS,
  REFRESHED_LEVELS,
  SYMPTOM_TAGS,
  type DailyEntry,
  type FactorKey,
  type Settings,
} from '../../db/types'
import type { Translations } from '../../i18n'
import { ChoiceRow, FlagRow, HeadacheBlock, JointsRow, MetricRow, type Category } from './EntryFields'

// The rows of "Measures" on the day's page, one entry per indicator, in the order they are shown.
// A row is shown when the indicator it belongs to is followed and offered (`needs`, all of them),
// plus whatever else it asks for (`when`). Adding an indicator to the form is adding a line here.

export interface RowContext {
  t: Translations
  intlLocale: string
  local: Partial<DailyEntry>
  setField: <K extends keyof DailyEntry>(key: K, value: DailyEntry[K]) => void
  settings: Settings
  /** The indicator is followed and offered. */
  has: (key: FactorKey) => boolean
  /** The triggers typed on earlier headache days, offered again. */
  knownTriggers: string[]
}

interface EntryRow {
  key: string
  needs: FactorKey[]
  when?: (c: RowContext) => boolean
  render: (c: RowContext) => ReactNode
}

type NumericField = {
  [K in keyof DailyEntry]-?: NonNullable<DailyEntry[K]> extends number ? K : never
}[keyof DailyEntry]

/** A 0-10 slider (or another range) that writes a number field of the entry. */
function slider(spec: {
  key: string
  needs: FactorKey[]
  when?: (c: RowContext) => boolean
  field: NumericField
  icon: Icon
  cat: Category
  label: (t: Translations) => string
  ends: (t: Translations) => [string, string]
  max?: number
  step?: number
  format?: (v: number, intlLocale: string) => string
}): EntryRow {
  return {
    key: spec.key,
    needs: spec.needs,
    when: spec.when,
    render: ({ t, local, setField, intlLocale }) => (
      <MetricRow
        icon={spec.icon}
        cat={spec.cat}
        label={spec.label(t)}
        value={local[spec.field] as number | undefined}
        onChange={(v) => setField(spec.field, v as never)}
        max={spec.max}
        step={spec.step}
        formatValue={spec.format ? (v) => spec.format!(v, intlLocale) : undefined}
        endLabels={spec.ends(t)}
      />
    ),
  }
}

type ChoiceField = 'morningStiffness' | 'wakingRefreshed' | 'periodFlow' | 'legPain'

/** A choice among a few named bands that writes a text field of the entry. */
function choice(spec: {
  key: string
  needs: FactorKey[]
  when?: (c: RowContext) => boolean
  field: ChoiceField
  icon: Icon
  cat: Category
  label: (t: Translations) => string
  options: (t: Translations) => { value: string; label: string }[]
}): EntryRow {
  return {
    key: spec.key,
    needs: spec.needs,
    when: spec.when,
    render: ({ t, local, setField }) => (
      <ChoiceRow
        icon={spec.icon}
        cat={spec.cat}
        label={spec.label(t)}
        options={spec.options(t)}
        value={local[spec.field]}
        onChange={(v) => setField(spec.field, v as never)}
      />
    ),
  }
}

/** One yes chip that writes a boolean field. */
function flag(spec: { key: string; needs: FactorKey[]; field: 'feverInfection' | 'newSymptom'; icon: Icon; cat: Category; label: (t: Translations) => string }): EntryRow {
  return {
    key: spec.key,
    needs: spec.needs,
    render: ({ t, local, setField }) => (
      <FlagRow icon={spec.icon} cat={spec.cat} label={spec.label(t)} flags={[{ label: t.entryForm.joints.yes, value: local[spec.field], onChange: (v) => setField(spec.field, v) }]} />
    ),
  }
}

const ROWS: EntryRow[] = [
  slider({ key: 'fatigue', needs: ['fatigue'], field: 'fatigueLevel', icon: IconBattery2, cat: 'fatigue', label: (t) => t.factors.fatigue.label, ends: (t) => [t.entryForm.fatigueEndFine, t.entryForm.fatigueEndExhausted] }),
  slider({ key: 'sleepQuality', needs: ['sleep'], field: 'sleepQuality', icon: IconMoon, cat: 'sleep', label: (t) => t.entryForm.sleepQuality, ends: (t) => [t.entryForm.sleepEndBad, t.entryForm.sleepEndExcellent] }),
  slider({
    key: 'sleepHours',
    needs: ['sleep'],
    field: 'sleepHours',
    icon: IconClock,
    cat: 'sleep',
    label: (t) => t.entryForm.sleepDuration,
    ends: () => ['0 h', '12 h'],
    max: 12,
    step: 0.5,
    format: (v, intlLocale) => `${new Intl.NumberFormat(intlLocale).format(v)} h`,
  }),
  {
    key: 'nightWakings',
    needs: ['sleep', 'nightWaking'],
    render: ({ t, local, setField }) => (
      <ChoiceRow
        icon={IconBed}
        cat="sleep"
        label={t.factors.nightWaking.label}
        options={NIGHT_WAKINGS.map((n) => ({ value: String(n), label: t.entryForm.nightWakingOptions[n] }))}
        value={local.nightWakings === undefined ? undefined : String(local.nightWakings)}
        onChange={(v) => setField('nightWakings', v === undefined ? undefined : (Number(v) as DailyEntry['nightWakings']))}
      />
    ),
  },
  choice({
    key: 'wakingRefreshed',
    needs: ['sleep', 'unrefreshedWaking'],
    field: 'wakingRefreshed',
    icon: IconMoon,
    cat: 'sleep',
    label: (t) => t.factors.unrefreshedWaking.label,
    options: (t) => REFRESHED_LEVELS.map((l) => ({ value: l, label: t.entryForm.refreshedOptions[l] })),
  }),
  choice({
    key: 'morningStiffness',
    needs: ['morningStiffness'],
    field: 'morningStiffness',
    icon: IconSunrise,
    cat: 'activity',
    label: (t) => t.factors.morningStiffness.label,
    options: (t) => MORNING_STIFFNESS_BANDS.map((b) => ({ value: b, label: t.entryForm.morningStiffnessBands[b] })),
  }),
  slider({
    key: 'morningStiffnessSeverity',
    needs: ['morningStiffness'],
    when: (c) => c.settings.morningStiffnessSeverityEnabled,
    field: 'morningStiffnessSeverity',
    icon: IconSunrise,
    cat: 'activity',
    label: (t) => t.entryForm.morningStiffnessSeverity,
    ends: (t) => [t.entryForm.morningStiffnessEndNone, t.entryForm.morningStiffnessEndStrong],
  }),
  {
    key: 'jointsFelt',
    needs: ['swollenJoints'],
    render: ({ t, local, setField }) => <JointsRow label={t.factors.swollenJoints.label} value={local.jointsFelt} onChange={(v) => setField('jointsFelt', v)} />,
  },
  {
    key: 'headache',
    needs: ['headacheEpisode'],
    render: ({ local, setField, knownTriggers }) => <HeadacheBlock value={local.headache} onChange={(v) => setField('headache', v)} knownTriggers={knownTriggers} />,
  },
  {
    key: 'bowelBladder',
    needs: ['bowelBladder'],
    render: ({ t, local, setField }) => (
      <FlagRow
        icon={IconDroplet}
        cat="cycle"
        label={t.factors.bowelBladder.label}
        flags={[
          { label: t.entryForm.bowelPain, value: local.bowelPain, onChange: (v) => setField('bowelPain', v) },
          { label: t.entryForm.urinary, value: local.urinary, onChange: (v) => setField('urinary', v) },
        ]}
      />
    ),
  },
  choice({
    key: 'periodFlow',
    needs: ['periodFlow'],
    when: (c) => c.settings.cycleTrackingEnabled,
    field: 'periodFlow',
    icon: IconDroplet,
    cat: 'cycle',
    label: (t) => t.factors.periodFlow.label,
    options: (t) => PERIOD_FLOWS.map((f) => ({ value: f, label: t.entryForm.periodFlowOptions[f] })),
  }),
  {
    key: 'offCycleBleeding',
    needs: ['periodFlow'],
    when: (c) => c.settings.cycleTrackingEnabled,
    render: ({ t, local, setField }) => (
      <FlagRow
        icon={IconDroplet}
        cat="cycle"
        label={t.entryForm.offCycleBleeding}
        flags={[{ label: t.entryForm.offCycleBleeding, value: local.offCycleBleeding, onChange: (v) => setField('offCycleBleeding', v) }]}
      />
    ),
  },
  choice({
    key: 'legPain',
    needs: ['legPain'],
    field: 'legPain',
    icon: IconWalk,
    cat: 'pain',
    label: (t) => t.factors.legPain.label,
    options: (t) => LEG_PAIN_LEVELS.map((l) => ({ value: l, label: t.entryForm.legPainOptions[l] })),
  }),
  slider({ key: 'spasms', needs: ['spasms'], field: 'spasms', icon: IconWalk, cat: 'activity', label: (t) => t.factors.spasms.label, ends: (t) => [t.entryForm.spasmsEndNone, t.entryForm.spasmsEndStrong] }),
  slider({
    key: 'sensorySensitivity',
    needs: ['sensorySensitivity'],
    field: 'sensorySensitivity',
    icon: IconBolt,
    cat: 'stress',
    label: (t) => t.factors.sensorySensitivity.label,
    ends: (t) => [t.entryForm.sensoryEndNone, t.entryForm.sensoryEndStrong],
  }),
  {
    key: 'symptomTags',
    needs: ['symptomTags'],
    render: ({ t, local, setField }) => {
      const ticked = local.symptomTags ?? []
      return (
        <FlagRow
          icon={IconBrain}
          cat="fog"
          label={t.factors.symptomTags.label}
          flags={SYMPTOM_TAGS.map((tag) => ({
            label: t.entryForm.symptomTagLabels[tag],
            value: ticked.includes(tag) ? true : undefined,
            onChange: (v) => setField('symptomTags', v ? [...ticked, tag] : ticked.filter((x) => x !== tag)),
          }))}
        />
      )
    },
  },
  flag({ key: 'feverInfection', needs: ['feverInfection'], field: 'feverInfection', icon: IconActivityHeartbeat, cat: 'pain', label: (t) => t.factors.feverInfection.label }),
  flag({ key: 'newSymptom', needs: ['newSymptomMarker'], field: 'newSymptom', icon: IconActivityHeartbeat, cat: 'fog', label: (t) => t.factors.newSymptomMarker.label }),
  slider({
    key: 'dailyInterference',
    needs: ['dailyInterference'],
    field: 'dailyInterference',
    icon: IconHandStop,
    cat: 'activity',
    label: (t) => t.factors.dailyInterference.label,
    ends: (t) => [t.entryForm.dailyInterferenceEndNone, t.entryForm.dailyInterferenceEndMax],
  }),
  slider({ key: 'stress', needs: ['stress'], field: 'stressLevel', icon: IconBolt, cat: 'stress', label: (t) => t.factors.stress.label, ends: (t) => [t.entryForm.stressEndCalm, t.entryForm.stressEndTense] }),
  slider({ key: 'brainFog', needs: ['brainFog'], field: 'brainFog', icon: IconBrain, cat: 'fog', label: (t) => t.factors.brainFog.label, ends: (t) => [t.entryForm.brainFogEndClear, t.entryForm.brainFogEndConfused] }),
  slider({ key: 'mood', needs: ['mood'], field: 'moodLevel', icon: IconMoodSmile, cat: 'mood', label: (t) => t.factors.mood.label, ends: (t) => [t.entryForm.moodEndHard, t.entryForm.moodEndGreat] }),
  slider({ key: 'activity', needs: ['activity'], field: 'activityLevel', icon: IconWalk, cat: 'activity', label: (t) => t.factors.activity.label, ends: (t) => [t.entryForm.activityEndRest, t.entryForm.activityEndIntense] }),
]

/** The rows to show for this person and this day, in order. */
export function entryRows(c: RowContext): ReactNode[] {
  return ROWS.filter((row) => row.needs.every(c.has) && (row.when?.(c) ?? true)).map((row) => <Fragment key={row.key}>{row.render(c)}</Fragment>)
}
