import { useId, useLayoutEffect, useRef, useState } from 'react'
import { IconChevronRight, IconMail, IconSunrise, IconWriting } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { GoodDayNote } from '../../db/types'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { MAX_NOTE, cleanNote, flareSpan, noteDate } from '../../lib/goodDayNote'
import { todayISO } from '../../lib/dates'
import { BUTTON, PRIMARY, SECONDARY } from '../today/cardStyles'
import { ModalSheet } from '../ui/ModalSheet'

/** The most bars drawn: the latest flares; the sentence still counts them all. */
const MAX_BARS = 6

/** What the journal already knows on a hard day: the flares before this one all came to an end.
 * Nothing at all below two of them. The bars say the same thing to the eye, so they are hidden from screen readers. */
export function FlareProof({ lengths, bars = false }: { lengths: readonly number[]; bars?: boolean }) {
  const t = useTranslation().goodDayNote
  const language = useLanguage()
  const span = flareSpan(lengths)
  if (!span) return null
  const sentence =
    span.shortest === span.longest
      ? format(t.proofSame, { n: span.count, days: span.longest }, language)
      : format(t.proofSpan, { n: span.count, min: span.shortest, max: span.longest }, language)
  return (
    <div className="flex gap-2 items-start">
      <IconSunrise size={20} stroke={1.8} aria-hidden className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-body">
          {sentence} <strong className="font-semibold">{t.proofEnd}</strong>
        </p>
        {bars && (
          <div className="flex flex-col gap-1.5 mt-2" aria-hidden>
            {lengths.slice(-MAX_BARS).map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="h-1.5 rounded-full" style={{ width: `${Math.max(6, (d / span.longest) * 55)}%`, background: 'color-mix(in srgb, var(--color-brand) 28%, transparent)' }} />
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--marker)' }} />
                <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                  {format(t.days, { n: d }, language)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** In the soft card of a hard day: the note is there, to open when the person wants. */
export function NoteWaitingRow({ note, onOpen }: { note: GoodDayNote; onOpen: () => void }) {
  const t = useTranslation().goodDayNote
  const date = noteDate(note.date, useLocale().intlLocale, todayISO())
  return (
    <button type="button" onClick={onOpen} className="flex items-center gap-3 w-full min-h-14 py-2.5 pl-3 pr-3 rounded-[16px] text-left" style={{ background: 'var(--color-surface)' }}>
      <span className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }} aria-hidden>
        <IconMail size={20} stroke={1.8} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-control font-semibold">{t.waiting}</span>
        <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {format(t.writtenOn, { date })}
        </span>
      </span>
      <IconChevronRight size={20} aria-hidden style={{ color: 'var(--color-ink-muted)' }} />
    </button>
  )
}

/** At the top of « Mon plan »: the note, read like a letter, then what the journal knows. */
export function NoteLetter({ note, lengths, onEdit }: { note: GoodDayNote; lengths: readonly number[]; onEdit: () => void }) {
  const t = useTranslation().goodDayNote
  const date = noteDate(note.date, useLocale().intlLocale, todayISO())
  const proof = flareSpan(lengths) !== null
  return (
    <section aria-label={format(t.letterTitle, { date })} className="rounded-[var(--radius-card)] px-5 pt-5 pb-4" style={{ background: 'var(--color-surface)', boxShadow: '0 6px 24px rgba(44, 40, 96, 0.08)' }}>
      <h2 className="text-caption font-semibold flex items-center gap-1.5 mb-2.5" style={{ color: 'var(--color-ink-muted)' }}>
        <IconMail size={16} stroke={1.8} aria-hidden style={{ color: 'var(--color-brand)' }} />
        {format(t.letterTitle, { date })}
      </h2>
      <p className="whitespace-pre-line italic text-[1.25rem] leading-[1.55]">{note.text}</p>
      {proof && (
        <div className="mt-3.5 pt-3 border-t border-dashed" style={{ borderColor: 'var(--color-hairline)' }}>
          <FlareProof lengths={lengths} bars />
        </div>
      )}
      <button type="button" onClick={onEdit} className="mt-3 min-h-11 text-control font-semibold" style={{ color: 'var(--color-brand)' }}>
        {t.edit}
      </button>
    </section>
  )
}

/** The sheet to write (or change) the note: one field, three ways to begin. Kept on the device; emptied, it is removed. */
export function NoteSheet({ note, onClose, onSaved }: { note?: GoodDayNote; onClose: () => void; onSaved?: () => void }) {
  const t = useTranslation().goodDayNote
  const [text, setText] = useState(note?.text ?? '')
  const field = useRef<HTMLTextAreaElement>(null)
  const id = useId()
  // A way to begin goes at the end of what is written, and the cursor right after it, ready to type.
  const caret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (caret.current === null || !field.current) return
    field.current.focus()
    field.current.setSelectionRange(caret.current, caret.current)
    caret.current = null
  }, [text])
  const begin = (s: string) => {
    const next = (text.trim() ? `${text.trimEnd()}\n${s}` : s).slice(0, MAX_NOTE)
    caret.current = next.length
    setText(next)
  }
  return (
    <ModalSheet title={t.sheetTitle} closeLabel={t.close} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void updateSettings({ goodDayNote: cleanNote(text, todayISO()) }).then(() => {
            onSaved?.()
            onClose()
          })
        }}
      >
        <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>
          {t.sheetIntro}
        </p>
        <label htmlFor={id} className="sr-only">
          {t.fieldLabel}
        </label>
        <textarea
          id={id}
          ref={field}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_NOTE}
          rows={5}
          placeholder={t.placeholder}
          className="w-full rounded-xl px-3.5 py-2.5 text-body leading-[1.55] italic outline-none resize-y"
          style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        />
        <div>
          <p className="text-caption mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>
            {t.startersLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {t.starters.map((s) => (
              <button key={s} type="button" onClick={() => begin(s)} className="text-caption min-h-9 px-3 rounded-full" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}>
                {s.replace(/[\s:]+$/, '')}…
              </button>
            ))}
          </div>
        </div>
        {note && (
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {t.emptyHint}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={!note && !text.trim()} className={`${BUTTON} inline-flex items-center gap-2 disabled:opacity-50`} style={PRIMARY}>
            {t.save}
          </button>
          <button type="button" onClick={onClose} className={BUTTON} style={SECONDARY}>
            {t.cancel}
          </button>
        </div>
      </form>
    </ModalSheet>
  )
}

/** On the day's page, the first days after a flare ended: once, the offer to write for the next one. */
export function NoteInviteCard({ flareStart }: { flareStart: string }) {
  const t = useTranslation().goodDayNote
  const [writing, setWriting] = useState(false)
  const answer = () => updateSettings({ goodDayNoteAsked: flareStart })
  return (
    <section aria-label={t.inviteLabel} className="rounded-[var(--radius-card)] p-[18px]" style={{ background: 'var(--color-brand-soft)' }}>
      <p className="section-title text-heading font-bold leading-snug mb-1">{t.inviteTitle}</p>
      <p className="text-body">{t.inviteBody}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" className={`${BUTTON} inline-flex items-center gap-2`} style={PRIMARY} onClick={() => setWriting(true)}>
          <IconWriting size={18} stroke={1.8} aria-hidden />
          {t.write}
        </button>
        <button type="button" className={BUTTON} style={SECONDARY} onClick={() => void answer()}>
          {t.later}
        </button>
      </div>
      {writing && <NoteSheet onClose={() => setWriting(false)} onSaved={() => void answer()} />}
    </section>
  )
}
