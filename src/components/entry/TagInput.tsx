import { useState } from 'react'
import { Chip } from '../ui/Chip'

export function TagInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
  suggestions?: string[]
}) {
  const [draft, setDraft] = useState('')

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
            className="rounded-full pl-3.5 pr-2.5 py-2 text-[14px] font-medium inline-flex items-center gap-1.5"
            style={{ background: 'var(--color-brand)', color: 'white' }}
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
        className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none"
        style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
      />
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {unusedSuggestions.map((s) => (
            <Chip key={s} label={s} selected={false} onClick={() => commit(s)} />
          ))}
        </div>
      )}
    </div>
  )
}
