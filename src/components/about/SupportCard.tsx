import { IconExternalLink } from '@tabler/icons-react'
import { format, useTranslation } from '../../i18n'
import { SUPPORT_SERVICE, SUPPORT_URL } from '../../lib/support'
import { Card, SectionTitle } from '../ui/Card'

/** A quiet way to support the developer: one sentence, one link, and what
 * the link does not do. Only in Settings, never in the way of the diary. */
export function SupportCard() {
  const t = useTranslation().support
  if (!SUPPORT_URL) return null
  return (
    <Card>
      <SectionTitle>{t.title}</SectionTitle>
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
    </Card>
  )
}
