import { IconBell } from '@tabler/icons-react'
import { format, useLanguage, useTranslation } from '../../i18n'

/** The round button next to the settings that opens « Nouveautés ». A small amber dot while something is unread: never a number, never red. */
export function NewsButton({ unread, onClick }: { unread: number; onClick: () => void }) {
  const t = useTranslation().news
  const language = useLanguage()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unread > 0 ? format(t.unreadLabel, { n: unread }, language) : t.title}
      className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0"
      style={{ background: 'var(--avatar-bg, var(--color-brand-soft))', color: 'var(--color-brand)' }}
    >
      <IconBell size={22} stroke={1.8} aria-hidden />
      {unread > 0 && (
        <span
          className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full"
          style={{ background: 'var(--color-weather-1)', boxShadow: '0 0 0 2px var(--avatar-bg, var(--color-brand-soft))' }}
          aria-hidden
        />
      )}
    </button>
  )
}
