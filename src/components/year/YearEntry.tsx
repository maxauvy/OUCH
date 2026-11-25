import { useMemo, useState } from 'react'
import { IconConfetti } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import { useAllEntries } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { format, useLanguage, useTranslation } from '../../i18n'
import { todayISO } from '../../lib/dates'
import { useEarlyAccess } from '../../lib/earlyAccess'
import { flaresApply } from '../../lib/flares'
import { entryCardYear, reviewYear, yearReview, type YearReview } from '../../lib/yearReview'
import { Confetti, YearStory } from './YearStory'
import { CORAL } from './yearStyle'

/** The year to tell now, when the journal holds enough of it: in December and January, or any time with early access (to look at it ahead). */
function useYear(): YearReview | null {
  const entries = useAllEntries()
  const settings = useSettings()
  const earlyAccess = useEarlyAccess()
  const today = todayISO()
  const year = reviewYear(today) ?? (earlyAccess ? Number(today.slice(0, 4)) : null)
  return useMemo(
    () =>
      year === null || !entries
        ? null
        : yearReview({ entries, year, today, flaresApply: flaresApply(settings.illnesses), trials: settings.leadTrialHistory, note: settings.goodDayNote, appointments: settings.pastConsultations }),
    [entries, year, today, settings.illnesses, settings.leadTrialHistory, settings.goodDayNote, settings.pastConsultations]
  )
}

/** On the day's page, from 15 December to 15 January: the year is ready. Once opened or put off, it goes for that year. */
export function YearEntryCard() {
  const t = useTranslation().year
  const language = useLanguage()
  const settings = useSettings()
  const review = useYear()
  const [open, setOpen] = useState(false)
  const due = entryCardYear(todayISO(), settings.yearReviewSeen)
  if (!review || (due !== review.year && !open)) return null
  return (
    <>
      {due === review.year && (
        <section aria-label={format(t.tileTitle, { year: review.year }, language)} className="relative overflow-hidden rounded-[var(--radius-card)] p-[18px]" style={{ background: 'linear-gradient(135deg,#ffe3d1,#efe2fb)', color: '#1f1d44' }}>
          <Confetti n={12} seed={3} x={[70, 97]} y={[4, 30]} />
          <p className="relative m-0 text-caption font-semibold tracking-[0.06em] uppercase" style={{ color: CORAL }}>
            {format(t.entryKicker, { year: review.year }, language)}
          </p>
          <p className="relative m-0 mt-1 mb-1 text-heading font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
            {t.entryTitle}
          </p>
          <p className="relative m-0 mb-3 text-body">{t.entryBody}</p>
          <div className="relative flex flex-wrap gap-2">
            <button type="button" onClick={() => setOpen(true)} className="min-h-11 px-4 rounded-full text-control font-semibold" style={{ background: '#2c2860', color: '#fff' }}>
              {t.open}
            </button>
            <button type="button" onClick={() => void updateSettings({ yearReviewSeen: review.year })} className="min-h-11 px-4 rounded-full text-control font-semibold" style={{ background: 'rgba(255,255,255,.75)', color: '#2c2860' }}>
              {t.later}
            </button>
          </div>
        </section>
      )}
      {open && <YearStory review={review} onClose={() => setOpen(false)} />}
    </>
  )
}

/** In Trends, in December and January: the way back to the story of the year. */
export function YearTrendsTile() {
  const t = useTranslation().year
  const language = useLanguage()
  const review = useYear()
  const [open, setOpen] = useState(false)
  if (!review) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-year-tile
        className="relative overflow-hidden text-left rounded-[20px] p-3.5 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg,#ffe3d1,#efe2fb)', color: '#1f1d44' }}
      >
        <Confetti n={8} seed={4} x={[78, 97]} y={[8, 70]} />
        <span className="relative w-9 h-9 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,.75)', color: CORAL }} aria-hidden>
          <IconConfetti size={20} stroke={1.8} />
        </span>
        <span className="relative min-w-0">
          <span className="block text-body font-bold">{format(t.tileTitle, { year: review.year }, language)}</span>
          <span className="block text-caption" style={{ color: '#5e5a80' }}>
            {t.tileHint}
          </span>
        </span>
      </button>
      {open && <YearStory review={review} onClose={() => setOpen(false)} />}
    </>
  )
}
