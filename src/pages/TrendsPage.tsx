import { useEffect, useMemo, useState } from 'react'
import { IconChartDots, IconChartLine, IconPill, IconUser, IconBodyScan } from '@tabler/icons-react'

import { Footer } from '../components/layout/Footer'
import { LinkRow } from '../components/ui/LinkRow'
import { PageBack } from '../components/layout/PageBack'
import { CompareCard } from '../components/trends/CompareCard'
import { PacingCard } from '../components/trends/PacingCard'
import { TimelineCard } from '../components/trends/TimelineCard'
import { TrialsCard } from '../components/trends/TrialsCard'
import { LeadsCard } from '../components/trends/LeadsCard'
import { MedicationsCard } from '../components/trends/MedicationsCard'
import { PainTrendChart, type ChartMarker } from '../components/trends/PainTrendChart'
import { TreatmentReviewCard } from '../components/trends/TreatmentReviewCard'
import { WeekdayCard, WeekdayWaiting } from '../components/trends/WeekdayCard'
import { ZonesFlaresCard, ZonesMapCard, ZonesWeeksCard } from '../components/trends/ZonesCards'
import { Card, GroupCaption, SectionTitle } from '../components/ui/Card'
import { Segmented } from '../components/ui/Segmented'
// The report, its charts and the page capture are fetched when it is opened.
import { useLoggedEntries } from '../hooks/useEntries'
import { useFlares } from '../hooks/useFlares'
import { useLeadList } from '../hooks/useLeadList'
import { useMedications } from '../hooks/useMedications'
import { usePalette } from '../hooks/usePalette'
import { useSettings } from '../hooks/useSettings'
import { updateSettings } from '../db'
import { flareDayCount, flareDaySet, flaresOverlapping } from '../lib/flares'
import { markedOverlapping, removeMarked } from '../lib/markedFlares'
import { lastOf } from '../lib/consultation'
import { remember } from '../lib/leadHints'
import { restartTrial, startTrial, type LeadTrial } from '../lib/leadTrial'
import { arrangeLeads, choiceFor, findLeads, leadFactors, PATTERN_MIN_DAYS, type Lead, type LeadChoice } from '../lib/leads'
import { updateLeadsSeen } from '../lib/leadsSeenStore'
import { formatPosology } from '../lib/medicationFormat'
import { treatmentEvents } from '../lib/treatmentEvents'
import { markedSpans, timelineItems, trialSpans } from '../lib/trendsTimeline'
import { weekdayProfile } from '../lib/weekdays'
import { format, useLocale, useTranslation } from '../i18n'
import { IndicatorsCard } from '../components/trends/IndicatorsCard'
import { shiftISO, todayISO } from '../lib/dates'

/** The colour of each layer of the pain curve, the same as its dot in the "what happened" list below it. */
const LAYER_COLOR = {
  flares: (t: ReturnType<typeof usePalette>) => t.weather[5].color,
  treatment: (t: ReturnType<typeof usePalette>) => t.brand,
  trials: (t: ReturnType<typeof usePalette>) => t.weather[2].color,
} as const

type Detail = 'zones' | 'treatments' | 'habits' | 'compare'

export function TrendsPage() {
  const entries = useLoggedEntries()
  const settings = useSettings()
  const i18n = useTranslation()
  const t = usePalette()
  const [rangeIdx, setRangeIdx] = useState(1)
  const medications = useMedications()
  const flares = useFlares()
  const { intlLocale, language } = useLocale()
  // The detail pages the summary opens (zones, treatments, habits, comparison); null is the summary itself.
  const [detail, setDetail] = useState<Detail | null>(null)
  // What the curve shows besides the pain itself; a convenience of this visit, not a setting.
  const [layers, setLayers] = useState({ flares: true, treatment: true, trials: true })

  const RANGES = [
    { label: i18n.trends.range7, days: 7 },
    { label: i18n.trends.range30, days: 30 },
    { label: i18n.trends.range90, days: 90 },
    { label: i18n.trends.rangeAll, days: null as number | null },
  ]

  const filtered = useMemo(() => {
    if (!entries) return []
    const days = RANGES[rangeIdx].days
    if (days == null) return entries
    const since = shiftISO(todayISO(), -(days - 1))
    return entries.filter((e) => e.date >= since)
  }, [entries, rangeIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const weekdays = weekdayProfile(filtered)

  const leadList = useMemo(
    () =>
      arrangeLeads(
        findLeads(filtered, leadFactors(settings.enabledFactors)),
        settings.leadChoices
      ),
    [filtered, settings.enabledFactors, settings.leadChoices]
  )
  const answerLead = (lead: Lead, choice: LeadChoice['choice']) =>
    void updateSettings({ leadChoices: { ...settings.leadChoices, [lead.key]: choiceFor(lead, choice, Date.now()) } })
  // Opening Trends is seeing its card: the dot on the tab clears for those leads.
  const openingLeads = useLeadList()
  const openingKeys = openingLeads?.shown.map((l) => l.key).join('\n') ?? ''
  useEffect(() => {
    if (!openingKeys) return
    const keys = openingKeys.split('\n')
    void updateLeadsSeen((seen) => (keys.every((k) => seen.trends.includes(k)) ? seen : { ...seen, trends: remember(seen.trends, keys) }))
  }, [openingKeys])
  const beginTrial = (lead: Lead) => {
    const trial = startTrial(lead, todayISO())
    if (trial) void updateSettings({ leadTrial: trial })
  }
  const againTrial = (past: LeadTrial) => void updateSettings({ leadTrial: restartTrial(past, todayISO()) })
  const declineTrial = (lead: Lead) => void updateLeadsSeen((seen) => ({ ...seen, declined: remember(seen.declined, [lead.key]) }))
  const clearLead = (lead: Lead) => {
    const { [lead.key]: _gone, ...rest } = settings.leadChoices ?? {}
    void updateSettings({ leadChoices: rest })
  }

  // The range as dates, for medication periods (the entry filter above works
  // on timestamps). "All" starts at the first logged day.
  const today = todayISO()
  const rangeDays = RANGES[rangeIdx].days
  const rangeFrom = rangeDays == null ? (entries?.at(-1)?.date ?? today) : shiftISO(today, -rangeDays)
  const medicationsTracked = settings.enabledFactors.includes('medications')
  const zonesTracked = settings.enabledFactors.includes('painLocations')
  const flareDays = useMemo(() => flareDaySet(flares?.detectable ? flares.episodes : []), [flares])
  const events = useMemo(() => (medicationsTracked && medications ? treatmentEvents(medications) : []), [medicationsTracked, medications])
  const timeline = useMemo(
    () =>
      timelineItems({
        from: rangeFrom,
        to: today,
        flares: flares?.detectable ? flares.episodes : [],
        marked: markedOverlapping(settings.markedFlares, rangeFrom, today, today),
        events,
        history: settings.leadTrialHistory ?? [],
        current: settings.leadTrial,
        today,
      }),
    [rangeFrom, today, flares, events, settings.leadTrialHistory, settings.leadTrial, settings.markedFlares]
  )
  const doseMarkers: ChartMarker[] = medicationsTracked
    ? (medications ?? []).flatMap((m) =>
        m.regimen !== 'scheduled'
          ? []
          : m.periods.flatMap((p, i) =>
              i > 0 && p.start >= rangeFrom && p.start <= today
                ? [{ date: p.start, label: format(i18n.trends.posologyChangeMarker, { name: m.name, dose: formatPosology(i18n, m.regimen, p, intlLocale) }) }]
                : []
            )
      )
    : []

  // The chips only offer what there is to show in this range.
  const layerChips = (
    [
      ['flares', i18n.trends.layerFlares, timeline.some((i) => i.kind === 'flare' || i.kind === 'marked')],
      ['treatment', i18n.trends.layerTreatment, doseMarkers.length > 0],
      ['trials', i18n.trends.layerTrials, timeline.some((i) => i.kind === 'trial')],
    ] as const
  ).flatMap(([key, label, there]) => (there ? [[key, label] as const] : []))

  if (!entries) return null

  const meanPain = filtered.length ? filtered.reduce((sum, e) => sum + e.painLevel, 0) / filtered.length : null
  const rangeEpisodes = flaresOverlapping(flares?.episodes ?? [], rangeFrom, today)
  const rangeFlareDays = flareDayCount(rangeEpisodes, rangeFrom, today)
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const brief = [
    meanPain !== null ? format(i18n.trends.briefMean, { v: nf.format(meanPain) }) : null,
    flares?.detectable && rangeEpisodes.length > 0 ? format(i18n.trends.briefFlares, { n: rangeEpisodes.length, days: rangeFlareDays }) : null,
  ]
    .filter(Boolean)
    .join(' ')

  const hasTreatments = (medicationsTracked && !!medications) || (settings.leadTrialHistory?.length ?? 0) > 0
  const rangePicker = (
    <Segmented label={i18n.trends.rangeLabel} options={RANGES.map((r, i) => ({ value: i, label: r.label }))} value={rangeIdx} onChange={setRangeIdx} />
  )

  const DETAIL_TITLES: Record<Detail, string> = {
    zones: i18n.trends.moreZones,
    treatments: i18n.trends.moreTreatments,
    habits: i18n.trends.moreHabits,
    compare: i18n.trends.moreCompare,
  }

  if (detail) {
    return (
      <PageBack label={i18n.trends.title} onBack={() => setDetail(null)}>
        <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
          <h1 className="text-title font-semibold px-1">{DETAIL_TITLES[detail]}</h1>
          {detail !== 'compare' && rangePicker}

          {detail === 'zones' && zonesTracked && (
            <>
              <ZonesMapCard entries={filtered} />
              {flares?.detectable && <ZonesFlaresCard entries={entries} flareDays={flareDays} />}
              <ZonesWeeksCard entries={entries} today={today} flareDays={flareDays} />
            </>
          )}

          {detail === 'treatments' && (
            <>
              {medicationsTracked && medications && (
                <>
                  <MedicationsCard entries={filtered} medications={medications} from={rangeFrom} to={today} />
                  <TreatmentReviewCard entries={entries} medications={medications} episodes={flares?.detectable ? flares.episodes : null} today={today} />
                </>
              )}
              {settings.leadTrialHistory && settings.leadTrialHistory.length > 0 && (
                <TrialsCard history={settings.leadTrialHistory} entries={entries} today={today} running={!!settings.leadTrial} onAgain={againTrial} />
              )}
            </>
          )}

          {detail === 'habits' && (
            <>
              {entries.length < PATTERN_MIN_DAYS && (
                <Card>
                  <p className="text-control" style={{ color: t.inkMuted }}>
                    {format(i18n.trends.emptyEarly, { n: entries.length }, language)}
                  </p>
                </Card>
              )}
              <IndicatorsCard entries={filtered} />
              {settings.enabledFactors.includes('activity') && <PacingCard entries={entries} />}
              {weekdays ? <WeekdayCard profile={weekdays} /> : entries.length >= PATTERN_MIN_DAYS && <WeekdayWaiting />}
              {entries.length >= PATTERN_MIN_DAYS && (
                <LeadsCard
                  shown={leadList.shown}
                  dismissed={leadList.dismissed}
                  choices={settings.leadChoices}
                  onAnswer={answerLead}
                  onUndo={clearLead}
                  trial={settings.leadTrial}
                  trialsEnabled={settings.suggestionsEnabled}
                  declined={settings.leadsSeen?.declined ?? []}
                  onStartTrial={beginTrial}
                  onDeclineTrial={declineTrial}
                />
              )}
            </>
          )}

          {detail === 'compare' && (
            <CompareCard
              entries={entries}
              today={today}
              lastVisit={lastOf(settings)?.date}
              flareDays={flares?.detectable ? flareDaySet(flares.episodes) : null}
              stiffnessTracked={settings.enabledFactors.includes('morningStiffness')}
            />
          )}
          <Footer />
        </div>
      </PageBack>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-title font-semibold px-1">{i18n.trends.title}</h1>

      {rangePicker}

      {filtered.length === 0 ? (
        <Card>
          <p className="text-control text-center py-4" style={{ color: t.inkMuted }}>
            {entries.length === 0 ? i18n.trends.emptyNone : i18n.trends.noData}
          </p>
        </Card>
      ) : (
        <>
          {entries.length < PATTERN_MIN_DAYS && (
            <Card>
              <p className="text-control" style={{ color: t.inkMuted }}>
                {format(i18n.trends.emptyEarly, { n: entries.length }, language)}
              </p>
            </Card>
          )}

          <Card tour="trends-chart">
            <SectionTitle icon={IconChartLine}>{i18n.trends.painEvolution}</SectionTitle>
            {brief && (
              <p className="text-body font-medium mb-3" style={{ color: 'var(--color-ink)' }}>
                {brief}
              </p>
            )}
            <PainTrendChart
              entries={entries ?? []}
              from={rangeFrom}
              to={today}
              markers={layers.treatment ? doseMarkers : []}
              flares={layers.flares ? flares?.episodes : undefined}
              marked={layers.flares ? markedSpans(timeline) : []}
              trialSpans={layers.trials ? trialSpans(timeline) : []}
              showMean={rangeDays !== 7}
            />
            {layerChips.length > 1 && (
              <div role="group" aria-label={i18n.trends.layersLabel} className="flex flex-wrap gap-2 mt-3">
                {layerChips.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={layers[key]}
                    onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
                    className="rounded-[var(--radius-control)] px-3 py-1.5 text-control font-medium inline-flex items-center gap-2"
                    style={{
                      background: layers[key] ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                      color: layers[key] ? 'var(--color-brand)' : 'var(--color-ink)',
                      boxShadow: `inset 0 0 0 1px ${layers[key] ? 'var(--color-brand)' : 'var(--color-hairline)'}`,
                    }}
                  >
                    <span aria-hidden className="w-2.5 h-2.5 rounded-full" style={{ background: LAYER_COLOR[key](t) }} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {timeline.length > 0 && <TimelineCard items={timeline} onRemoveMarked={(start) => void updateSettings({ markedFlares: removeMarked(settings.markedFlares, start) })} />}

          <section aria-labelledby="trends-more" className="flex flex-col gap-2">
            <GroupCaption>
              <span id="trends-more">{i18n.trends.moreTitle}</span>
            </GroupCaption>
            <Card>
              {zonesTracked && <LinkRow icon={IconBodyScan} title={i18n.trends.moreZones} hint={i18n.trends.moreZonesHint} onClick={() => setDetail('zones')} />}
              {hasTreatments && <LinkRow icon={IconPill} title={i18n.trends.moreTreatments} hint={i18n.trends.moreTreatmentsHint} onClick={() => setDetail('treatments')} />}
              <LinkRow
                icon={IconUser}
                title={i18n.trends.moreHabits}
                hint={i18n.trends.moreHabitsHint}
                badge={entries.length >= PATTERN_MIN_DAYS && leadList.shown.length > 0 ? i18n.tabs.trendsNew : undefined}
                onClick={() => setDetail('habits')}
              />
              {entries.length >= 14 && <LinkRow icon={IconChartDots} title={i18n.trends.moreCompare} hint={i18n.trends.moreCompareHint} onClick={() => setDetail('compare')} />}
            </Card>
          </section>
        </>
      )}
      <Footer />
    </div>
  )
}
