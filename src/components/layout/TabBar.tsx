import { IconCalendar, IconChartLine, IconHeartbeat, IconMoodKid, IconSettings, type Icon } from '@tabler/icons-react'
import { useDesign } from '../../hooks/useDesign'
import { useTranslation } from '../../i18n'

export type Tab = 'today' | 'journal' | 'trends' | 'kids' | 'settings'

const TAB_EMOJI: Record<Tab, string> = {
  today: '☀️',
  journal: '📅',
  trends: '📈',
  kids: '🧸',
  settings: '⚙️',
}

const TAB_ICONS: Record<Tab, Icon> = {
  today: IconHeartbeat,
  journal: IconCalendar,
  trends: IconChartLine,
  kids: IconMoodKid,
  settings: IconSettings,
}

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const t = useTranslation()
  const health = useDesign() === 'health'
  const TABS: { id: Tab; label: string }[] = [
    { id: 'today', label: t.tabs.today },
    { id: 'journal', label: t.tabs.journal },
    { id: 'trends', label: t.tabs.trends },
    { id: 'kids', label: t.tabs.kids },
    { id: 'settings', label: t.tabs.settings },
  ]
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40"
      style={{
        borderTop: '1px solid var(--color-hairline)',
        background: health ? 'var(--color-surface)' : 'color-mix(in srgb, var(--color-paper) 92%, transparent)',
        backdropFilter: health ? undefined : 'blur(10px)',
      }}
    >
      <div className="max-w-[560px] mx-auto flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map((tab) => {
          const isActive = active === tab.id
          const activeColor = tab.id === 'kids' && !health ? 'var(--color-kid-accent-text)' : 'var(--color-brand)'
          const Icon = TAB_ICONS[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
              style={{ color: isActive ? activeColor : 'var(--color-ink-muted)' }}
            >
              {health ? (
                <Icon size={22} stroke={isActive ? 2 : 1.6} aria-hidden />
              ) : (
                <span className="text-[19px]" style={{ opacity: isActive ? 1 : 0.55 }} aria-hidden>
                  {TAB_EMOJI[tab.id]}
                </span>
              )}
              <span className={`text-[11px] ${health && isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
