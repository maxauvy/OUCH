import { Component, type ErrorInfo, type ReactNode } from 'react'
import { db } from '../../db'
import { getTranslations, type Language } from '../../i18n'

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
    if (where) this.setState({ detail: `${crashDetail(error)}\n${where}` })
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
          <pre className="mt-2 whitespace-pre-wrap break-words select-text" style={{ fontSize: 12 }}>
            {this.state.detail}
          </pre>
        </details>
      </main>
    )
  }
}

/** The error in a few lines, with the release it happened in. */
function crashDetail(error: unknown): string {
  const head = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const stack = error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : ''
  // File addresses shortened to their name: the commit says which build they belong to.
  return [`OUCH ${__APP_VERSION__} (${__APP_COMMIT__}) · ${navigator.userAgent}`, head, stack].filter(Boolean).join('\n').replace(/https?:\/\/[^\s)]*\/assets\//g, '')
}
