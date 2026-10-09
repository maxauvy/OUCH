import { useId, useMemo, useState } from 'react'
import { format as formatDate } from 'date-fns'
import type { LoggedEntry, Medication } from '../../db/types'
import { flareDaySet, type FlareEpisode } from '../../lib/flares'
import { posologyChange } from '../../lib/medicationFormat'
import { shiftISO } from '../../lib/medications'
import type { TreatmentEvent } from '../../lib/treatmentEvents'
import {
  REVIEW_MEASURES,
    reviewWindows,
  treatmentReviews,
  type ReviewMeasure,
  type SideEffectCount,
  type TreatmentReview,
} from '../../lib/treatmentReview'
import { usePalette } from '../../hooks/usePalette'
import { format, useLanguage, useLocale, useTranslation, type Translations } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'
import { PainTrendChart } from './PainTrendChart'

/**
 * What the diary shows around a change of background treatment: the same
 * figures four weeks before and four weeks after its first week, with the
 * logged days stated. With enough history, each is also set beside how much
 * two months in a row usually differ for this person. Nothing here says the
 * treatment worked or did not; see `lib/treatmentReview.ts`.
 */
export function TreatmentReviewCard({
  entries,
  medications,
  episodes,
  today,
}: {
  /** Every entry */
  entries: LoggedEntry[]
  medications: Medication[]
  /** Flares found, or null while they cannot be told yet */
  episodes: FlareEpisode[] | null
  today: string
}) {
  const reviews = useMemo(
    () =>
      treatmentReviews(entries, medications, episodes ? flareDaySet(episodes) : null, today)
        .filter((r) => r.status !== 'tooFewDays')
        .reverse(),
    [entries, medications, episodes, today]
  )
  const [picked, setPicked] = useState<string | null>(null)
  if (!reviews.length) return null
  const review = reviews.find((r) => reviewKey(r) === picked) ?? reviews[0]
  return <ReviewBody review={review} reviews={reviews} onPick={setPicked} entries={entries} episodes={episodes} today={today} />
}

const reviewKey = (r: TreatmentReview) => `${r.event.med.id}-${r.event.kind}-${r.date}`

function ReviewBody({
  review,
  reviews,
  onPick,
  entries,
  episodes,
  today,
}: {
  review: TreatmentReview
  reviews: TreatmentReview[]
  onPick: (key: string) => void
  entries: LoggedEntry[]
  episodes: FlareEpisode[] | null
  today: string
}) {
  const t = usePalette()
  const i18n = useTranslation()
  const tr = i18n.trends
  const language = useLanguage()
  const { intlLocale, dateFnsLocale } = useLocale()
  const [curve, setCurve] = useState(false)
  const curveId = useId()
  const fmt = useMemo(() => measureFormats(i18n, intlLocale), [i18n, intlLocale])
  // The year only when it is not this one: a long diary has changes a year apart.
  const day = (iso: string) =>
    formatDate(new Date(`${iso}T00:00:00`), iso.slice(0, 4) === today.slice(0, 4) ? 'd MMM' : 'd MMM yyyy', { locale: dateFnsLocale })

  const describe = (event: TreatmentEvent): string => {
    const name = event.med.name
    // The date as the treatments list shows it: a stop is its last day taken.
    const date = day(event.date)
    if (event.kind === 'started') return format(tr.reviewStarted, { name, date }, language)
    if (event.kind === 'stopped') return format(tr.reviewStopped, { name, date }, language)
    const [from, to] = posologyChange(i18n, event.med.regimen, event.previous, event.period, intlLocale)
    return format(tr.reviewDoseChanged, { name, from, to, date }, language)
  }

  const m = review.measures
  const rows = REVIEW_MEASURES.filter((key) => {
    const { before, after } = m[key]
    if (before === null || after === null) return false
    // No as-needed treatment at all: a row of zeros says nothing.
    return key !== 'rescue' || before > 0 || after > 0
  })
  const effects = review.sideEffects
  const showEffects = review.comparable && (effects.before.length > 0 || effects.after.length > 0)
  const effectText = (list: SideEffectCount[]) =>
    list.length ? list.map((e) => format(tr.reviewSideEffect, { effect: e.effect, n: e.days }, language)).join(', ') : tr.reviewNoSideEffects
  const usual = rows.filter((key) => m[key].usualGap !== null)

  const w = reviewWindows(review.date)
  const curveTo = w.afterTo < today ? w.afterTo : today

  return (
    <Card>
      <SectionTitle>{tr.reviewTitle}</SectionTitle>
      <p className="text-caption -mt-2 mb-3" style={{ color: t.inkMuted }}>
        {tr.reviewCaption}
      </p>

      {reviews.length > 1 && (
        <div role="group" aria-label={tr.reviewPickerLabel} className="flex flex-wrap gap-2 mb-3">
          {reviews.slice(0, 6).map((r) => {
            const on = reviewKey(r) === reviewKey(review)
            return (
              <button
                key={reviewKey(r)}
                type="button"
                aria-pressed={on}
                onClick={() => onPick(reviewKey(r))}
                className="rounded-[var(--radius-control)] px-3 py-1.5 text-caption font-semibold"
                style={{ background: on ? t.brand : t.brandSoft, color: on ? 'var(--color-on-brand)' : t.brand }}
              >
                {format(tr.reviewPick, { name: r.event.med.name, date: day(r.event.date) }, language)}
              </button>
            )
          })}
        </div>
      )}

      <h3 className="text-body font-semibold">{describe(review.event)}</h3>

      {!review.comparable ? (
        <p className="text-control mt-2" style={{ color: t.inkMuted }}>
          {format(tr.reviewNeedDays, { n: review.nAfter }, language)}
        </p>
      ) : (
        <>
          <table className="w-full mt-2 text-control">
            <thead>
              <tr className="text-caption" style={{ color: t.inkMuted }}>
                <td />
                <th scope="col" className="text-right font-normal pb-1">
                  {tr.reviewBefore}
                </th>
                <th scope="col" className="text-right font-normal pb-1 pl-3">
                  {tr.reviewAfter}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((key) => (
                <tr key={key} style={{ borderTop: `1px solid ${t.hairline}` }}>
                  <th scope="row" className="text-left font-normal py-2" style={{ color: t.inkMuted }}>
                    {fmt[key].label}
                  </th>
                  <td className="text-right py-2">{fmt[key].value(m[key].before!)}</td>
                  <td className="text-right py-2 pl-3 font-semibold">{fmt[key].value(m[key].after!)}</td>
                </tr>
              ))}
              {showEffects && (
                <tr style={{ borderTop: `1px solid ${t.hairline}` }}>
                  <th scope="row" className="text-left font-normal py-2 align-top" style={{ color: t.inkMuted }}>
                    {tr.reviewSideEffects}
                  </th>
                  <td className="text-right py-2 align-top">{effectText(effects.before)}</td>
                  <td className="text-right py-2 pl-3 font-semibold align-top">{effectText(effects.after)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="text-caption mt-2" style={{ color: t.inkMuted }}>
            {format(tr.reviewLogged, { before: review.nBefore, after: review.nAfter }, language)}
          </p>
        </>
      )}

      {review.status === 'inProgress' && review.comparable && (
        <p className="text-caption mt-1" style={{ color: t.inkMuted }}>
          {format(tr.reviewInProgress, { done: review.daysAfter }, language)}
        </p>
      )}
      {review.alsoChanged.length > 0 && (
        <p className="text-caption mt-1" style={{ color: t.ink }}>
          {format(tr.reviewAlsoChanged, { list: review.alsoChanged.map(describe).join(' ; ') }, language)}
        </p>
      )}
      {review.duringFlare && (
        <p className="text-caption mt-1" style={{ color: t.inkMuted }}>
          {tr.reviewDuringFlare}
        </p>
      )}

      {usual.length > 0 && (
        <section className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.hairline}` }}>
          <h4 className="text-control font-semibold">{tr.reviewUsualTitle}</h4>
          <p className="text-caption mt-0.5 mb-1" style={{ color: t.inkMuted }}>
            {tr.reviewUsualHelper}
          </p>
          {usual.map((key) => (
            <GapRow key={key} measure={key} comparison={m[key]} fmt={fmt[key]} />
          ))}
          <p className="text-caption mt-2" style={{ color: t.inkMuted }}>
            {tr.reviewUsualNote}
          </p>
        </section>
      )}

      <p className="text-caption mt-3 leading-snug" style={{ color: t.inkMuted }}>
        {tr.reviewNotCause}
      </p>

      {review.comparable && (
        <>
          <button
            type="button"
            aria-expanded={curve}
            aria-controls={curveId}
            onClick={() => setCurve((v) => !v)}
            className="text-control font-medium mt-2 underline underline-offset-4"
            style={{ color: t.brand }}
          >
            {curve ? tr.reviewHideCurve : tr.reviewSeeCurve}
          </button>
          {curve && (
            <div id={curveId} className="mt-3">
              <PainTrendChart
                entries={entries}
                from={w.beforeFrom}
                to={curveTo}
                markers={[{ date: review.date, label: review.event.med.name }]}
                flares={episodes ?? []}
                showMean={false}
                setApart={{ from: review.date, to: shiftISO(review.date, 6), label: tr.reviewSettle }}
                periodMeans={[
                  { from: w.beforeFrom, to: w.beforeTo, value: m.pain.before! },
                  ...(m.pain.after !== null ? [{ from: w.afterFrom, to: curveTo, value: m.pain.after }] : []),
                ]}
                periodMeansLabel={tr.reviewMeanLegend}
              />
            </div>
          )}
        </>
      )}
    </Card>
  )
}

interface MeasureFormat {
  label: string
  value: (v: number) => string
  /** A gap, in the same unit */
  gap: (v: number) => string
}

function measureFormats(i18n: Translations, intlLocale: string): Record<ReviewMeasure, MeasureFormat> {
  const tr = i18n.trends
  const nf1 = (v: number) => new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v)
  const nf0 = (v: number) => new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(v)
  const hours = (v: number) => {
    const total = Math.round(v * 60)
    return format(tr.reviewHours, { h: Math.floor(total / 60), m: String(total % 60).padStart(2, '0') })
  }
  return {
    pain: { label: tr.reviewPain, value: nf1, gap: nf1 },
    flareDays: { label: tr.reviewFlareDays, value: nf0, gap: nf1 },
    rescue: { label: tr.reviewRescue, value: (v) => format(tr.reviewPerDay, { v: nf1(v) }), gap: nf1 },
    sleepHours: { label: tr.reviewSleep, value: hours, gap: (v) => format(tr.reviewMinutes, { n: Math.round(v * 60) }) },
  }
}

/** One measure against the person's usual gap between two months: a grey
 * band for the gap, a dot for the change. The words say the same as the
 * drawing, so the drawing is hidden from screen readers. */
function GapRow({
  measure,
  comparison,
  fmt,
}: {
  measure: ReviewMeasure
  comparison: TreatmentReview['measures'][ReviewMeasure]
  fmt: MeasureFormat
}) {
  const t = usePalette()
  const tr = useTranslation().trends
  const language = useLanguage()
  const { before, after, usualGap } = comparison
  const change = after! - before!
  const gap = usualGap!
  const beyond = Math.abs(change) > gap
  const half = Math.max(gap * 2, Math.abs(change) * 1.2)
  const verdict = format(beyond ? tr.reviewBeyond : tr.reviewWithin, { gap: fmt.gap(gap) }, language)
  return (
    <div className="py-2.5" style={{ borderTop: `1px solid ${t.hairline}` }} data-measure={measure}>
      <div className="flex items-baseline justify-between gap-3 text-control">
        <span>{fmt.label}</span>
        <span className="text-caption" style={{ color: t.inkMuted }}>
          {fmt.value(before!)} → {fmt.value(after!)}
        </span>
      </div>
      <div className="relative h-6 mt-1.5" aria-hidden>
        <div className="absolute inset-x-0 top-[11px] h-[2px]" style={{ background: t.hairline }} />
        <div
          className="absolute top-[3px] h-[18px] rounded-full"
          style={{ left: `${50 - (gap / half) * 50}%`, width: `${(gap / half) * 100}%`, background: t.inkMuted, opacity: 0.25 }}
        />
        <div className="absolute left-1/2 top-[5px] h-[14px] w-[2px] -ml-px" style={{ background: t.inkMuted }} />
        <div
          className="absolute top-[3px] h-[18px] w-[18px] -ml-[9px] rounded-full"
          style={{ left: `${50 + (change / half) * 50}%`, background: t.brand, border: '2px solid var(--color-surface)' }}
        />
      </div>
      <div className="flex justify-between text-caption" style={{ color: t.inkMuted }} aria-hidden>
        <span>{tr.reviewLess}</span>
        <span>{tr.reviewMore}</span>
      </div>
      <p className="text-caption" style={{ color: t.ink }}>
        {verdict}
      </p>
    </div>
  )
}
