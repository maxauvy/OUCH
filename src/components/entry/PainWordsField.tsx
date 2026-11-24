import { useId, useState } from 'react'
import { IconCheck } from '@tabler/icons-react'
import { format, useLanguage, useTranslation } from '../../i18n'
import { MAX_TYPED, MAX_WORDS, PAIN_WORDS, cleanPainWords, isPaletteWord, sameWords } from '../../lib/painWords'
import { Chip } from '../ui/Chip'

/**
 * « À quoi ressemble-t-elle ? »: the usual words come back, one tap says
 * « as usual » and writes them for the day; « different » opens the palette.
 * Before there are usual words, the palette is open from the start. Three
 * words at most; a word of one's own can be added. Never a score.
 */
export function PainWordsField({ value, usual, onChange }: { value: string[] | undefined; usual: string[]; onChange: (words: string[] | undefined) => void }) {
  const t = useTranslation().painWords
  const language = useLanguage()
  const ids = useId()
  const words = value ?? []
  const asUsual = usual.length > 0 && sameWords(words, usual)
  // The palette is open when there is nothing usual yet, when the day already differs, or when asked.
  const [opened, setOpened] = useState(false)
  const open = usual.length === 0 || opened || (words.length > 0 && !asUsual)
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')
  const label = (w: string) => (isPaletteWord(w) ? t.words[w] : w)
  const set = (next: string[]) => onChange(next.length ? cleanPainWords(next) : undefined)
  const toggle = (w: string) => (words.includes(w) ? set(words.filter((x) => x !== w)) : words.length < MAX_WORDS && set([...words, w]))
  const full = words.length >= MAX_WORDS
  const typedWords = words.filter((w) => !isPaletteWord(w))

  return (
    <div className="flex flex-col gap-3">
      {usual.length > 0 && (
        <>
          <p className="text-body">{format(t.usual, { list: new Intl.ListFormat(language, { type: 'conjunction' }).format(usual.map((w) => label(w).toLocaleLowerCase(language))) }, language)}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={asUsual}
              onClick={() => {
                setOpened(false)
                set(asUsual ? [] : usual)
              }}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-2 rounded-[var(--radius-control)] text-control font-semibold"
              style={asUsual ? { background: 'var(--look-fog-soft, var(--color-brand-soft))', color: 'var(--look-fog, var(--color-brand))', boxShadow: 'inset 0 0 0 1.5px var(--look-fog, var(--color-brand))' } : { background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}
            >
              {asUsual && <IconCheck size={18} aria-hidden />}
              {t.asUsual}
            </button>
            <button
              type="button"
              aria-pressed={open}
              aria-expanded={open}
              aria-controls={`${ids}-palette`}
              onClick={() => {
                if (asUsual) set([])
                setOpened(true)
              }}
              className="min-h-11 px-2 rounded-[var(--radius-control)] text-control font-semibold"
              style={open ? { background: 'var(--look-fog-soft, var(--color-brand-soft))', color: 'var(--look-fog, var(--color-brand))', boxShadow: 'inset 0 0 0 1.5px var(--look-fog, var(--color-brand))' } : { background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}
            >
              {t.different}
            </button>
          </div>
        </>
      )}
      {open && (
        <div id={`${ids}-palette`} className="flex flex-col gap-2">
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {usual.length > 0 ? t.todayLike : t.firstTime}
          </p>
          <div role="group" aria-label={t.title} className="flex flex-wrap gap-2">
            {[...PAIN_WORDS, ...typedWords].map((w) => (
              <Chip key={w} label={label(w)} selected={words.includes(w)} tone="fog" onClick={() => toggle(w)} />
            ))}
            {!typing && !full && <Chip label={`+ ${t.other}`} selected={false} actionLabel={t.otherLabel} onClick={() => setTyping(true)} />}
          </div>
          {typing && !full && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (typed.trim()) set([...words, typed])
                setTyped('')
                setTyping(false)
              }}
            >
              <label htmlFor={`${ids}-typed`} className="sr-only">
                {t.otherLabel}
              </label>
              <input
                id={`${ids}-typed`}
                autoFocus
                value={typed}
                maxLength={MAX_TYPED}
                onChange={(e) => setTyped(e.target.value)}
                className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-body outline-none"
                style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
              />
              <button type="submit" className="btn-secondary">
                {t.add}
              </button>
            </form>
          )}
          <p role="status" className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {full ? t.max : ''}
          </p>
        </div>
      )}
    </div>
  )
}
