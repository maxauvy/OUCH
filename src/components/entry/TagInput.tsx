import { useState } from 'react'
import { Chip } from '../ui/Chip'
import { useDesign } from '../../hooks/useDesign'
import { format, useTranslation } from '../../i18n'

export function TagInput({
  values,
  onChange,
  placeholder,
  label,
  suggestions = [],
  autoFocus,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
  /** Accessible name of the text field (the placeholder disappears once typing). */
  label: string
  suggestions?: string[]
  autoFocus?: boolean
}) {
  const t = useTranslation()
  const [draft, setDraft] = useState('')
  const health = useDesign() === 'health'

  function commit(raw: string) {
    const v = raw.trim()
    if (!v || values.includes(v)) return
    onChange([...values, v])
    setDraft('')
  }

  const unusedSuggestions = suggestions.filter((s) => !values.includes(s)).slice(0, 10)

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            aria-label={format(t.entryForm.removeTag, { tag: v })}
            className="rounded-[var(--radius-control)] pl-3.5 pr-2.5 py-2 text-control font-medium inline-flex items-center gap-1.5"
            style={
              health
                ? { background: 'var(--color-brand-soft)', color: 'var(--color-brand)', boxShadow: 'inset 0 0 0 1px var(--color-brand)' }
                : { background: 'var(--color-brand)', color: 'var(--color-on-brand)' }
            }
          >
            {v}
            <span aria-hidden>×</span>
          </button>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          }
        }}
        onBlur={() => draft && commit(draft)}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
        style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
      />
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {unusedSuggestions.map((s) => (
            <Chip key={s} label={s} selected={false} onClick={() => commit(s)} actionLabel={format(t.entryForm.addTag, { tag: s })} />
          ))}
        </div>
      )}
    </div>
  )
}
