import { useState } from 'react'
import { updateSettings } from '../../db'
import { FLARE_FACTORS, type FlareFactor, type Settings } from '../../db/types'
import { shiftISO } from '../../lib/dates'
import { MAX_NOTE_LENGTH, startMarked } from '../../lib/markedFlares'
import { useTranslation } from '../../i18n'
import { Chip } from '../ui/Chip'
import { ModalSheet } from '../ui/ModalSheet'

type Start = 'today' | 'yesterday' | 'other'

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
const fieldClass = 'w-full rounded-xl px-3.5 py-2.5 text-body outline-none'

/** Where a difficult period is marked: when it began, what may have played a part, a few words. Nothing is ticked at first. */
export function MarkedFlareSheet({ settings, today, onClose }: { settings: Settings; today: string; onClose: () => void }) {
  const t = useTranslation().markedFlare
  const [start, setStart] = useState<Start>('today')
  const [otherDay, setOtherDay] = useState(shiftISO(today, -2))
  const [factors, setFactors] = useState<FlareFactor[]>([])
  const [note, setNote] = useState('')
  const day = start === 'today' ? today : start === 'yesterday' ? shiftISO(today, -1) : otherDay
  const toggle = (f: FlareFactor) => setFactors((list) => (list.includes(f) ? list.filter((x) => x !== f) : [...list, f]))

  function save() {
    void updateSettings({ markedFlares: startMarked(settings.markedFlares, { start: day, factors, note }, today) })
    onClose()
  }

  return (
    <ModalSheet title={t.sheetTitle} closeLabel={t.close} onClose={onClose}>
      <div role="group" aria-label={t.startedTitle}>
        <p className="text-caption font-semibold mb-1.5">{t.startedTitle}</p>
        <div className="flex flex-wrap gap-2">
          <Chip label={t.today} selected={start === 'today'} onClick={() => setStart('today')} />
          <Chip label={t.yesterday} selected={start === 'yesterday'} onClick={() => setStart('yesterday')} />
          <Chip label={t.otherDay} selected={start === 'other'} onClick={() => setStart('other')} />
        </div>
        {start === 'other' && (
          <input
            type="date"
            value={otherDay}
            max={today}
            aria-label={t.otherDay}
            onChange={(e) => e.target.value && e.target.value <= today && setOtherDay(e.target.value)}
            className={`${fieldClass} mt-2`}
            style={field}
          />
        )}
      </div>
      <div role="group" aria-label={t.factorsTitle}>
        <p className="text-caption font-semibold mb-1.5">{t.factorsTitle}</p>
        <div className="flex flex-wrap gap-2">
          {FLARE_FACTORS.map((f) => (
            <Chip key={f} label={t.factors[f]} selected={factors.includes(f)} onClick={() => toggle(f)} />
          ))}
        </div>
      </div>
      <input value={note} maxLength={MAX_NOTE_LENGTH} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} aria-label={t.notePlaceholder} className={fieldClass} style={field} />
      <button type="button" onClick={save} className="rounded-[var(--radius-control)] py-3.5 text-body font-semibold text-[var(--color-on-brand)]" style={{ background: 'var(--color-brand)' }}>
        {t.save}
      </button>
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {t.hint}
      </p>
    </ModalSheet>
  )
}
