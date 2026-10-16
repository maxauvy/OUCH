import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { IconChevronRight, IconFileText } from '@tabler/icons-react'
import { subDays } from 'date-fns'

import { Footer } from '../components/layout/Footer'
import { FlaresCard } from '../components/trends/FlaresCard'
import { LeadsCard } from '../components/trends/LeadsCard'
import { MedicationsCard } from '../components/trends/MedicationsCard'
import { PainTrendChart, type ChartMarker } from '../components/trends/PainTrendChart'
import { TreatmentReviewCard } from '../components/trends/TreatmentReviewCard'
import { WeekdayCard, WeekdayWaiting } from '../components/trends/WeekdayCard'
import { Card, SectionTitle } from '../components/ui/Card'
import { DoctorReportPage } from './DoctorReportPage'
import { useLoggedEntries } from '../hooks/useEntries'
import { useFlares } from '../hooks/useFlares'
import { useLeadList } from '../hooks/useLeadList'
import { useMedications } from '../hooks/useMedications'
import { usePalette } from '../hooks/usePalette'
import { useSettings } from '../hooks/useSettings'
import { todayISO, updateSettings } from '../db'
import { flareDayCount, flaresOverlapping } from '../lib/flares'
import { remember } from '../lib/leadHints'
import { startTrial } from '../lib/leadTrial'
import { arrangeLeads, choiceFor, findLeads, leadFactors, PATTERN_MIN_DAYS, type Lead, type LeadChoice } from '../lib/leads'
import { updateLeadsSeen } from '../lib/leadsSeenStore'
import { formatPosology } from '../lib/medicationFormat'
import { shiftISO } from '../lib/medications'
import { weekdayProfile } from '../lib/weekdays'
import { format, useLocale, useTranslation } from '../i18n'

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
    const cutoff = subDays(new Date(), days)
    return entries.filter((e) => new Date(e.date + 'T00:00:00') >= cutoff)
  }, [entries, rangeIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const avgPain = filtered.length ? filtered.reduce((s, e) => s + e.painLevel, 0) / filtered.length : null
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

  if (reporting) {
    return (
      <DoctorReportPage
        onBack={() => {
          returningFromReport.current = true
          setReporting(false)
        }}
      />
    )
  }

  if (!entries) return null

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <h1 className="text-title font-semibold px-1">{i18n.trends.title}</h1>

      {entries.length > 0 && (
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
          <div className="grid grid-cols-2 gap-3">
            <Card className="flex flex-col items-center py-4">
              <span className="text-display font-bold" style={{ color: t.ink }}>
                {filtered.length}
              </span>
              <span className="text-caption" style={{ color: t.inkMuted }}>
                {filtered.length === 1 ? i18n.trends.daysTrackedOne : i18n.trends.daysTrackedOther}
              </span>
            </Card>
            <Card className="flex flex-col items-center py-4">
              <span className="text-display font-bold" style={{ color: t.ink }}>
                {avgPain != null ? avgPain.toFixed(1) : '—'}
              </span>
              <span className="text-caption" style={{ color: t.inkMuted }}>
                {i18n.trends.avgPain}
              </span>
            </Card>
          </div>

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
              markers={doseMarkers}
              flares={flares?.episodes}
              showMean={rangeDays !== 7}
            />
          </Card>

          {flares?.detectable && (
            <FlaresCard
              episodes={flaresOverlapping(flares.episodes, rangeFrom, today)}
              days={flareDayCount(flares.episodes, rangeFrom, today)}
            />
          )}

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
              trialsEnabled={settings.trialsEnabled}
              declined={settings.leadsSeen?.declined ?? []}
              onStartTrial={beginTrial}
              onDeclineTrial={declineTrial}
            />
          )}
        </>
      )}
      <Footer />
    </div>
  )
}
