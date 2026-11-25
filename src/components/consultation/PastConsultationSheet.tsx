import { useState } from 'react'
import { format as formatDate } from 'date-fns'
import { updateSettings } from '../../db'
import type { PastConsultation, Settings } from '../../db/types'
import { MAX_NOTES_LENGTH, withoutPast, withPastDecisions } from '../../lib/consultation'
import type { Decision } from '../../lib/decisions'
import { useLoggedEntries } from '../../hooks/useEntries'
import { useMedications } from '../../hooks/useMedications'
import { DecisionsEditor } from './DecisionsEditor'
import { archiveTrial, newTrial } from '../../lib/leadTrial'
import { actionKey } from '../../lib/leads'
import { todayISO } from '../../lib/dates'
import { useLocale, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }

/** An appointment that took place: what was prepared for it, what the doctor said (which can be corrected), and a way to forget it. */
export function PastConsultationSheet({ settings, past, onClose }: { settings: Settings; past: PastConsultation; onClose: () => void }) {
  const t = useTranslation().consultation
  const { dateFnsLocale } = useLocale()
  const [notes, setNotes] = useState(past.notes ?? '')
  const [decisions, setDecisions] = useState<Decision[]>(past.decisions ?? [])
  const entries = useLoggedEntries()
  const medications = useMedications()
  const day = formatDate(new Date(past.date + 'T00:00:00'), 'd MMMM yyyy', { locale: dateFnsLocale })
  const who = [past.kind === 'cetd' ? t.kindCetd : t.kindGp, past.doctor].filter(Boolean).join(' · ')

  const today = todayISO()
  const trialBusy = !!settings.leadTrial && today <= settings.leadTrial.end
  function save() {
    // A trial added here (not one already noted) starts tomorrow, unless another is under way.
    const trial = decisions.find((d) => d.kind === 'trial' && d.action && !(past.decisions ?? []).some((p) => p.kind === 'trial' && p.action === d.action))
    const started =
      trial && !trialBusy
        ? {
            leadTrial: { ...newTrial(`action:${actionKey(trial.action!)}`, trial.action!, today), byDoctor: true as const },
            ...(settings.leadTrial ? { leadTrialHistory: archiveTrial(settings.leadTrialHistory, settings.leadTrial) } : {}),
          }
        : {}
    void updateSettings({ ...withPastDecisions(settings, past.date, past.kind, notes, decisions), ...started })
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
      <DecisionsEditor decisions={decisions} onChange={setDecisions} entries={entries} medications={medications} trialBusy={trialBusy} />
      <button type="button" onClick={save} className="btn-primary">
        {t.pastSave}
      </button>
      <button type="button" onClick={forget} className="min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-ink-muted)' }}>
        {t.pastDelete}
      </button>
    </ModalSheet>
  )
}
