import { useId, useState } from 'react'
import { format as formatDate } from 'date-fns'
import { updateSettings } from '../../db'
import type { Consultation, Settings } from '../../db/types'
import { useLoggedEntries } from '../../hooks/useEntries'
import {
  addQuestion, daysUntil, finishConsultation, MAX_GOAL_LENGTH, MAX_NOTES_LENGTH, MAX_QUESTION_LENGTH, newConsultation, removeQuestion, sinceLast, withGoal,
} from '../../lib/consultation'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

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
  const t = useTranslation().consultation
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const ids = useId()
  const entries = useLoggedEntries()
  const c = settings.consultation
  const [question, setQuestion] = useState('')
  const [afterOpen, setAfterOpen] = useState(startAfter)
  const [notes, setNotes] = useState('')
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale })

  const save = (next: Consultation) => void updateSettings({ consultation: next })
  const last = settings.lastConsultation
  const since = last && entries ? sinceLast(entries, last.date, today) : null
  const happened = c ? daysUntil(c, today) <= 0 : false

  function setDate(date: string) {
    if (!date) return
    save(c ? { ...c, date } : newConsultation(date))
  }
  function add() {
    if (!c) return
    save(addQuestion(c, question))
    setQuestion('')
  }
  function finish() {
    void updateSettings(finishConsultation(settings, notes))
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
                  <li key={q} className="flex items-start justify-between gap-3 py-2 border-t first:border-t-0" style={{ borderColor: 'var(--color-hairline)' }}>
                    <span className="text-body">{q}</span>
                    <button type="button" onClick={() => save(removeQuestion(c, i))} aria-label={format(t.removeQuestion, { q }, language)} className="min-h-11 px-1 text-control shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
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

      {last && (
        <div>
          <h3 className="text-caption font-semibold mb-1">{format(t.sinceTitle, { date: day(last.date) }, language)}</h3>
          {since && (
            <p className="text-body">
              {since.before === null
                ? format(t.sinceBodyNoPrev, { now: since.now.toFixed(1) }, language)
                : format(t.sinceBody, { now: since.now.toFixed(1), before: since.before.toFixed(1) }, language)}
            </p>
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
