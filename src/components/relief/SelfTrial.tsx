import { useId, useState } from 'react'
import { updateSettings } from '../../db'
import { useAllEntries, useLoggedEntries } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { format, useLanguage, useTranslation } from '../../i18n'
import { todayISO } from '../../lib/dates'
import { MAX_NAME, notedActions, trialName, trialOptions } from '../../lib/gestures'
import { actionInSentence, actionKey } from '../../lib/leads'
import { newTrial, restartTrial, trialStatus, type LeadTrial } from '../../lib/leadTrial'
import { TrialHistory } from './TrialHistory'
import { BUTTON, MARKER, PRIMARY, SECONDARY } from '../today/cardStyles'
import { ModalSheet } from '../ui/ModalSheet'
import { trialCellStyle } from '../entry/trialStrip'

/** Under "Mes gestes", the one home of the trials: the way to check whether something helps, on days drawn at random, where the one trial
 * under way stands, and the trials done before, to read again or do again. Elsewhere (Today, a lead in Trends) only leads here or starts one. */
export function SelfTrial() {
  const t = useTranslation().gestures
  const language = useLanguage()
  const settings = useSettings()
  const [open, setOpen] = useState(false)
  const trial = settings.leadTrial
  const entries = useLoggedEntries()

  return (
    <div className="border-t pt-3 mt-3 flex flex-col gap-2" style={{ borderColor: 'var(--color-hairline)' }}>
      {trial ? (
        <RunningTrial trial={trial} />
      ) : (
        <>
          <p className="text-body font-semibold">{t.trialQuestion}</p>
          <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>
            {format(t.trialPitch, {}, language)}
          </p>
          <div>
            <button type="button" className={BUTTON} style={SECONDARY} onClick={() => setOpen(true)}>
              {t.trialLaunch}
            </button>
          </div>
        </>
      )}
      {settings.leadTrialHistory && settings.leadTrialHistory.length > 0 && entries && (
        <TrialHistory
          history={settings.leadTrialHistory}
          entries={entries}
          today={todayISO()}
          running={!!trial}
          onAgain={(past) => void updateSettings({ leadTrial: restartTrial(past, todayISO()) })}
        />
      )}
      {open && <StartSheet onClose={() => setOpen(false)} />}
    </div>
  )
}

/** The trial under way, as a reminder: its action, its day, tomorrow once known. The card on Today is where it is answered. */
function RunningTrial({ trial }: { trial: LeadTrial }) {
  const t = useTranslation().gestures
  const language = useLanguage()
  const entries = useLoggedEntries() ?? []
  const today = todayISO()
  const status = trialStatus(trial, entries, today)
  const action = actionInSentence(trial.action)
  const next = status.drawn ? status.days[status.day] : undefined
  const line = status.over
    ? t.trialOver
    : status.drawn
      ? [
          status.day === 0 ? t.trialStartsTomorrow : format(t.trialDay, { day: status.day, n: status.length }, language),
          next?.revealed ? format(next.arm === 'with' ? t.trialTomorrowWith : t.trialTomorrowWithout, {}, language) : '',
        ]
          .filter(Boolean)
          .join(' ')
      : ''
  return (
    <>
      <p className="text-body font-semibold">{format(t.trialRunning, { action }, language)}</p>
      {line && (
        <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>
          {line}
        </p>
      )}
      {status.drawn && !status.over && (
        <div className="flex gap-1 items-start" aria-hidden>
          {status.days.map((d) => (
            <span key={d.date} className={`flex-1 rounded-full ${d.date === today ? 'h-3.5 -mt-0.5' : 'h-2.5'}`} style={trialCellStyle(d)} />
          ))}
        </div>
      )}
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {t.trialOne}
      </p>
    </>
  )
}

/** "Est-ce que ça m'aide ?": one thing, from the gestures kept and what was noted, or a new one typed. */
function StartSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslation().gestures
  const tt = useTranslation()
  const language = useLanguage()
  const settings = useSettings()
  const entries = useAllEntries()
  const today = todayISO()
  const options = trialOptions(settings.reliefGestures ?? [], entries ? notedActions(entries, today) : [])
  const OTHER = options.length
  const [picked, setPicked] = useState(0)
  const [typed, setTyped] = useState('')
  const group = useId()
  const fieldId = useId()
  const name = picked === OTHER ? trialName(typed) : options[picked]?.name ?? ''

  const start = () => {
    if (!name) return
    void updateSettings({ leadTrial: newTrial(`action:${actionKey(name)}`, name, today) }).then(onClose)
  }

  return (
    <ModalSheet title={t.sheetTitle} closeLabel={t.sheetClose} onClose={onClose}>
      <p className="text-body">
        {t.sheetIntroBefore} <span style={{ background: MARKER }}>{t.sheetIntroMarked}</span>
        {t.sheetIntroAfter}
      </p>
      <fieldset className="flex flex-col gap-2 mt-3">
        <legend className="text-caption font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--color-ink-muted)' }}>
          {t.sheetChoose}
        </legend>
        {[...options.map((o) => ({ label: o.name, hint: o.days ? format(t.noted, { n: o.days }, language) : '' })), { label: t.sheetOther, hint: '' }].map((o, i) => {
          const on = picked === i
          return (
            <label
              key={o.label}
              className="flex items-center gap-3 rounded-[14px] min-h-[52px] px-3.5 cursor-pointer"
              style={{ background: on ? 'var(--color-brand-soft)' : 'var(--color-surface)', boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? 'var(--color-brand)' : 'var(--color-hairline)'}` }}
            >
              <input type="radio" name={group} checked={on} onChange={() => setPicked(i)} className="w-[18px] h-[18px] accent-[var(--color-brand)]" />
              <span className="flex-1 text-body" style={i === OTHER ? { color: 'var(--color-ink-muted)' } : undefined}>
                {o.label}
              </span>
              {o.hint && (
                <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                  {o.hint}
                </span>
              )}
            </label>
          )
        })}
      </fieldset>
      {picked === OTHER && (
        <div className="flex flex-col gap-1.5 mt-3">
          <label htmlFor={fieldId} className="text-caption font-semibold">
            {t.sheetOtherLabel}
          </label>
          <input
            id={fieldId}
            value={typed}
            maxLength={MAX_NAME}
            onChange={(e) => setTyped(e.target.value)}
            className="min-h-11 rounded-[12px] px-3 text-body"
            style={{ background: 'var(--color-input)', boxShadow: 'inset 0 0 0 1.5px var(--color-brand)', color: 'var(--color-ink)' }}
          />
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {format(t.sheetOtherHint, { where: tt.entryForm.positiveActionsTitle }, language)}
          </p>
        </div>
      )}
      <p className="text-caption mt-3" style={{ color: 'var(--color-ink-muted)' }}>
        {t.sheetOne}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" className={`${BUTTON} disabled:opacity-50`} style={PRIMARY} disabled={!name} onClick={start}>
          {tt.trends.leadTrialStart}
        </button>
        <button type="button" className={BUTTON} style={SECONDARY} onClick={onClose}>
          {t.sheetCancel}
        </button>
      </div>
    </ModalSheet>
  )
}
