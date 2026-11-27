import { useState, type ReactNode } from 'react'
import { PhysioExercisesCard } from '../physio/PhysioExercisesCard'
import { physioActive } from '../../lib/physio'
import {
  IconActivityHeartbeat,
  IconAdjustmentsHorizontal,
  IconArrowDownRight,
  IconArrowRight,
  IconArrowUpRight,
  IconDroplet,
  IconLeaf,
  IconMapPin,
  IconMessageCircle,
  IconPencil,
  IconPill,
  IconSettings,
  IconSunrise,
  IconCloud, IconMoon } from '@tabler/icons-react'
import { MORNING_STIFFNESS_BANDS, type DailyEntry, type FactorKey, type Medication, type PainWeather, type Settings } from '../../db/types'
import { WEATHER_SCALE_GRADIENT, colorForPainValue, computePainWeather, inkForPainValue } from '../../lib/painWeather'
import { shiftISO } from '../../lib/dates'
import { daysLate } from '../../lib/lateEntries'
import { CategoryIcon, ChoiceRow } from './EntryFields'
import { entryRows } from './entryRows'
import { painVsRecent } from '../../lib/painTrend'
import { Card, GroupCaption } from '../ui/Card'
import { BodyMap } from './BodyMap'
import { Slider } from '../ui/Slider'
import { FlarePainScale } from './FlarePainScale'
import { ContributorsCard } from './ContributorsCard'
import { isUnusual, unusualDay } from '../../lib/contributors'
import { RestDayCard } from './RestDay'
import { DayApart } from './DayApart'
import { isRestDay } from '../../lib/restDay'
import { Toggle } from '../ui/Toggle'
import { WeatherIcon } from '../ui/WeatherIcon'
import { TagInput } from './TagInput'
import { MedicationsField } from './MedicationsField'
import { HardDaysCard } from './HardDaysCard'
import { PainWordsField } from './PainWordsField'
import { wordsToOffer } from '../../lib/painWords'
import { NoteInviteCard } from '../relief/GoodDayNote'
import { LightExtras, type LightItem } from './LightExtras'
import { LastBackupLine } from '../backup/LastBackupLine'
import { useHardDays } from '../../hooks/useHardDays'
import { updateSettings } from '../../db'
import { WeatherField } from './WeatherField'
import { TodaySkyBackdrop, TodaySkyLine } from './TodaySky'
import { format, useLocale, useTranslation } from '../../i18n'
import { useRichLook } from '../../lib/look'
import { AppLogo } from '../ui/AppLogo'
import { FloatingTop } from '../layout/FloatingTop'
import { useScrolledAway } from '../../hooks/useScrolledAway'
import { isOffered } from '../../lib/indicatorCatalog'
import { useEarlyAccess } from '../../lib/earlyAccess'
import { todayISO } from '../../lib/dates'
import { dayPart } from '../../lib/dayPart'

/** Pain for the 7 days ending on `date`, oldest first (undefined = no entry). */
function lastSevenDays(date: string, byDate: Map<string, DailyEntry>, current: number | undefined) {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = shiftISO(date, i - 6)
    return iso === date ? current : byDate.get(iso)?.painLevel
  })
}

/** The last seven days of pain, today last. In the weather look each bar takes the colour of its weather. */
function PainBars({ values, weather = false }: { values: (number | undefined)[]; weather?: boolean }) {
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
                  : weather
                    ? isLast
                      ? colorForPainValue(v)
                      : `color-mix(in srgb, ${colorForPainValue(v)} 45%, transparent)`
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

/** The day's pain weather, above the pain score: it follows the pain slider, so
 * moving it visibly changes the sky. Always there, empty until a pain level
 * is set, so logging the first value doesn't push the page down. */
function WeatherHero({ weather }: { weather: PainWeather | null }) {
  const t = useTranslation()
  const look = useRichLook()
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
        {weather ? (
          <span className="weather-sway flex">
            <WeatherIcon name={weather.icon as never} size={40} className={weather.icon === 'sun' ? 'weather-turn' : undefined} />
          </span>
        ) : (
          <IconCloud size={36} stroke={1.5} />
        )}
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
  onOpenSettings,
  headerAction,
  afterHeader,
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
  /** On today's page: the gear in the corner that opens the settings. */
  onOpenSettings?: () => void
  /** On today's page: a round button before the gear (« Nouveautés »). */
  headerAction?: ReactNode
  /** Under the title, on the day's page: the line that says what waits. */
  afterHeader?: ReactNode
}) {
  const t = useTranslation()
  const { intlLocale } = useLocale()
  const earlyAccess = useEarlyAccess()
  const physio = physioActive(settings, earlyAccess)
  const has = (key: FactorKey) => settings.enabledFactors.includes(key) && isOffered(key, earlyAccess)
  const isToday = date === todayISO()
  // The weather look: titles inside the cards, no small icons in front of them; today's page opens on the day's sky.
  const rich = useRichLook()
  const sky = rich && isToday
  const { ready, card, light, invite } = useHardDays(date, allEntries, entriesLoaded)
  // Only today's page: another day is edited in full.
  const lightToday = isToday && light
  // A quiet day the person chose: its own card says what changes, so the hard days card and the notice about the short form are left out.
  const restToday = isRestDay(allEntries, date)
  // "What may have played a part?": on a day that stands out from the person's usual (and only if suggestions are on), or one where it was already answered; never on the lighter form.
  const showContributors = !lightToday && ((local.contributors?.length ?? 0) > 0 || (settings.suggestionsEnabled && !restToday && isUnusual(unusualDay(local, allEntries, date))))

  const d = new Date(date + 'T00:00:00')
  const longDate = d.toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })
  const longDateCap = longDate.charAt(0).toUpperCase() + longDate.slice(1)

  const byDate = new Map(allEntries.map((e) => [e.date, e]))
  const knownTriggers = Array.from(new Set(allEntries.flatMap((e) => e.headache?.triggers ?? []))).slice(0, 30)
  const bars = lastSevenDays(date, byDate, local.painLevel)
  // The same reading as the shared card: the 6 days before, at least 3 of them logged.
  const vsRecent = local.painLevel === undefined ? null : painVsRecent(date, local.painLevel, allEntries)
  const deltaText = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 }).format(Math.abs(vsRecent?.delta ?? 0))

  const weather = computePainWeather({ painLevel: local.painLevel ?? 0 })
  // Today: the header, whose bell and settings float in at the top right once it has scrolled away.
  const [headAnchor, headAway] = useScrolledAway()
  // A past day (the Journal): once its title has scrolled away, a bar at the top keeps the day and its weather in view down the long form.
  const [dayAnchor, dayAway] = useScrolledAway()
  const dayBar = !isToday && (
    <FloatingTop away={dayAway}>
      <div className="flex items-center gap-2.5 px-2.5 py-1">
        {local.painLevel !== undefined && (
          <span className="w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--color-surface)', color: weather.text }} aria-hidden>
            <WeatherIcon name={weather.icon as never} size={22} />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-body font-semibold leading-tight truncate">{longDateCap}</span>
          {local.painLevel !== undefined && (
            <span className="block text-caption leading-tight truncate" style={{ color: 'var(--color-ink-muted)' }}>
              {t.painWeatherLevels[weather.level]} · {format(t.entryForm.skyPain, { n: local.painLevel })}
            </span>
          )}
        </span>
      </div>
    </FloatingTop>
  )

  // "Logged at 20:14", or, for a day written down afterwards, when it was
  // written: a plain statement, nothing to fix.
  const loggedText = (written: Date, late: number) => {
    const time = written.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' })
    if (late === 0) return format(t.entryForm.loggedAt, { time })
    if (late < 7) return format(t.entryForm.loggedLateDay, { day: written.toLocaleDateString(intlLocale, { weekday: 'long' }), time })
    return format(t.entryForm.loggedLateDate, { date: written.toLocaleDateString(intlLocale, { day: 'numeric', month: 'short' }), time })
  }

  const statusText =
    saveState === 'saving'
      ? t.entryForm.saving
      : saveState === 'saved'
        ? t.entryForm.saved
        : local.createdAt
          ? loggedText(new Date(local.createdAt), daysLate({ date, createdAt: local.createdAt }))
          : ''

  const metricRows = entryRows({ t, intlLocale, local, setField, settings, has, knownTriggers })

  // A part of the form under its name: a caption above the card, or, in the weather look, the card's own title.
  const titled = (caption: string, icon: typeof IconMapPin, tone: string, body: ReactNode) =>
    rich ? (
      <Card className="!p-4">
        <h2 className="section-title text-heading font-bold mb-3">{caption}</h2>
        {body}
      </Card>
    ) : (
      <>
        <GroupCaption icon={icon} tone={tone}>
          {caption}
        </GroupCaption>
        <Card className="!p-4">{body}</Card>
      </>
    )

  const zonesBlock = has('painLocations')
    ? titled(t.entryForm.whereHurts, IconMapPin, 'fog', <BodyMap value={local.painLocations ?? []} onChange={(zones) => setField('painLocations', zones)} />)
    : null
  const medicationsBlock = has('medications')
    ? titled(
        t.entryForm.medicationsTaken,
        IconPill,
        'meds',
        <MedicationsField
          date={date}
          medications={medications}
          intakes={local.intakes ?? []}
          onChange={(v) => setField('intakes', v)}
          placeholder={t.entryForm.addMedicationPlaceholder}
        />,
      )
    : null
  const wordsBlock = has('painWords')
    ? titled(t.painWords.title, IconMessageCircle, 'pain', <PainWordsField value={local.painWords} offer={wordsToOffer(allEntries, date)} onChange={(w) => setField('painWords', w)} />)
    : null
  const notesBlock = has('notes')
    ? titled(
        t.entryForm.notes,
        IconPencil,
        'weather',
        <>
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
          <p className="hidden pointer-coarse:block text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {t.entryForm.dictateHint}
          </p>
        </>,
      )
    : null

  // The lighter form: what follows the pain, offered one part at a time.
  const lightItems: LightItem[] = []
  if (wordsBlock) lightItems.push({ key: 'words', label: t.painWords.lightLabel, icon: IconMessageCircle, filled: (local.painWords?.length ?? 0) > 0, content: wordsBlock })
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

  const [hour] = useState(() => new Date().getHours())
  // One soft line under the title, only while nothing is noted and the form is the full one.
  const greeting = isToday && ready && !lightToday && !restToday &&local.painLevel === undefined ? t.today.greeting[dayPart(hour)] : null

  const header = (
      <div ref={isToday ? headAnchor : undefined} className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3 min-w-0">
        {/* The OUCH icon beside today's title, as OUCH Duo shows it at the top of its screens. */}
        {isToday && rich && <AppLogo size={44} className="shrink-0 rounded-[10px] shadow-[0_4px_12px_-4px_rgba(124,111,168,0.5)]" />}
        <div className="min-w-0">
          {isToday && (
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {longDateCap}
            </p>
          )}
          <h1 ref={isToday ? undefined : dayAnchor} className={`${isToday ? 'dawn-title ' : ''}text-title font-bold leading-tight`}>{isToday ? t.tabs.today : longDateCap}</h1>
          {greeting && (
            <p className="text-control mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
              {greeting}
            </p>
          )}
          {isToday && onGoToBackup && <LastBackupLine onClick={onGoToBackup} />}
          {!isToday && restToday && (
            <p className="inline-flex items-center gap-1.5 text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              <IconMoon size={14} aria-hidden />
              {t.restDay.past}
            </p>
          )}
        </div>
        </div>
        {isToday && (onOpenSettings || headerAction) && (
          <div className="-mr-1 flex shrink-0 items-center gap-2">
            {headerAction}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label={t.today.openSettings}
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--avatar-bg, var(--color-brand-soft))', color: 'var(--color-brand)' }}
              >
                <IconSettings size={22} stroke={1.8} aria-hidden />
              </button>
            )}
          </div>
        )}
        {/* Once the header has scrolled away, its two buttons stay at hand: round glass buttons at the top right, in a mirror of the way back of other pages. */}
        {isToday && (onOpenSettings || headerAction) && (
          <div
            aria-hidden={!headAway}
            inert={!headAway}
            className={`float-in float-rounds${headAway ? ' is-away' : ''} fixed z-40 flex gap-2`}
            style={{ top: 'calc(var(--root-pad-top, 0px) + 8px)', right: 'max(12px, env(safe-area-inset-right))' }}
          >
            {headerAction && <span className="glass-float flex rounded-full">{headerAction}</span>}
            {onOpenSettings && (
              <span className="glass-float flex rounded-full">
                <button type="button" onClick={onOpenSettings} aria-label={t.today.openSettings} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ color: 'var(--color-brand)' }}>
                  <IconSettings size={22} stroke={1.8} aria-hidden />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
  )

  // Until the settings and the journal are read, today's page cannot tell
  // which form it is: show the title only, rather than a full form that then
  // folds up.
  const dayWeather = local.painLevel === undefined ? null : weather
  if (isToday && !ready)
    return (
      <div className="flex flex-col gap-3">
        {/* Its own sky (a key of its own): the day's sky then shows at once when the page is ready, without fading in from this neutral one. */}
        {sky && <TodaySkyBackdrop key="loading" weather={null} />}
        {header}
        {dayBar}
      </div>
    )

  return (
    <div className="flex flex-col gap-3">
      {sky && <TodaySkyBackdrop weather={dayWeather} />}
      {header}
      {dayBar}
      {sky && <TodaySkyLine weather={dayWeather} painLevel={local.painLevel} />}
      {isToday && afterHeader}

      {isToday && restToday && <RestDayCard date={date} light={lightToday} />}

      {isToday && card && !restToday && <HardDaysCard date={date} card={card} light={lightToday} />}

      {isToday && invite && !card && !restToday && <NoteInviteCard flareStart={invite} />}

      {/* After the first day the card is gone, and this says why the form is
          short and how to get the rest. */}
      {lightToday && !card && !restToday && (
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

      {!lightToday && !sky && <WeatherHero weather={dayWeather} />}

      <Card className="!p-4" tour="pain">
        <div className="flex items-center justify-between gap-2">
          {rich ? (
            <h2 className="section-title text-heading font-bold">{t.entryForm.pain}</h2>
          ) : (
            <span className="flex items-center gap-2">
              <CategoryIcon icon={IconActivityHeartbeat} cat="pain" />
              <span className="text-body font-semibold">{t.entryForm.pain}</span>
            </span>
          )}
          <span className="text-caption inline-flex items-center gap-1" style={{ color: 'var(--color-ink-muted)' }}>
            {/* Just saved: a small check draws itself, as at the end of a Soulager exercise; it draws again at each save. */}
            {saveState === 'saved' && (
              <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden className="shrink-0">
                <path
                  className="save-check"
                  pathLength={1}
                  d="M5 10.5l3.2 3.2L15 6.8"
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span key={saveState} className={saveState === 'saved' ? 'save-text-in' : undefined}>
              {statusText}
            </span>
          </span>
        </div>
        <p className="text-caption mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
          {isToday ? t.entryForm.painWindowToday : t.entryForm.painWindowPast}
        </p>

        {lightToday ? (
          <FlarePainScale value={local.painLevel} onChange={(v) => setField('painLevel', v)} weather={sky} />
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
              <PainBars values={bars} weather={sky} />
            </div>

            <div className="mt-2">
              <Slider
                bare
                label={t.entryForm.pain}
                value={local.painLevel}
                onChange={(v) => setField('painLevel', v)}
                endLabels={[t.entryForm.painEndNone, t.entryForm.painEndExtreme]}
                accent={sky && local.painLevel !== undefined ? inkForPainValue(local.painLevel) : 'var(--cat-pain)'}
                fill={sky ? WEATHER_SCALE_GRADIENT : undefined}
              />
            </div>
          </>
        )}

        {isToday && <DayApart date={date} rest={restToday} />}
      </Card>

      {showContributors && <ContributorsCard date={date} selected={local.contributors} />}

      {/* The one new indicator the lighter form keeps: a single row of five choices, under the pain, optional. */}
      {lightToday && has('morningStiffness') && (
        <Card className="!p-0 overflow-hidden [&>div:first-child]:!border-t-0">
          <ChoiceRow
            icon={IconSunrise}
            cat="activity"
            asTitle={rich}
            label={t.factors.morningStiffness.label}
            options={MORNING_STIFFNESS_BANDS.map((b) => ({ value: b, label: t.entryForm.morningStiffnessBands[b] }))}
            value={local.morningStiffness}
            onChange={(v) => setField('morningStiffness', v as DailyEntry['morningStiffness'])}
          />
        </Card>
      )}

      {lightToday && <LightExtras noted={local.painLevel !== undefined} items={lightItems} />}

      {!lightToday && wordsBlock}

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

      {!lightToday && physio && <PhysioExercisesCard date={date} local={local} setField={setField} settings={settings} allEntries={allEntries} />}
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
