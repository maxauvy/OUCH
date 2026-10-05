import { Component, type ReactNode } from 'react'
import { db } from '../../db'
import { getTranslations, type Language } from '../../i18n'

// Without this, one unreadable record (a damaged backup, a bug) leaves a
// blank screen at every launch, with no way out short of clearing the
// browser's site data by hand. Sits above the i18n provider, so the
// language is read back from the page rather than from context.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
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
          className="rounded-[var(--radius-control)] py-3 text-body font-semibold text-[var(--color-on-brand)]"
          style={{ background: 'var(--color-brand)' }}
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
      </main>
    )
  }
}
