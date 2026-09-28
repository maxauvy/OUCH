import { useTranslation } from '../../i18n'

export function Footer() {
  const t = useTranslation()
  return (
    // Muted ink without extra opacity: that is what keeps it at 4.5:1 or more.
    <p className="text-center text-caption mt-2 pt-3" style={{ color: 'var(--color-ink-muted)' }}>
      {t.footer.credit} ·{' '}
      <a href="https://github.com/maxauvy/OUCH" target="_blank" rel="noopener noreferrer" className="underline">
        {t.footer.sourceCode}
      </a>
    </p>
  )
}
