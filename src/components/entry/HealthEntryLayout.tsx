import type { ReactNode } from 'react'
import { format as formatDate, subDays } from 'date-fns'
import {
  IconActivityHeartbeat,
  IconAdjustmentsHorizontal,
  IconArrowDownRight,
  IconArrowRight,
  IconArrowUpRight,
  IconBattery2,
  IconBed,
  IconBone,
  IconBolt,
  IconHandStop,
  IconBrain,
  IconClock,
  IconCloud,
  IconDroplet,
  IconLeaf,
  IconMapPin,
  IconPencil,
  IconPill,
  IconMoodSmile,
  IconMoon,
  IconSunrise,
  IconWalk,
  type Icon,
} from '@tabler/icons-react'
import {
  HEADACHE_DURATIONS,
  JOINT_REGIONS,
  LEG_PAIN_LEVELS,
  MORNING_STIFFNESS_BANDS,
  NIGHT_WAKINGS,
  PERIOD_FLOWS,
  REFRESHED_LEVELS,
  SYMPTOM_TAGS,
  type DailyEntry,
  type JointKey, type Medication, type PainWeather, type Settings } from '../../db/types'
import { computePainWeather } from '../../lib/painWeather'
import { Card, GroupCaption } from '../ui/Card'
import { BodyMap } from './BodyMap'
import { Slider } from '../ui/Slider'
import { FlarePainScale } from './FlarePainScale'
import { Toggle } from '../ui/Toggle'
import { WeatherIcon } from '../ui/WeatherIcon'
import { TagInput } from './TagInput'
import { MedicationsField } from './MedicationsField'
import { HardDaysCard } from './HardDaysCard'
import { LightExtras, type LightItem } from './LightExtras'
import { LastBackupLine } from '../backup/LastBackupLine'
import { useHardDays } from '../../hooks/useHardDays'
import { updateSettings } from '../../db'
import { WeatherField } from './WeatherField'
import { format, useLocale, useTranslation } from '../../i18n'
import { useLuminous } from '../../lib/look'
import { isOffered } from '../../lib/indicatorCatalog'
import { useEarlyAccess } from '../../lib/earlyAccess'
import { Chip } from '../ui/Chip'
import { todayISO } from '../../lib/dates'

type Category = 'pain' | 'fatigue' | 'sleep' | 'stress' | 'fog' | 'mood' | 'activity' | 'cycle'

function CategoryIcon({ icon: I, cat, size = 28 }: { icon: Icon; cat: Category; size?: number }) {
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

function MetricRow({
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
function ChoiceRow({
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
function FlagRow({
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
function JointsRow({ value, onChange, label }: { value: DailyEntry['jointsFelt']; onChange: (v: DailyEntry['jointsFelt']) => void; label: string }) {
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
function HeadacheBlock({ value, onChange, knownTriggers }: { value: DailyEntry['headache']; onChange: (v: DailyEntry['headache']) => void; knownTriggers: string[] }) {
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

/** Pain for the 7 days ending on `date`, oldest first (undefined = no entry). */
function lastSevenDays(date: string, byDate: Map<string, DailyEntry>, current: number | undefined) {
  const end = new Date(date + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const iso = formatDate(subDays(end, 6 - i), 'yyyy-MM-dd')
    return iso === date ? current : byDate.get(iso)?.painLevel
  })
}

function PainBars({ values }: { values: (number | undefined)[] }) {
  const H = 44
  return (
    <div className="flex items-end gap-[5px]" style={{ height: H }} aria-hidden>
      {values.map((v, i) => {
        const isLast = i === values.length - 1
        return (
          <span
            key={i}
            className="w-[11px] rounded-[2px]"
            style={{
              height: v === undefined ? 3 : Math.max(3, (v / 10) * H),
              background:
                v === undefined
                  ? 'var(--color-hairline)'
                  : isLast
                    ? 'var(--cat-pain)'
                    : 'color-mix(in srgb, var(--cat-pain) 28%, transparent)',
            }}
          />
        )
      })}
    </div>
  )
}

/** The day's pain weather, above the pain score: it follows the sliders, so
 * moving them visibly changes the sky. Always there, empty until a pain level
 * is set, so logging the first value doesn't push the page down. */
function WeatherHero({ weather }: { weather: PainWeather | null }) {
  const t = useTranslation()
  const look = useLuminous()
  const tint = weather?.color ?? 'var(--color-ink-muted)'
  const flat = `color-mix(in srgb, ${tint} ${weather ? 16 : 8}%, var(--color-surface))`
  return (
    <div
      className="rounded-[var(--radius-card)] px-4 py-3.5 flex items-center gap-3.5"
      style={{
        background: look
          ? `linear-gradient(135deg, ${flat}, color-mix(in srgb, var(--color-weather-5) ${weather ? 10 : 5}%, var(--color-surface)))`
          : flat,
        // A thin edge in the day's colour, so the card stands out from the background.
        boxShadow: look ? `inset 0 0 0 1px color-mix(in srgb, ${tint} 38%, transparent)` : undefined,
      }}
    >
      <span
        className="w-16 h-16 shrink-0 rounded-full flex items-center justify-center"
        style={{ background: 'var(--color-surface)', color: weather?.text ?? 'var(--color-ink-muted)' }}
        aria-hidden
      >
        {weather ? <WeatherIcon name={weather.icon as never} size={40} /> : <IconCloud size={36} stroke={1.5} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {t.entryForm.painWeatherOfDay}
        </p>
        <p
          className="text-title font-bold leading-tight"
          style={weather ? undefined : { color: 'var(--color-ink-muted)', fontWeight: 500 }}
        >
          {weather ? t.painWeatherLevels[weather.level] : t.entryForm.painWeatherEmpty}
        </p>
        <div className="flex items-center gap-1 mt-2" aria-hidden>
          {[1, 2, 3, 4, 5].map((l) => (
            <span
              key={l}
              className="h-[7px] rounded-full"
              style={{
                width: weather && l === weather.level ? 20 : 7,
                background: weather && l === weather.level ? weather.color : `color-mix(in srgb, ${tint} 30%, transparent)`,
              }}
            />
          ))}
          {look && weather ? (
            <span
              className="text-caption font-semibold ml-2 rounded-full px-2.5 py-0.5"
              style={{ background: 'var(--color-surface)', color: weather.text }}
            >
              {format(t.weatherCard.levelOf, { n: weather.level })}
            </span>
          ) : (
            <span className="text-caption ml-1.5" style={{ color: 'var(--color-ink-muted)' }}>
              {weather ? format(t.weatherCard.levelOf, { n: weather.level }) : '\u00a0'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function HealthEntryLayout({
  date,
  local,
  setField,
  settings,
  saveState,
  allEntries,
  entriesLoaded,
  medications,
  knownPositiveActions,
  onGoToBackup,
}: {
  date: string
  local: Partial<DailyEntry>
  setField: <K extends keyof DailyEntry>(key: K, value: DailyEntry[K]) => void
  settings: Settings
  saveState: 'idle' | 'saving' | 'saved'
  allEntries: DailyEntry[]
  /** False until the journal is read: `allEntries` is empty meanwhile */
  entriesLoaded: boolean
  medications: Medication[]
  knownPositiveActions: string[]
  /** Opens the backup section; the last-backup line under the title uses it */
  onGoToBackup?: () => void
}) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const earlyAccess = useEarlyAccess()
  const has = (key: string) => settings.enabledFactors.includes(key as never) && isOffered(key, earlyAccess)
  const isToday = date === todayISO()
  const { ready, card, light } = useHardDays(date, allEntries, entriesLoaded)
  // Only today's page: another day is edited in full.
  const lightToday = isToday && light

  const d = new Date(date + 'T00:00:00')
  const longDate = d.toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })
  const longDateCap = longDate.charAt(0).toUpperCase() + longDate.slice(1)

  const byDate = new Map(allEntries.map((e) => [e.date, e]))
  const knownTriggers = Array.from(new Set(allEntries.flatMap((e) => e.headache?.triggers ?? []))).slice(0, 30)
  const bars = lastSevenDays(date, byDate, local.painLevel)
  const previous = bars.slice(0, 6).filter((v): v is number => v !== undefined)
  const avg = previous.length ? previous.reduce((s, v) => s + v, 0) / previous.length : null
  const delta = avg !== null && local.painLevel !== undefined ? local.painLevel - avg : null
  const deltaText = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 }).format(Math.abs(delta ?? 0))

  const weather = computePainWeather({
    painLevel: local.painLevel ?? 0,
    fatigueLevel: local.fatigueLevel,
    brainFog: local.brainFog,
  })

  const statusText =
    saveState === 'saving'
      ? t.entryForm.saving
      : saveState === 'saved'
        ? t.entryForm.saved
        : local.createdAt
          ? format(t.entryForm.loggedAt, {
              time: new Date(local.createdAt).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' }),
            })
          : ''

  const metricRows: ReactNode[] = []
  if (has('fatigue'))
    metricRows.push(
      <MetricRow
        key="fatigue"
        icon={IconBattery2}
        cat="fatigue"
        label={t.factors.fatigue.label}
        value={local.fatigueLevel}
        onChange={(v) => setField('fatigueLevel', v)}
        endLabels={[t.entryForm.fatigueEndFine, t.entryForm.fatigueEndExhausted]}
      />
    )
  if (has('sleep'))
    metricRows.push(
      <MetricRow
        key="sleepQuality"
        icon={IconMoon}
        cat="sleep"
        label={t.entryForm.sleepQuality}
        value={local.sleepQuality}
        onChange={(v) => setField('sleepQuality', v)}
        endLabels={[t.entryForm.sleepEndBad, t.entryForm.sleepEndExcellent]}
      />,
      <MetricRow
        key="sleepHours"
        icon={IconClock}
        cat="sleep"
        label={t.entryForm.sleepDuration}
        value={local.sleepHours}
        onChange={(v) => setField('sleepHours', v)}
        max={12}
        step={0.5}
        formatValue={(v) => `${new Intl.NumberFormat(intlLocale).format(v)} h`}
        endLabels={['0 h', '12 h']}
      />
    )
  if (has('sleep') && has('nightWaking'))
    metricRows.push(
      <ChoiceRow
        key="nightWakings"
        icon={IconBed}
        cat="sleep"
        label={t.factors.nightWaking.label}
        options={NIGHT_WAKINGS.map((n) => ({ value: String(n), label: t.entryForm.nightWakingOptions[n] }))}
        value={local.nightWakings === undefined ? undefined : String(local.nightWakings)}
        onChange={(v) => setField('nightWakings', v === undefined ? undefined : (Number(v) as DailyEntry['nightWakings']))}
      />
    )
  if (has('sleep') && has('unrefreshedWaking'))
    metricRows.push(
      <ChoiceRow
        key="wakingRefreshed"
        icon={IconMoon}
        cat="sleep"
        label={t.factors.unrefreshedWaking.label}
        options={REFRESHED_LEVELS.map((l) => ({ value: l, label: t.entryForm.refreshedOptions[l] }))}
        value={local.wakingRefreshed}
        onChange={(v) => setField('wakingRefreshed', v as DailyEntry['wakingRefreshed'])}
      />
    )
  if (has('morningStiffness')) {
    metricRows.push(
      <ChoiceRow
        key="morningStiffness"
        icon={IconSunrise}
        cat="activity"
        label={t.factors.morningStiffness.label}
        options={MORNING_STIFFNESS_BANDS.map((b) => ({ value: b, label: t.entryForm.morningStiffnessBands[b] }))}
        value={local.morningStiffness}
        onChange={(v) => setField('morningStiffness', v as DailyEntry['morningStiffness'])}
      />
    )
    if (settings.morningStiffnessSeverityEnabled)
      metricRows.push(
        <MetricRow
          key="morningStiffnessSeverity"
          icon={IconSunrise}
          cat="activity"
          label={t.entryForm.morningStiffnessSeverity}
          value={local.morningStiffnessSeverity}
          onChange={(v) => setField('morningStiffnessSeverity', v)}
          endLabels={[t.entryForm.morningStiffnessEndNone, t.entryForm.morningStiffnessEndStrong]}
        />
      )
  }
  if (has('swollenJoints'))
    metricRows.push(<JointsRow key="jointsFelt" label={t.factors.swollenJoints.label} value={local.jointsFelt} onChange={(v) => setField('jointsFelt', v)} />)
  if (has('headacheEpisode'))
    metricRows.push(
      <HeadacheBlock key="headache" value={local.headache} onChange={(v) => setField('headache', v)} knownTriggers={knownTriggers} />
    )
  if (has('bowelBladder'))
    metricRows.push(
      <FlagRow
        key="bowelBladder"
        icon={IconDroplet}
        cat="cycle"
        label={t.factors.bowelBladder.label}
        flags={[
          { label: t.entryForm.bowelPain, value: local.bowelPain, onChange: (v) => setField('bowelPain', v) },
          { label: t.entryForm.urinary, value: local.urinary, onChange: (v) => setField('urinary', v) },
        ]}
      />
    )
  if (settings.cycleTrackingEnabled && has('periodFlow'))
    metricRows.push(
      <ChoiceRow
        key="periodFlow"
        icon={IconDroplet}
        cat="cycle"
        label={t.factors.periodFlow.label}
        options={PERIOD_FLOWS.map((f) => ({ value: f, label: t.entryForm.periodFlowOptions[f] }))}
        value={local.periodFlow}
        onChange={(v) => setField('periodFlow', v as DailyEntry['periodFlow'])}
      />,
      <FlagRow
        key="offCycleBleeding"
        icon={IconDroplet}
        cat="cycle"
        label={t.entryForm.offCycleBleeding}
        flags={[{ label: t.entryForm.offCycleBleeding, value: local.offCycleBleeding, onChange: (v) => setField('offCycleBleeding', v) }]}
      />
    )
  if (has('legPain'))
    metricRows.push(
      <ChoiceRow
        key="legPain"
        icon={IconWalk}
        cat="pain"
        label={t.factors.legPain.label}
        options={LEG_PAIN_LEVELS.map((l) => ({ value: l, label: t.entryForm.legPainOptions[l] }))}
        value={local.legPain}
        onChange={(v) => setField('legPain', v as DailyEntry['legPain'])}
      />
    )
  if (has('spasms'))
    metricRows.push(
      <MetricRow
        key="spasms"
        icon={IconWalk}
        cat="activity"
        label={t.factors.spasms.label}
        value={local.spasms}
        onChange={(v) => setField('spasms', v)}
        endLabels={[t.entryForm.spasmsEndNone, t.entryForm.spasmsEndStrong]}
      />
    )
  if (has('sensorySensitivity'))
    metricRows.push(
      <MetricRow
        key="sensorySensitivity"
        icon={IconBolt}
        cat="stress"
        label={t.factors.sensorySensitivity.label}
        value={local.sensorySensitivity}
        onChange={(v) => setField('sensorySensitivity', v)}
        endLabels={[t.entryForm.sensoryEndNone, t.entryForm.sensoryEndStrong]}
      />
    )
  if (has('symptomTags')) {
    const ticked = local.symptomTags ?? []
    metricRows.push(
      <FlagRow
        key="symptomTags"
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
  }
  if (has('feverInfection'))
    metricRows.push(
      <FlagRow
        key="feverInfection"
        icon={IconActivityHeartbeat}
        cat="pain"
        label={t.factors.feverInfection.label}
        flags={[{ label: t.entryForm.joints.yes, value: local.feverInfection, onChange: (v) => setField('feverInfection', v) }]}
      />
    )
  if (has('newSymptomMarker'))
    metricRows.push(
      <FlagRow
        key="newSymptom"
        icon={IconActivityHeartbeat}
        cat="fog"
        label={t.factors.newSymptomMarker.label}
        flags={[{ label: t.entryForm.joints.yes, value: local.newSymptom, onChange: (v) => setField('newSymptom', v) }]}
      />
    )
  if (has('dailyInterference'))
    metricRows.push(
      <MetricRow
        key="dailyInterference"
        icon={IconHandStop}
        cat="activity"
        label={t.factors.dailyInterference.label}
        value={local.dailyInterference}
        onChange={(v) => setField('dailyInterference', v)}
        endLabels={[t.entryForm.dailyInterferenceEndNone, t.entryForm.dailyInterferenceEndMax]}
      />
    )
  if (has('stress'))
    metricRows.push(
      <MetricRow
        key="stress"
        icon={IconBolt}
        cat="stress"
        label={t.factors.stress.label}
        value={local.stressLevel}
        onChange={(v) => setField('stressLevel', v)}
        endLabels={[t.entryForm.stressEndCalm, t.entryForm.stressEndTense]}
      />
    )
  if (has('brainFog'))
    metricRows.push(
      <MetricRow
        key="brainFog"
        icon={IconBrain}
        cat="fog"
        label={t.factors.brainFog.label}
        value={local.brainFog}
        onChange={(v) => setField('brainFog', v)}
        endLabels={[t.entryForm.brainFogEndClear, t.entryForm.brainFogEndConfused]}
      />
    )
  if (has('mood'))
    metricRows.push(
      <MetricRow
        key="mood"
        icon={IconMoodSmile}
        cat="mood"
        label={t.factors.mood.label}
        value={local.moodLevel}
        onChange={(v) => setField('moodLevel', v)}
        endLabels={[t.entryForm.moodEndHard, t.entryForm.moodEndGreat]}
      />
    )
  if (has('activity'))
    metricRows.push(
      <MetricRow
        key="activity"
        icon={IconWalk}
        cat="activity"
        label={t.factors.activity.label}
        value={local.activityLevel}
        onChange={(v) => setField('activityLevel', v)}
        endLabels={[t.entryForm.activityEndRest, t.entryForm.activityEndIntense]}
      />
    )

  const zonesBlock = has('painLocations') ? (
      <>
        <GroupCaption icon={IconMapPin} tone="fog">
          {t.entryForm.whereHurts}
        </GroupCaption>
        <Card className="!p-4">
          <BodyMap value={local.painLocations ?? []} onChange={(zones) => setField('painLocations', zones)} />
        </Card>
      </>
  ) : null
  const medicationsBlock = has('medications') ? (
      <>
        <GroupCaption icon={IconPill} tone="meds">
          {t.entryForm.medicationsTaken}
        </GroupCaption>
        <Card className="!p-4">
          <MedicationsField
            date={date}
            medications={medications}
            intakes={local.intakes ?? []}
            onChange={(v) => setField('intakes', v)}
            placeholder={t.entryForm.addMedicationPlaceholder}
          />
        </Card>
      </>
  ) : null
  const notesBlock = has('notes') ? (
      <>
        <GroupCaption icon={IconPencil} tone="weather">
          {t.entryForm.notes}
        </GroupCaption>
        <Card className="!p-4">
          <textarea
            value={local.notes ?? ''}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder={t.entryForm.notesPlaceholder}
            rows={3}
            className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none resize-none"
            style={{
              background: 'var(--color-input)',
              color: 'var(--color-ink)',
              boxShadow: 'inset 0 0 0 1px var(--color-input-ring)',
            }}
          />
        </Card>
      </>
  ) : null

  // The lighter form: what follows the pain, offered one part at a time.
  const lightItems: LightItem[] = []
  if (zonesBlock) lightItems.push({ key: 'zones', label: t.hardDays.lightZones, icon: IconMapPin, filled: (local.painLocations?.length ?? 0) > 0, content: zonesBlock })
  if (medicationsBlock)
    lightItems.push({
      key: 'meds',
      label: t.hardDays.lightMeds,
      icon: IconPill,
      // Never open on its own: a new day starts with the ongoing treatments
      // ticked, which says nothing about what the person chose to add.
      filled: false,
      content: medicationsBlock,
    })
  if (notesBlock) lightItems.push({ key: 'note', label: t.hardDays.lightNote, icon: IconPencil, filled: !!local.notes, content: notesBlock })

  const header = (
      <div className="flex items-center justify-between px-1">
        <div>
          {isToday && (
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {longDateCap}
            </p>
          )}
          <h1 className="text-title font-bold leading-tight">{isToday ? t.tabs.today : longDateCap}</h1>
          {isToday && onGoToBackup && <LastBackupLine onClick={onGoToBackup} />}
        </div>
        {isToday && settings.displayName && (
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-caption font-semibold"
            style={{ background: 'var(--avatar-bg, var(--color-brand-soft))', color: 'var(--color-brand)' }}
            aria-hidden
          >
            {initials(settings.displayName)}
          </span>
        )}
      </div>
  )

  // Until the settings and the journal are read, today's page cannot tell
  // which form it is: show the title only, rather than a full form that then
  // folds up.
  if (isToday && !ready) return <div className="flex flex-col gap-3">{header}</div>

  return (
    <div className="flex flex-col gap-3">
      {header}

      {isToday && card && <HardDaysCard date={date} card={card} light={lightToday} />}

      {/* After the first day the card is gone, and this says why the form is
          short and how to get the rest. */}
      {lightToday && !card && (
        <p className="text-control px-1" style={{ color: 'var(--color-ink-muted)' }}>
          {t.hardDays.lightNotice}{' '}
          <button
            type="button"
            onClick={() => void updateSettings({ fullFormDay: date })}
            className="font-semibold underline underline-offset-2"
            style={{ color: 'var(--color-brand)' }}
          >
            {t.hardDays.fullForm}
          </button>
        </p>
      )}

      {!lightToday && <WeatherHero weather={local.painLevel === undefined ? null : weather} />}

      <Card className="!p-4" tour="pain">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CategoryIcon icon={IconActivityHeartbeat} cat="pain" />
            <span className="text-body font-semibold">{t.entryForm.pain}</span>
          </span>
          <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {statusText}
          </span>
        </div>

        {lightToday ? (
          <FlarePainScale value={local.painLevel} onChange={(v) => setField('painLevel', v)} />
        ) : (
          <>
            <div className="flex items-end justify-between mt-3">
              <div>
                <p className="tabular-nums text-hero font-bold leading-none">
                  {local.painLevel ?? <span style={{ color: 'var(--color-ink-muted)' }}>—</span>}
                  <span className="text-body font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                    {' '}/ 10
                  </span>
                </p>
                {delta !== null && (
                  <p
                    className="text-caption mt-1.5 flex items-center gap-1"
                    style={{
                      color:
                        Math.abs(delta) < 0.25 ? 'var(--color-ink-muted)' : delta < 0 ? 'var(--cat-mood)' : 'var(--cat-pain)',
                    }}
                  >
                    {Math.abs(delta) < 0.25 ? (
                      <>
                        <IconArrowRight size={14} aria-hidden /> {t.entryForm.vsAverageSame}
                      </>
                    ) : delta < 0 ? (
                      <>
                        <IconArrowDownRight size={14} aria-hidden /> {format(t.entryForm.vsAverageBelow, { delta: deltaText })}
                      </>
                    ) : (
                      <>
                        <IconArrowUpRight size={14} aria-hidden /> {format(t.entryForm.vsAverageAbove, { delta: deltaText })}
                      </>
                    )}
                  </p>
                )}
              </div>
              <PainBars values={bars} />
            </div>

            <div className="mt-2">
              <Slider
                bare
                label={t.entryForm.pain}
                value={local.painLevel}
                onChange={(v) => setField('painLevel', v)}
                endLabels={[t.entryForm.painEndNone, t.entryForm.painEndExtreme]}
                accent="var(--cat-pain)"
              />
            </div>
          </>
        )}

      </Card>

      {/* The one new indicator the lighter form keeps: a single row of five choices, under the pain, optional. */}
      {lightToday && has('morningStiffness') && (
        <Card className="!p-0 overflow-hidden [&>div:first-child]:!border-t-0">
          <ChoiceRow
            icon={IconSunrise}
            cat="activity"
            label={t.factors.morningStiffness.label}
            options={MORNING_STIFFNESS_BANDS.map((b) => ({ value: b, label: t.entryForm.morningStiffnessBands[b] }))}
            value={local.morningStiffness}
            onChange={(v) => setField('morningStiffness', v as DailyEntry['morningStiffness'])}
          />
        </Card>
      )}

      {lightToday && <LightExtras noted={local.painLevel !== undefined} items={lightItems} />}

      {!lightToday && zonesBlock}

      {!lightToday && metricRows.length > 0 && (
        <>
          <GroupCaption icon={IconAdjustmentsHorizontal} tone="sleep">
            {t.entryForm.measuresTitle}
          </GroupCaption>
          {/* The first row's top border would double the card's own edge. */}
          <Card className="!p-0 overflow-hidden [&>div:first-child]:!border-t-0">{metricRows}</Card>
        </>
      )}

      {!lightToday && has('weather') && (
        <Card className="!p-4">
          <WeatherField date={date} value={local.weather} onChange={(w) => setField('weather', w)} settings={settings} />
        </Card>
      )}

      {!lightToday && medicationsBlock}

      {!lightToday && has('positiveActions') && (
        <>
          <GroupCaption icon={IconLeaf} tone="mood">
            {t.entryForm.positiveActionsTitle}
          </GroupCaption>
          <Card className="!p-4">
            <TagInput
              values={local.positiveActions ?? []}
              onChange={(v) => setField('positiveActions', v)}
              placeholder={t.entryForm.addPositiveActionPlaceholder}
              label={t.entryForm.positiveActionsTitle}
              suggestions={knownPositiveActions}
            />
          </Card>
        </>
      )}

      {!lightToday && settings.cycleTrackingEnabled && (
        <Card className="!p-4 flex items-center gap-3">
          <CategoryIcon icon={IconDroplet} cat="cycle" />
          <div className="flex-1">
            <p className="font-medium text-body">{t.entryForm.periodToday}</p>
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {t.entryForm.periodHelper}
            </p>
          </div>
          <Toggle checked={!!local.periodDay} onChange={(v) => setField('periodDay', v)} label={t.entryForm.periodToday} />
        </Card>
      )}

      {!lightToday && notesBlock}
    </div>
  )
}
