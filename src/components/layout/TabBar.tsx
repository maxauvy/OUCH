import { useTranslation } from '../../i18n'

export type Tab = 'today' | 'journal' | 'trends' | 'settings'

const TAB_ICONS: Record<Tab, string> = {
  today: '☀️',
  journal: '📅',
  trends: '📈',
  settings: '⚙️',
}

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const t = useTranslation()
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'today', label: t.tabs.today, icon: TAB_ICONS.today },
    { id: 'journal', label: t.tabs.journal, icon: TAB_ICONS.journal },
    { id: 'trends', label: t.tabs.trends, icon: TAB_ICONS.trends },
    { id: 'settings', label: t.tabs.settings, icon: TAB_ICONS.settings },
  ]
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40"
      style={{
        borderTop: '1px solid var(--color-hairline)',
        background: 'color-mix(in srgb, var(--color-paper) 92%, transparent)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="max-w-[560px] mx-auto flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
          >
            <span className="text-[19px]" style={{ opacity: active === t.id ? 1 : 0.55 }}>
              {t.icon}
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: active === t.id ? 'var(--color-brand)' : 'var(--color-ink-muted)' }}
            >
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
