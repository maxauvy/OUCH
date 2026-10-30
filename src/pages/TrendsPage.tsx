import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react'
import { IconChevronRight, IconFileText } from '@tabler/icons-react'

import { Footer } from '../components/layout/Footer'
import { ConsultationCard } from '../components/trends/ConsultationCard'
import { TimelineCard } from '../components/trends/TimelineCard'
import { TrialsCard } from '../components/trends/TrialsCard'
import { LeadsCard } from '../components/trends/LeadsCard'
import { MedicationsCard } from '../components/trends/MedicationsCard'
import { PainTrendChart, type ChartMarker } from '../components/trends/PainTrendChart'
import { TreatmentReviewCard } from '../components/trends/TreatmentReviewCard'
import { WeekdayCard, WeekdayWaiting } from '../components/trends/WeekdayCard'
import { ZonesFlaresCard, ZonesMapCard, ZonesWeeksCard } from '../components/trends/ZonesCards'
import { Card, SectionTitle } from '../components/ui/Card'
// The report, its charts and the page capture are fetched when it is opened.
const DoctorReportPage = lazy(() => import('./DoctorReportPage').then((m) => ({ default: m.DoctorReportPage })))
import { useLoggedEntries } from '../hooks/useEntries'
import { useFlares } from '../hooks/useFlares'
import { useLeadList } from '../hooks/useLeadList'
import { useMedications } from '../hooks/useMedications'
import { usePalette } from '../hooks/usePalette'
import { useSettings } from '../hooks/useSettings'
import { updateSettings } from '../db'
import { flareDaySet, flaresOverlapping } from '../lib/flares'
import { remember } from '../lib/leadHints'
import { restartTrial, startTrial, type LeadTrial } from '../lib/leadTrial'
import { arrangeLeads, choiceFor, findLeads, leadFactors, PATTERN_MIN_DAYS, type Lead, type LeadChoice } from '../lib/leads'
import { updateLeadsSeen } from '../lib/leadsSeenStore'
import { formatPosology } from '../lib/medicationFormat'
import { treatmentEvents } from '../lib/treatmentEvents'
import { lastTreatmentEvent, timelineItems, trialSpans } from '../lib/trendsTimeline'
import { weekdayProfile } from '../lib/weekdays'
import { format, useLocale, useTranslation } from '../i18n'
import { IndicatorsCard } from '../components/trends/IndicatorsCard'
import { shiftISO, todayISO } from '../lib/dates'

export function TrendsPage() {
  const entries = useLoggedEntries()
  const settings = useSettings()
  const i18n = useTranslation()
  const t = usePalette()
  const [rangeIdx, setRangeIdx] = useState(1)
  const medications = useMedications()
  const flares = useFlares()
  const { intlLocale, language } = useLocale()
  const [reporting, setReporting] = useState(false)
  // What the curve shows besides the pain itself; a convenience of this visit, not a setting.
  const [layers, setLayers] = useState({ flares: true, treatment: true, trials: true })
  const reportIds = useId()
  const reportButtonRef = useRef<HTMLButtonElement>(null)
  const returningFromReport = useRef(false)

  // Coming back from the report: focus returns to the button that opened it.
  useEffect(() => {
    if (reporting || !returningFromReport.current) return
    returningFromReport.current = false
    reportButtonRef.current?.focus()
  }, [reporting])

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
        events,
        history: settings.leadTrialHistory ?? [],
        current: settings.leadTrial,
        today,
      }),
    [rangeFrom, today, flares, events, settings.leadTrialHistory, settings.leadTrial]
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
      ['flares', i18n.trends.layerFlares, timeline.some((i) => i.kind === 'flare')],
      ['treatment', i18n.trends.layerTreatment, doseMarkers.length > 0],
      ['trials', i18n.trends.layerTrials, timeline.some((i) => i.kind === 'trial')],
    ] as const
  ).flatMap(([key, label, there]) => (there ? [[key, label] as const] : []))

  if (reporting) {
    return (
      <Suspense fallback={null}>
        <DoctorReportPage
          onBack={() => {
            returningFromReport.current = true
            setReporting(false)
          }}
        />
      </Suspense>
    )
  }

  if (!entries) return null

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-title font-semibold px-1">{i18n.trends.title}</h1>

      {entries.length > 0 && (
        <ConsultationCard
          entries={filtered}
          from={rangeFrom}
          to={today}
          episodes={flaresOverlapping(flares?.episodes ?? [], rangeFrom, today)}
          flaresApply={!!flares?.detectable}
          zonesTracked={zonesTracked}
          lastTreatment={lastTreatmentEvent(events, today)}
          action={
        <button
          ref={reportButtonRef}
          data-tour="report"
          type="button"
          onClick={() => setReporting(true)}
          aria-labelledby={`${reportIds}-title`}
          aria-describedby={`${reportIds}-help`}
          className="text-left rounded-[var(--radius-card)] p-4 flex items-center gap-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', boxShadow: 'var(--card-shadow)' }}
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
            aria-hidden
          >
            <IconFileText size={22} />
          </span>
          <span className="flex-1">
            <span id={`${reportIds}-title`} className="block text-body font-semibold">
              {i18n.doctorReport.entryTitle}
            </span>
            <span id={`${reportIds}-help`} className="block text-caption" style={{ color: t.inkMuted }}>
              {i18n.doctorReport.entryHelper}
            </span>
          </span>
          <IconChevronRight size={20} aria-hidden style={{ color: t.inkMuted }} />
        </button>
          }
        />
      )}

      <div className="flex gap-2 px-1">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRangeIdx(i)}
            className="rounded-[var(--radius-control)] px-3.5 py-1.5 text-caption font-semibold"
            style={{
              background: i === rangeIdx ? t.brand : t.brandSoft,
              color: i === rangeIdx ? 'var(--color-on-brand)' : t.brand,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

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
            <SectionTitle>{i18n.trends.painEvolution}</SectionTitle>
            <PainTrendChart
              entries={entries ?? []}
              from={rangeFrom}
              to={today}
              markers={layers.treatment ? doseMarkers : []}
              flares={layers.flares ? flares?.episodes : undefined}
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
                    className="rounded-[var(--radius-control)] px-3.5 py-1.5 text-caption font-semibold"
                    style={{ background: layers[key] ? t.brand : t.brandSoft, color: layers[key] ? 'var(--color-on-brand)' : t.brand }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {timeline.length > 0 && <TimelineCard items={timeline} />}

          {zonesTracked && (
            <>
              <ZonesMapCard entries={filtered} />
              {flares?.detectable && <ZonesFlaresCard entries={entries} flareDays={flareDays} />}
              <ZonesWeeksCard entries={entries} today={today} flareDays={flareDays} />
            </>
          )}

          <IndicatorsCard entries={filtered} />

          {medicationsTracked && medications && (
            <>
              <MedicationsCard entries={filtered} medications={medications} from={rangeFrom} to={today} />
              <TreatmentReviewCard entries={entries} medications={medications} episodes={flares?.detectable ? flares.episodes : null} today={today} />
            </>
          )}

          {weekdays ? (
            <WeekdayCard profile={weekdays} />
          ) : (
            // Under PATTERN_MIN_DAYS the card above already says that patterns need time.
            entries.length >= PATTERN_MIN_DAYS && <WeekdayWaiting />
          )}

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

          {settings.leadTrialHistory && settings.leadTrialHistory.length > 0 && (
            <TrialsCard
              history={settings.leadTrialHistory}
              entries={entries}
              today={today}
              running={!!settings.leadTrial}
              onAgain={againTrial}
            />
          )}
        </>
      )}
      <Footer />
    </div>
  )
}
