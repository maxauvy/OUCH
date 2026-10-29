import {
  IconActivityHeartbeat,
  IconAdjustmentsHorizontal,
  IconArrowDownRight,
  IconArrowRight,
  IconArrowUpRight,
  IconDroplet,
  IconLeaf,
  IconMapPin,
  IconPencil,
  IconPill,
  IconSunrise,
  IconCloud,
} from '@tabler/icons-react'
import { MORNING_STIFFNESS_BANDS, type DailyEntry, type FactorKey, type Medication, type PainWeather, type Settings } from '../../db/types'
import { computePainWeather } from '../../lib/painWeather'
import { shiftISO } from '../../lib/dates'
import { CategoryIcon, ChoiceRow } from './EntryFields'
import { entryRows } from './entryRows'
import { painVsRecent } from '../../lib/painTrend'
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
import { todayISO } from '../../lib/dates'

/** Pain for the 7 days ending on `date`, oldest first (undefined = no entry). */
function lastSevenDays(date: string, byDate: Map<string, DailyEntry>, current: number | undefined) {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = shiftISO(date, i - 6)
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
  const has = (key: FactorKey) => settings.enabledFactors.includes(key) && isOffered(key, earlyAccess)
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
  // The same reading as the shared card: the 6 days before, at least 3 of them logged.
  const vsRecent = local.painLevel === undefined ? null : painVsRecent(date, local.painLevel, allEntries)
  const deltaText = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 }).format(Math.abs(vsRecent?.delta ?? 0))

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

  const metricRows = entryRows({ t, intlLocale, local, setField, settings, has, knownTriggers })

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
                {vsRecent && (
                  <p
                    className="text-caption mt-1.5 flex items-center gap-1"
                    style={{
                      color:
                        vsRecent.trend === 'same' ? 'var(--color-ink-muted)' : vsRecent.trend === 'lower' ? 'var(--cat-mood)' : 'var(--cat-pain)',
                    }}
                  >
                    {vsRecent.trend === 'same' ? (
                      <>
                        <IconArrowRight size={14} aria-hidden /> {t.entryForm.vsAverageSame}
                      </>
                    ) : vsRecent.trend === 'lower' ? (
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

      {/* The flow, when it is followed, says the same thing: one question, not two. */}
      {!lightToday && settings.cycleTrackingEnabled && !has('periodFlow') && (
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
