import { IconCalendar, IconChartLine, IconHeartbeat, IconMoodKid, IconSettings, type Icon } from '@tabler/icons-react'
import { useTranslation } from '../../i18n'

export type Tab = 'today' | 'journal' | 'trends' | 'kids' | 'settings'

const TAB_ICONS: Record<Tab, Icon> = {
  today: IconHeartbeat,
  journal: IconCalendar,
  trends: IconChartLine,
  kids: IconMoodKid,
  settings: IconSettings,
}

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const t = useTranslation()
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
        background: 'var(--color-surface)',
      }}
    >
      <div className="max-w-[560px] mx-auto flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map((tab) => {
          const isActive = active === tab.id
          const Icon = TAB_ICONS[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
              style={{ color: isActive ? 'var(--color-brand)' : 'var(--color-ink-muted)' }}
            >
              <Icon size={22} stroke={isActive ? 2 : 1.6} aria-hidden />
              {/* Capped: five labels share the screen width, so they only grow
                  as far as the longest one ("Aujourd'hui") still fits — 13px on
                  a 360px phone, up to 16px on wider screens. iOS caps its own
                  tab bar labels the same way. */}
              <span
                className={isActive ? 'font-semibold' : 'font-medium'}
                style={{ fontSize: 'min(var(--text-caption), max(13px, 3.5vw), 16px)' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
