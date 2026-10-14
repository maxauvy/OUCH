import { useState } from 'react'
import { clearTrace, formatTrace, readTrace } from '../../lib/lockTrace'
import { useTranslation } from '../../i18n'

/**
 * What the page's lifecycle events did the last times the app went to the
 * background (early access only). To find out, on a real phone, whether the
 * cover goes up before the system takes the app-switcher picture.
 */
export function LockTrace() {
  const t = useTranslation().lockSettings.trace
  const [text, setText] = useState(() => formatTrace(readTrace()))
  const [copied, setCopied] = useState(false)
  const soft = { background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }

  const refresh = () => {
    setText(formatTrace(readTrace()))
    setCopied(false)
  }

  return (
    <details className="mt-4" onToggle={(e) => e.currentTarget.open && refresh()}>
      <summary className="text-control font-medium cursor-pointer min-h-11 flex items-center">{t.title}</summary>
      <p className="text-caption mb-2" style={{ color: 'var(--color-ink-muted)' }}>
        {t.hint}
      </p>
      <pre
        tabIndex={0}
        aria-label={t.title}
        className="text-[11px] leading-snug rounded-[var(--radius-control)] p-3 overflow-x-auto select-text"
        style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
      >
        {text || t.empty}
      </pre>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={refresh} className="flex-1 min-h-11 rounded-[var(--radius-control)] px-3 text-control font-semibold" style={soft}>
          {t.refresh}
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => setCopied(true))
          }}
          className="flex-1 min-h-11 rounded-[var(--radius-control)] px-3 text-control font-semibold"
          style={soft}
        >
          {copied ? t.copied : t.copy}
        </button>
        <button
          type="button"
          onClick={() => {
            clearTrace()
            refresh()
          }}
          className="flex-1 min-h-11 rounded-[var(--radius-control)] px-3 text-control font-semibold"
          style={soft}
        >
          {t.clear}
        </button>
      </div>
    </details>
  )
}
