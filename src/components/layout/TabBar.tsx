import { IconCalendar, IconChartLine, IconHeartbeat, IconStethoscope, IconWind, type Icon } from '@tabler/icons-react'
import { useTranslation } from '../../i18n'

export type Tab = 'today' | 'journal' | 'trends' | 'soulager' | 'consultation'

const TAB_ICONS: Record<Tab, Icon> = {
  today: IconHeartbeat,
  journal: IconCalendar,
  trends: IconChartLine,
  soulager: IconWind,
  consultation: IconStethoscope,
}

/** `badged` tabs carry a small dot, named for screen readers: something new is there, without a number. */
export function TabBar({
  active,
  onChange,
  badged = [],
}: {
  active: Tab
  onChange: (t: Tab) => void
  badged?: Tab[]
}) {
  const t = useTranslation()
  const ALL: { id: Tab; label: string }[] = [
    { id: 'today', label: t.tabs.today },
    { id: 'journal', label: t.tabs.journal },
    { id: 'trends', label: t.tabs.trends },
    { id: 'soulager', label: t.tabs.soulager },
    { id: 'consultation', label: t.tabs.consultation },
  ]
  const TABS = ALL
  // A compact pill floating above the bottom edge, as the « Actualiser » bubble of OUCH Duo: the page
  // shows through its frosted glass while it scrolls. Only the open tab shows its name; the others keep
  // theirs for screen readers. On an installed iPhone it sits just above the home bar rather than below
  // the whole safe area. The pages keep 112px free at their foot (pb-28), more than the pill needs.
  return (
    <nav
      className="fixed inset-x-0 z-40 flex justify-center px-3 pointer-events-none"
      style={{ bottom: 'max(12px, calc(env(safe-area-inset-bottom) - 12px))' }}
    >
      <div
        className="pointer-events-auto flex items-center max-w-full"
        style={{
          height: 58,
          padding: 5,
          borderRadius: 999,
          border: '1px solid var(--color-hairline)',
          background: 'color-mix(in srgb, var(--color-surface) 80%, transparent)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
          backdropFilter: 'blur(14px) saturate(1.4)',
          boxShadow: '0 10px 30px -14px rgba(20, 28, 48, 0.5)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id
          const Icon = TAB_ICONS[tab.id]
          const badge = badged.includes(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={badge ? `${tab.label}, ${t.tabs.trendsNew}` : tab.label}
              className="h-full flex items-center justify-center gap-1.5 shrink-0 min-w-0"
              style={{
                borderRadius: 999,
                minWidth: 46,
                padding: isActive ? '0 15px 0 12px' : 0,
                color: isActive ? 'var(--tab-active, var(--color-ink))' : 'var(--color-ink-muted)',
                background: isActive ? 'var(--color-brand-soft)' : undefined,
              }}
            >
              <span className="relative flex shrink-0" style={{ color: isActive ? 'var(--tab-active-icon, inherit)' : undefined }}>
                <Icon size={24} stroke={isActive ? 2 : 1.6} aria-hidden />
                {badge && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full"
                    style={{ background: 'var(--color-brand)', boxShadow: '0 0 0 2px var(--color-surface)' }}
                  />
                )}
              </span>
              {isActive && (
                <span
                  aria-hidden
                  className="font-semibold truncate"
                  style={{ fontSize: 'min(calc(var(--text-caption) * 1.1), 16px)' }}
                >
                  {tab.label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
