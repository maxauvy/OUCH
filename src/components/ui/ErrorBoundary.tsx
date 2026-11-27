import { Component, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { IconCheck, IconCopy, IconShare } from '@tabler/icons-react'
import { db } from '../../db'
import { getTranslations, type Language, type Translations } from '../../i18n'

// Without this, one unreadable record (a damaged backup, a bug) leaves a
// blank screen at every launch, with no way out short of clearing the
// browser's site data by hand. Sits above the i18n provider, so the
// language is read back from the page rather than from context.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; detail: string }> {
  state = { failed: false, detail: '' }

  static getDerivedStateFromError(error: unknown) {
    return { failed: true, detail: crashDetail(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error)
    // Where in the screens it broke: the first components named.
    const where = (info.componentStack ?? '').trim().split('\n').slice(0, 6).map((l) => l.trim()).join('\n')
    if (where) this.setState({ detail: `${crashDetail(error)}\n${shortFiles(where)}` })
  }

  render() {
    if (!this.state.failed) return this.props.children
    const language = document.documentElement.lang === 'en' ? 'en' : ('fr' satisfies Language)
    const t = getTranslations(language).crash
    return (
      <main role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-title font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t.title}
        </h1>
        <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>
          {t.body}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          {t.reload}
        </button>
        <button
          onClick={async () => {
            if (!window.confirm(t.eraseConfirm)) return
            await db.delete()
            window.location.reload()
          }}
          className="rounded-[var(--radius-control)] py-3 text-body font-semibold"
          style={{ color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        >
          {t.erase}
        </button>
        {/* What broke, folded: nothing to read for the person, something to send to the developer (shown on this device only, never sent). */}
        <details className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          <summary className="cursor-pointer py-1">{t.details}</summary>
          <DetailText detail={this.state.detail} t={t} />
        </details>
      </main>
    )
  }
}

/** The error in a few lines, with the release it happened in. */
function crashDetail(error: unknown): string {
  const head = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const stack = error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : ''
  return shortFiles([`OUCH ${__APP_VERSION__} (${__APP_COMMIT__}) · ${navigator.userAgent}`, head, stack].filter(Boolean).join('\n'))
}

/** File addresses shortened to their name: the commit says which build they belong to. */
function shortFiles(text: string): string {
  return text.replace(/https?:\/\/[^\s)]*\/assets\//g, '')
}

/** The details, and one small button to pass them on: the share sheet on a phone (Messages, mail…), the clipboard elsewhere.
 * If neither works, the text is selected so that the system's own « Copy » does it. Never an error on top of the error. */
function DetailText({ detail, t }: { detail: string; t: Translations['crash'] }) {
  const textRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const share = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches

  const selectText = () => {
    const node = textRef.current
    const selection = window.getSelection()
    if (!node || !selection) return
    const range = document.createRange()
    range.selectNodeContents(node)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const passOn = async () => {
    if (share) {
      try {
        await navigator.share({ text: detail })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(detail)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      selectText()
    }
  }

  const Icon = copied ? IconCheck : share ? IconShare : IconCopy
  return (
    <>
      <pre ref={textRef} className="mt-2 whitespace-pre-wrap break-words select-text" style={{ fontSize: 12 }}>
        {detail}
      </pre>
      <button
        type="button"
        onClick={() => void passOn()}
        className="mt-3 inline-flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-caption font-medium"
        style={{ color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
      >
        <Icon size={16} aria-hidden />
        {copied ? t.copied : share ? t.shareDetails : t.copyDetails}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? t.copied : ''}
      </span>
    </>
  )
}
