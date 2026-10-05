import type { ReactNode } from 'react'
import { format as formatDate, subDays } from 'date-fns'
import {
  IconActivityHeartbeat,
  IconArrowDownRight,
  IconArrowRight,
  IconArrowUpRight,
  IconBattery2,
  IconBolt,
  IconBrain,
  IconClock,
  IconCloud,
  IconDroplet,
  IconMoodSmile,
  IconMoon,
  IconWalk,
  type Icon,
} from '@tabler/icons-react'
import type { BodyZone, DailyEntry, Medication, PainWeather, Settings } from '../../db/types'
import { BODY_ZONES } from '../../db/types'
import { todayISO } from '../../db'
import { computePainWeather } from '../../lib/painWeather'
import { Card, GroupCaption } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import { WeatherIcon } from '../ui/WeatherIcon'
import { TagInput } from './TagInput'
import { MedicationsField } from './MedicationsField'
import { WeatherField } from './WeatherField'
import { format, useLocale, useTranslation } from '../../i18n'

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
  const tint = weather?.color ?? 'var(--color-ink-muted)'
  return (
    <div
      className="rounded-[var(--radius-card)] px-4 py-3.5 flex items-center gap-3.5"
      style={{ background: `color-mix(in srgb, ${tint} ${weather ? 16 : 8}%, var(--color-surface))` }}
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
          <span className="text-caption ml-1.5" style={{ color: 'var(--color-ink-muted)' }}>
            {weather ? format(t.weatherCard.levelOf, { n: weather.level }) : '\u00a0'}
          </span>
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
  medications,
  knownPositiveActions,
}: {
  date: string
  local: Partial<DailyEntry>
  setField: <K extends keyof DailyEntry>(key: K, value: DailyEntry[K]) => void
  settings: Settings
  saveState: 'idle' | 'saving' | 'saved'
  allEntries: DailyEntry[]
  medications: Medication[]
  knownPositiveActions: string[]
}) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const has = (key: string) => settings.enabledFactors.includes(key as never)
  const isToday = date === todayISO()

  const d = new Date(date + 'T00:00:00')
  const longDate = d.toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })
  const longDateCap = longDate.charAt(0).toUpperCase() + longDate.slice(1)

  const byDate = new Map(allEntries.map((e) => [e.date, e]))
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

  const zones = local.painLocations ?? []
  function toggleZone(z: BodyZone) {
    setField('painLocations', zones.includes(z) ? zones.filter((x) => x !== z) : [...zones, z])
  }

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div>
          {isToday && (
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {longDateCap}
            </p>
          )}
          <h1 className="text-title font-bold leading-tight">{isToday ? t.tabs.today : longDateCap}</h1>
        </div>
        {isToday && settings.displayName && (
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-caption font-semibold"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
            aria-hidden
          >
            {initials(settings.displayName)}
          </span>
        )}
      </div>

      <WeatherHero weather={local.painLevel === undefined ? null : weather} />

      <Card className="!p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CategoryIcon icon={IconActivityHeartbeat} cat="pain" />
            <span className="text-body font-semibold">{t.entryForm.pain}</span>
          </span>
          <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {statusText}
          </span>
        </div>

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

      </Card>

      {has('painLocations') && (
        <>
          <GroupCaption>{t.entryForm.whereHurts}</GroupCaption>
          <Card className="!p-4">
            <div className="flex flex-wrap gap-2">
              {BODY_ZONES.map((z) => (
                <Chip key={z} label={t.bodyZones[z]} selected={zones.includes(z)} onClick={() => toggleZone(z)} />
              ))}
            </div>
          </Card>
        </>
      )}

      {metricRows.length > 0 && (
        <>
          <GroupCaption>{t.entryForm.measuresTitle}</GroupCaption>
          {/* The first row's top border would double the card's own edge. */}
          <Card className="!p-0 overflow-hidden [&>div:first-child]:!border-t-0">{metricRows}</Card>
        </>
      )}

      {has('weather') && (
        <Card className="!p-4">
          <WeatherField date={date} value={local.weather} onChange={(w) => setField('weather', w)} settings={settings} />
        </Card>
      )}

      {has('medications') && (
        <>
          <GroupCaption>{t.entryForm.medicationsTaken}</GroupCaption>
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
      )}

      {has('positiveActions') && (
        <>
          <GroupCaption>{t.entryForm.positiveActionsTitle}</GroupCaption>
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

      {settings.cycleTrackingEnabled && (
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

      {has('notes') && (
        <>
          <GroupCaption>{t.entryForm.notes}</GroupCaption>
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
      )}
    </div>
  )
}
