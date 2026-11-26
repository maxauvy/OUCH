import { useId, useMemo, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import type { LoggedEntry, Medication } from '../../db/types'
import { format, useLanguage, useTranslation } from '../../i18n'
import { DECISION_KINDS, MAX_DECISIONS, MAX_DECISION_LENGTH, PER_WEEK, type Decision, type DecisionKind } from '../../lib/decisions'
import { Chip } from '../ui/Chip'
import { EXERCISES_LABELS, isExercisesLabel } from '../../lib/physio'

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
const fieldClass = 'w-full rounded-xl px-3.5 py-2.5 text-body outline-none'

/** The actions the person notes most, then the app's own suggestions: what a habit can be counted by. */
function actionChoices(entries: readonly LoggedEntry[] | undefined, suggestions: readonly string[]): string[] {
  const counts = new Map<string, { label: string; n: number }>()
  for (const e of entries ?? []) for (const a of e.positiveActions ?? []) {
    const k = a.trim().toLocaleLowerCase()
    if (!k) continue
    const c = counts.get(k) ?? { label: a.trim(), n: 0 }
    c.n++
    counts.set(k, c)
  }
  const noted = [...counts.values()].sort((a, b) => b.n - a.n).map((c) => c.label)
  const out = [...noted]
  for (const s of suggestions) if (!out.some((o) => o.toLocaleLowerCase() === s.toLocaleLowerCase())) out.push(s)
  return out.slice(0, 8)
}

/**
 * « Ce qu'on a décidé »: one line per decision, with its kind. A habit also asks which action of « ce qui a aidé » counts it and how many
 * times a week; a treatment can point at the registry. Nothing more: the report follows them up.
 */
export function DecisionsEditor({ decisions, onChange, entries, medications, trialBusy = false, physio = false }: { decisions: Decision[]; onChange: (d: Decision[]) => void; entries?: readonly LoggedEntry[]; medications?: readonly Medication[]; /** A trial is under way: a new one is noted but not started. */ trialBusy?: boolean; /** After a physio appointment (« Suivi kiné »): the exercises come first, already chosen. */ physio?: boolean }) {
  const i18n = useTranslation()
  const t = i18n.decisions
  const language = useLanguage()
  const ids = useId()
  const [kind, setKind] = useState<DecisionKind>('habit')
  const [text, setText] = useState('')
  const exercises = EXERCISES_LABELS[language]
  const [action, setAction] = useState<string | null>(physio ? exercises : null)
  const [perWeek, setPerWeek] = useState<number | null>(physio ? 5 : 3)
  const [medicationId, setMedicationId] = useState('')
  const actions = useMemo(() => {
    const list = actionChoices(entries, i18n.entryForm.positiveActionsSuggestions)
    return physio ? [exercises, ...list.filter((a) => !isExercisesLabel(a))].slice(0, 8) : list
  }, [entries, i18n, physio, exercises])
  const active = (medications ?? []).filter((m) => m.periods.some((p) => !p.end))
  const full = decisions.length >= MAX_DECISIONS
  const hasTrial = decisions.some((d) => d.kind === 'trial')
  const canAdd = !full && (kind === 'trial' ? !!action && !hasTrial : text.trim() || (kind === 'habit' && action))

  const add = () => {
    if (!canAdd) return
    const d: Decision = {
      kind,
      text: text.trim().slice(0, MAX_DECISION_LENGTH) || (action ?? ''),
      ...((kind === 'habit' || kind === 'trial') && action ? { action } : {}),
      ...(kind === 'habit' && perWeek ? { perWeek } : {}),
      ...(kind === 'treatment' && medicationId ? { medicationId } : {}),
    }
    onChange([...decisions, d])
    setText('')
    setAction(null)
    setMedicationId('')
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-caption font-semibold">{t.title}</h4>
      <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
        {t.hint}
      </p>
      {decisions.length > 0 && (
        <ul className="flex flex-col">
          {decisions.map((d, k) => (
            <li key={k} className="flex items-center gap-2 py-2" style={{ borderTop: k ? '1px solid var(--color-hairline)' : undefined }}>
              <span className="text-caption font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
                {t.kinds[d.kind]}
              </span>
              <span className="text-body flex-1 min-w-0">
                {d.text}
                {d.kind === 'habit' && d.perWeek ? <span style={{ color: 'var(--color-ink-muted)' }}> · {d.perWeek === 7 ? t.everyDay : format(t.perWeek, { n: d.perWeek }, language)}</span> : null}
              </span>
              <button type="button" onClick={() => onChange(decisions.filter((_, j) => j !== k))} aria-label={`${t.remove} : ${d.text}`} className="w-11 h-11 flex items-center justify-center shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
                <IconX size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <div className="flex flex-col gap-2">
          <div role="radiogroup" aria-label={t.title} className="flex flex-wrap gap-2">
            {DECISION_KINDS.map((k) => (
              <Chip key={k} label={t.kinds[k]} selected={kind === k} onClick={() => setKind(k)} />
            ))}
          </div>
          {kind === 'habit' && (
            <>
              <p id={`${ids}-action`} className="text-control font-semibold">
                {t.actionLabel}
              </p>
              <div role="group" aria-labelledby={`${ids}-action`} className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Chip key={a} label={a} selected={action === a} onClick={() => setAction(action === a ? null : a)} />
                ))}
              </div>
              <p id={`${ids}-week`} className="text-control font-semibold">
                {t.perWeekLabel}
              </p>
              <div role="group" aria-labelledby={`${ids}-week`} className="flex flex-wrap gap-2">
                {PER_WEEK.map((n) => (
                  <Chip key={n} label={n === 7 ? t.everyDay : format(t.perWeek, { n }, language)} selected={perWeek === n} onClick={() => setPerWeek(perWeek === n ? null : n)} />
                ))}
              </div>
            </>
          )}
          {kind === 'trial' && (
            <>
              <p id={`${ids}-trial`} className="text-control font-semibold">
                {t.trialActionLabel}
              </p>
              <div role="group" aria-labelledby={`${ids}-trial`} className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Chip key={a} label={a} selected={action === a} onClick={() => setAction(action === a ? null : a)} />
                ))}
              </div>
              <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
                {trialBusy ? t.trialBusy : t.trialHint}
              </p>
            </>
          )}
          {kind === 'treatment' && active.length > 0 && (
            <>
              <label htmlFor={`${ids}-med`} className="text-control font-semibold">
                {t.medLabel}
              </label>
              <select id={`${ids}-med`} value={medicationId} onChange={(e) => setMedicationId(e.target.value)} className={fieldClass} style={field}>
                <option value="">{t.medNone}</option>
                {active.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_DECISION_LENGTH}
            placeholder={t.placeholders[kind]}
            aria-label={t.title}
            className={fieldClass}
            style={field}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <button type="button" onClick={add} disabled={!canAdd} className="btn-secondary self-start">
            {t.add}
          </button>
        </div>
      )}
    </div>
  )
}
