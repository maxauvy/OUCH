import { useId, useState } from 'react'
import { format as formatDate } from 'date-fns'
import { updateSettings } from '../../db'
import { CONSULTATION_KINDS, type Consultation, type ConsultationKind, type Settings } from '../../db/types'
import { useLoggedEntries } from '../../hooks/useEntries'
import { useFlares } from '../../hooks/useFlares'
import { useMedications } from '../../hooks/useMedications'
import { treatmentEvents } from '../../lib/treatmentEvents'
import { markedOverlapping } from '../../lib/markedFlares'
import { treatmentEventText } from '../trends/treatmentEventText'
import {
  addQuestion, cleanDoctor, daysUntil, kindOf, lastOf, MAX_DOCTOR_LENGTH, finishConsultation, MAX_GOAL_LENGTH, MAX_NOTES_LENGTH, MAX_QUESTION_LENGTH, newConsultation, removeQuestion, sinceFacts, sinceLast, withGoal,
} from '../../lib/consultation'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Chip } from '../ui/Chip'
import { ModalSheet } from '../ui/ModalSheet'
import { PrescriptionFields } from '../prescription/PrescriptionFields'
import { draftPrescription, prescriptionEnd, type PrescriptionDraft } from '../../lib/prescription'

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
const fieldClass = 'w-full rounded-xl px-3.5 py-2.5 text-body outline-none'
const linkClass = 'min-h-11 text-control font-semibold underline underline-offset-4'

/**
 * The sheet where an appointment is prepared: its day, the questions, what the
 * person most wants to say; and once it has taken place, a note on what was
 * said. Everything is kept as it is typed (a question is saved when added, a
 * sentence when the field is left), so closing the sheet loses nothing.
 */
export function ConsultationSheet({
  settings,
  today,
  startAfter = false,
  onSeeReport,
  onClose,
}: {
  settings: Settings
  today: string
  /** Opened from "how did it go?": the note comes first. */
  startAfter?: boolean
  /** Offered only where the report can be opened from. */
  onSeeReport?: () => void
  onClose: () => void
}) {
  const i18n = useTranslation()
  const t = i18n.consultation
  const tp = i18n.prescription
  const language = useLanguage()
  const { dateFnsLocale, intlLocale } = useLocale()
  const ids = useId()
  const entries = useLoggedEntries()
  const flares = useFlares()
  const medications = useMedications()
  const c = settings.consultation
  const [question, setQuestion] = useState('')
  // With a family doctor or a pain clinic: chosen before the date is, so it is kept apart until the appointment exists.
  const [kindChoice, setKindChoice] = useState<ConsultationKind>(kindOf(c))
  const [afterOpen, setAfterOpen] = useState(startAfter)
  const [notes, setNotes] = useState('')
  // Nothing is chosen by default: a prescription is only noted if the person picks a length.
  const [rx, setRx] = useState<PrescriptionDraft>({ months: null, start: c?.date ?? today, remindDays: 7, label: '' })
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale })

  const save = (next: Consultation) => void updateSettings({ consultation: next })
  // The last appointment of the same kind: the one the recap is since.
  const last = lastOf(settings, kindChoice)
  const since = last && entries ? sinceLast(entries, last.date, today) : null
  const facts = last
    ? sinceFacts({
        from: last.date,
        to: today,
        flares: flares?.detectable ? flares.episodes : [],
        marked: markedOverlapping(settings.markedFlares, last.date, today, today),
        events: settings.enabledFactors.includes('medications') && medications ? treatmentEvents(medications) : [],
      })
    : null
  const happened = c ? daysUntil(c, today) <= 0 : false

  function setDate(date: string) {
    if (!date) return
    save(c ? { ...c, date } : { ...newConsultation(date), kind: kindChoice })
  }
  function add() {
    if (!c) return
    save(addQuestion(c, question))
    setQuestion('')
  }
  function finish() {
    const prescription = draftPrescription(rx)
    void updateSettings({ ...finishConsultation(settings, notes), ...(prescription ? { prescription, prescriptionCardState: undefined } : {}) })
    onClose()
  }
  function remove() {
    void updateSettings({ consultation: undefined, consultationCardClosed: undefined })
    onClose()
  }

  return (
    <ModalSheet title={t.sheetTitle} closeLabel={t.close} onClose={onClose}>
      <div>
        <label htmlFor={`${ids}-date`} className="text-caption font-semibold block mb-1">
          {t.dateLabel}
        </label>
        <input id={`${ids}-date`} type="date" value={c?.date ?? ''} onChange={(e) => setDate(e.target.value)} className={fieldClass} style={field} />
      </div>

      <div role="group" aria-label={t.kindTitle}>
        <p className="text-caption font-semibold mb-1.5">{t.kindTitle}</p>
        <div className="flex flex-wrap gap-2">
          {CONSULTATION_KINDS.map((k) => (
            <Chip
              key={k}
              label={k === 'gp' ? t.kindGp : t.kindCetd}
              selected={kindChoice === k}
              onClick={() => {
                setKindChoice(k)
                if (c) save({ ...c, kind: k })
              }}
            />
          ))}
        </div>
      </div>

      {c && (
        <div>
          <label htmlFor={`${ids}-doctor`} className="text-caption font-semibold block mb-1">
            {t.doctorLabel}
          </label>
          <input
            id={`${ids}-doctor`}
            key={c.doctor ?? ''}
            defaultValue={c.doctor ?? ''}
            maxLength={MAX_DOCTOR_LENGTH}
            placeholder={t.doctorPlaceholder}
            onBlur={(e) => {
              const doctor = cleanDoctor(e.target.value)
              if (doctor !== c.doctor) {
                const { doctor: _old, ...rest } = c
                save(doctor ? { ...rest, doctor } : rest)
              }
            }}
            className={fieldClass}
            style={field}
          />
        </div>
      )}

      {c && (
        <>
          <div>
            <h3 className="text-caption font-semibold mb-1">{t.questionsTitle}</h3>
            {c.questions.length === 0 ? (
              <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
                {t.noQuestions}
              </p>
            ) : (
              <ul>
                {c.questions.map((q, i) => (
                  <li key={q} className="flex items-center justify-between gap-3 py-2 border-t first:border-t-0" style={{ borderColor: 'var(--color-hairline)' }}>
                    <span className="text-body">{q}</span>
                    <button type="button" onClick={() => save(removeQuestion(c, i))} aria-label={format(t.removeQuestion, { q }, language)} className="min-h-11 min-w-11 text-control shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex gap-2 mt-2"
              onSubmit={(e) => {
                e.preventDefault()
                add()
              }}
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={MAX_QUESTION_LENGTH}
                placeholder={t.questionPlaceholder}
                aria-label={t.questionsTitle}
                className={fieldClass}
                style={field}
              />
              <button type="submit" disabled={!question.trim()} className={`${linkClass} shrink-0 disabled:opacity-40`} style={{ color: 'var(--color-brand)' }}>
                {t.addQuestion}
              </button>
            </form>
          </div>

          <div>
            <label htmlFor={`${ids}-goal`} className="text-caption font-semibold block mb-1">
              {t.goalTitle}
            </label>
            <textarea
              id={`${ids}-goal`}
              key={c.goal ?? ''}
              defaultValue={c.goal ?? ''}
              maxLength={MAX_GOAL_LENGTH}
              rows={2}
              placeholder={t.goalPlaceholder}
              onBlur={(e) => {
                if (e.target.value.trim() !== (c.goal ?? '')) save(withGoal(c, e.target.value))
              }}
              className={fieldClass}
              style={field}
            />
          </div>
        </>
      )}

      {c && (
        <div>
          <h3 className="text-caption font-semibold mb-1">{tp.prepTitle}</h3>
          <p className="text-body">
            {settings.prescription ? format(tp.prepCurrent, { end: day(prescriptionEnd(settings.prescription)) }, language) : tp.prepNone}
          </p>
          <button type="button" onClick={() => save(addQuestion(c, tp.prepAskQuestion))} className={linkClass} style={{ color: 'var(--color-brand)' }}>
            {tp.prepAsk}
          </button>
        </div>
      )}

      {last && (
        <div>
          <h3 className="text-caption font-semibold mb-1">{format(t.sinceTitle, { date: day(last.date) }, language)}</h3>
          {since && (
            <p className="text-body">
              {since.before === null
                ? format(t.sinceBodyNoPrev, { now: nf.format(since.now) }, language)
                : format(t.sinceBody, { now: nf.format(since.now), before: nf.format(since.before) }, language)}
            </p>
          )}
          {facts && (facts.detected > 0 || facts.marked > 0 || facts.treatments.length > 0) && (
            <ul className="text-body mt-1 flex flex-col gap-0.5">
              {facts.detected > 0 && <li>{format(t.sinceDetected, { n: facts.detected }, language)}</li>}
              {facts.marked > 0 && <li>{format(t.sinceMarked, { n: facts.marked }, language)}</li>}
              {facts.treatments.slice(-3).map((e, i) => (
                <li key={i}>
                  {treatmentEventText(e, i18n, language, intlLocale)} ({day(e.date)}).
                </li>
              ))}
            </ul>
          )}
          {last.notes && (
            <div className="mt-2">
              <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
                {t.sinceNote}
              </p>
              <p className="text-body whitespace-pre-line">{last.notes}</p>
            </div>
          )}
          {onSeeReport && (
            <button type="button" onClick={onSeeReport} className={linkClass} style={{ color: 'var(--color-brand)' }}>
              {t.seeReport}
            </button>
          )}
        </div>
      )}

      {c && (
        <div>
          <h3 className="text-caption font-semibold mb-1">{t.afterTitle}</h3>
          {happened || afterOpen ? (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={MAX_NOTES_LENGTH}
                rows={3}
                placeholder={t.notesPlaceholder}
                aria-label={t.afterTitle}
                className={fieldClass}
                style={field}
              />
              <div className="mt-4">
                <h4 className="text-caption font-semibold mb-0.5">{tp.afterTitle}</h4>
                <p className="text-control mb-2" style={{ color: 'var(--color-ink-muted)' }}>
                  {tp.afterHint}
                </p>
                <PrescriptionFields draft={rx} onChange={(patch) => setRx((d) => ({ ...d, ...patch }))} withLabel={false} />
              </div>
              <button
                type="button"
                onClick={finish}
                className="mt-3 w-full rounded-[var(--radius-control)] py-3.5 text-body font-semibold text-[var(--color-on-brand)]"
                style={{ background: 'var(--color-brand)' }}
              >
                {t.save}
              </button>
            </>
          ) : (
            <>
              <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
                {t.afterHint}
              </p>
              <button type="button" onClick={() => setAfterOpen(true)} className={linkClass} style={{ color: 'var(--color-brand)' }}>
                {t.happened}
              </button>
            </>
          )}
        </div>
      )}

      {c && (
        <button type="button" onClick={remove} className={linkClass} style={{ color: 'var(--color-ink-muted)' }}>
          {t.remove}
        </button>
      )}
    </ModalSheet>
  )
}
