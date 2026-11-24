import { useState } from 'react'
import { IconWind } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { GoodDayNote, HardDaysPlan } from '../../db/types'
import { useTranslation } from '../../i18n'
import { MAX_PLAN, PLAN_FIELDS, cleanPlan, hasPlan } from '../../lib/hardDaysPlan'
import { BUTTON, PRIMARY, SECONDARY } from '../today/cardStyles'
import { Card } from '../ui/Card'
import { NoteLetter, NoteSheet } from './GoodDayNote'

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }

/** The plan, in large type, to be read on a hard day: only the rubriques that were written. */
export function PlanView({
  plan,
  note,
  pastFlares,
  onEdit,
  onBreathe,
}: {
  plan: HardDaysPlan | undefined
  /** « Le mot des bons jours », read first, like a letter. */
  note: GoodDayNote | undefined
  /** How long each earlier flare lasted, for the line under the note. */
  pastFlares: readonly number[]
  onEdit: () => void
  onBreathe: () => void
}) {
  const t = useTranslation().plan
  const tn = useTranslation().goodDayNote
  const cardButton = useTranslation().relief.cardButton
  const [writing, setWriting] = useState(false)
  return (
    <>
      <p className="text-body px-1 -mt-2" style={{ color: 'var(--color-ink-muted)' }}>
        {hasPlan(plan) ? t.intro : t.empty}
      </p>
      {note && <NoteLetter note={note} lengths={pastFlares} onEdit={() => setWriting(true)} />}
      {hasPlan(plan) &&
        PLAN_FIELDS.filter((f) => plan[f]).map((f) => (
          <Card key={f}>
            <h2 className="text-caption font-semibold" style={{ color: 'var(--color-ink-muted)' }}>
              {t.fields[f].label}
            </h2>
            <p className="text-heading leading-relaxed mt-1 whitespace-pre-line">{plan[f]}</p>
          </Card>
        ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className={BUTTON} style={PRIMARY}>
          {hasPlan(plan) ? t.edit : t.write}
        </button>
        <button type="button" onClick={onBreathe} className={`${BUTTON} inline-flex items-center gap-2`} style={SECONDARY}>
          <IconWind size={18} stroke={1.8} aria-hidden />
          {cardButton}
        </button>
      </div>
      {!note && (
        <button type="button" onClick={() => setWriting(true)} className="self-start min-h-11 px-1 text-control font-semibold" style={{ color: 'var(--color-brand)' }}>
          {tn.writeFromPlan}
        </button>
      )}
      {writing && <NoteSheet note={note} onClose={() => setWriting(false)} />}
    </>
  )
}

/** The four fields, all optional. Saved in one write, so nothing is lost to a stale copy. */
export function PlanForm({ plan, onDone }: { plan: HardDaysPlan | undefined; onDone: () => void }) {
  const t = useTranslation().plan
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(PLAN_FIELDS.map((f) => [f, plan?.[f] ?? ''])))
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void updateSettings({ hardDaysPlan: cleanPlan(draft) }).then(onDone)
      }}
    >
      <p className="text-body px-1 -mt-2" style={{ color: 'var(--color-ink-muted)' }}>
        {t.formIntro}
      </p>
      <Card>
        <div className="flex flex-col gap-4">
          {PLAN_FIELDS.map((f) => (
            <label key={f} className="block">
              <span className="block text-caption font-semibold mb-1">{t.fields[f].label}</span>
              <textarea
                value={draft[f]}
                onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                maxLength={MAX_PLAN}
                rows={3}
                placeholder={t.fields[f].placeholder}
                className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none resize-y"
                style={field}
              />
            </label>
          ))}
        </div>
      </Card>
      <div className="flex gap-2">
        <button type="submit" className={BUTTON} style={PRIMARY}>
          {t.save}
        </button>
        <button type="button" onClick={onDone} className={BUTTON} style={SECONDARY}>
          {t.cancel}
        </button>
      </div>
    </form>
  )
}
