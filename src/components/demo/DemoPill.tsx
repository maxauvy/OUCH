import { exitDemo } from '../../lib/demoSession'
import { useTranslation } from '../../i18n'

/** On every screen of the demo, above the tab bar: a quiet reminder that the
 * data is made up, and the way out. Leaving needs no confirmation: nothing in
 * the sandbox is worth keeping, and the person's own journal was never in it. */
export function DemoPill() {
  const t = useTranslation().demo
  return (
    <aside
      aria-label={t.pill}
      className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full py-1 pl-4 pr-1 text-caption font-semibold whitespace-nowrap shadow-lg"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)', background: 'var(--color-ink)', color: 'var(--color-paper)' }}
    >
      <span>{t.pill}</span>
      <button
        type="button"
        onClick={() => void exitDemo()}
        className="min-h-9 rounded-full px-3 underline underline-offset-2"
        style={{ color: 'var(--color-paper)' }}
      >
        {t.exit}
      </button>
    </aside>
  )
}
