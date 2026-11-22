import { IconChevronRight, IconCloud, IconHeart, IconMapPin, type Icon } from '@tabler/icons-react'
import { useTranslation } from '../../i18n'
import type { NewsId } from '../../lib/news'
import { ModalSheet } from '../ui/ModalSheet'

/** « Nouveautés »: what OUCH has to say about itself, newest first. Each row opens its own sheet; an unread one carries a small amber dot. */
export function NewsSheet({ items, unread, onOpen, onClose }: { items: NewsId[]; unread: NewsId[]; onOpen: (id: NewsId) => void; onClose: () => void }) {
  const t = useTranslation()
  const rows: Record<NewsId, { icon: Icon; title: string; hint: string; warm: boolean }> = {
    duo: { icon: IconCloud, title: t.news.duo.title, hint: t.news.duoRowHint, warm: false },
    thanks: { icon: IconHeart, title: t.news.thanksRow, hint: t.news.thanksRowHint, warm: true },
    zones: { icon: IconMapPin, title: t.zonesNotice.cardTitle, hint: t.news.zonesRowHint, warm: false },
  }
  return (
    <ModalSheet title={t.news.title} closeLabel={t.news.close} onClose={onClose}>
      <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
        {t.news.intro}
      </p>
      <ul className="flex flex-col" role="list">
        {items.map((id, i) => {
          const { icon: Icon, title, hint, warm } = rows[id]
          const isUnread = unread.includes(id)
          return (
            <li key={id} style={i > 0 ? { borderTop: '1px solid var(--color-hairline)' } : undefined}>
              <button type="button" onClick={() => onOpen(id)} className="flex w-full items-center gap-3 py-3 text-left">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={warm ? { background: 'color-mix(in srgb, var(--color-weather-1) 22%, var(--color-surface))', color: 'var(--color-weather-1-text)' } : { background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
                  aria-hidden
                >
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`flex items-center gap-2 text-control ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                    {title}
                    {isUnread && (
                      <>
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--color-weather-1)' }} aria-hidden />
                        <span className="sr-only">{t.news.unread}</span>
                      </>
                    )}
                  </span>
                  <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                    {hint}
                  </span>
                </span>
                <IconChevronRight size={18} aria-hidden style={{ color: 'var(--color-ink-muted)' }} />
              </button>
            </li>
          )
        })}
      </ul>
    </ModalSheet>
  )
}
