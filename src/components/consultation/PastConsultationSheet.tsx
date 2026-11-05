import { useState } from 'react'
import { format as formatDate } from 'date-fns'
import { updateSettings } from '../../db'
import type { PastConsultation, Settings } from '../../db/types'
import { MAX_NOTES_LENGTH, withoutPast, withPastNote } from '../../lib/consultation'
import { useLocale, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }

/** An appointment that took place: what was prepared for it, what the doctor said (which can be corrected), and a way to forget it. */
export function PastConsultationSheet({ settings, past, onClose }: { settings: Settings; past: PastConsultation; onClose: () => void }) {
  const t = useTranslation().consultation
  const { dateFnsLocale } = useLocale()
  const [notes, setNotes] = useState(past.notes ?? '')
  const day = formatDate(new Date(past.date + 'T00:00:00'), 'd MMMM yyyy', { locale: dateFnsLocale })
  const who = [past.kind === 'cetd' ? t.kindCetd : t.kindGp, past.doctor].filter(Boolean).join(' · ')

  function save() {
    void updateSettings(withPastNote(settings, past.date, past.kind, notes))
    onClose()
  }
  function forget() {
    if (!window.confirm(t.pastDeleteConfirm)) return
    void updateSettings(withoutPast(settings, past.date, past.kind))
    onClose()
  }

  return (
    <ModalSheet title={t.pastSheetTitle} closeLabel={t.close} onClose={onClose}>
      <div>
        <p className="text-body font-semibold">{day}</p>
        <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
          {who}
        </p>
      </div>
      {past.questions && past.questions.length > 0 && (
        <div>
          <h3 className="text-caption font-semibold mb-1">{t.pastQuestions}</h3>
          <ul className="list-disc pl-5 text-control">
            {past.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      {past.goal && (
        <div>
          <h3 className="text-caption font-semibold mb-1">{t.pastGoal}</h3>
          <p className="text-control">{past.goal}</p>
        </div>
      )}
      <div>
        <h3 className="text-caption font-semibold mb-1">{t.pastNote}</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={MAX_NOTES_LENGTH}
          rows={4}
          placeholder={t.pastNoNote}
          aria-label={t.pastNote}
          className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
          style={field}
        />
      </div>
      <button type="button" onClick={save} className="btn-primary">
        {t.pastSave}
      </button>
      <button type="button" onClick={forget} className="min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-ink-muted)' }}>
        {t.pastDelete}
      </button>
    </ModalSheet>
  )
}
