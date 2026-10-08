import { IconCoffee, IconExternalLink } from '@tabler/icons-react'
import { useEntryCount } from '../../hooks/useEntries'
import { format, useTranslation } from '../../i18n'
import { SUPPORT_SERVICE, SUPPORT_URL, showSupport } from '../../lib/support'
import { Card } from '../ui/Card'

/** A quiet way to support the developer: one sentence, one link, and what
 * the link does not do. Only at the bottom of Settings, and only once the
 * diary has some days in it; never in the way of the diary. */
export function SupportCard() {
  const t = useTranslation().support
  const loggedDays = useEntryCount()
  if (!showSupport(SUPPORT_URL, loggedDays)) return null
  return (
    <Card>
      <div className="flex gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          aria-hidden
        >
          <IconCoffee size={20} stroke={1.75} />
        </span>
        <div>
          <h2 className="text-control font-medium mb-1">{t.title}</h2>
          <p className="text-control leading-relaxed">
            {t.before}
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
              style={{ color: 'var(--color-brand)' }}
            >
              {t.link}
              <IconExternalLink size={14} aria-hidden className="inline ml-0.5 -mt-0.5" />
              <span className="sr-only"> {format(t.opens, { service: SUPPORT_SERVICE })}</span>
            </a>
            {t.after}
          </p>
          <p className="text-caption leading-relaxed mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {format(t.note, { service: SUPPORT_SERVICE })}
          </p>
        </div>
      </div>
    </Card>
  )
}
