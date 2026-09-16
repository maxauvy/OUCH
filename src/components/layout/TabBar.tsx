export type Tab = 'today' | 'journal' | 'trends' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Aujourd’hui', icon: '☀️' },
  { id: 'journal', label: 'Journal', icon: '📅' },
  { id: 'trends', label: 'Tendances', icon: '📈' },
  { id: 'settings', label: 'Réglages', icon: '⚙️' },
]

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
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
