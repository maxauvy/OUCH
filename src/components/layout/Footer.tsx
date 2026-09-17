import { useTranslation } from '../../i18n'

export function Footer() {
  const t = useTranslation()
  return (
    <p className="text-center text-[11px] mt-2 pt-3" style={{ color: 'var(--color-ink-muted)', opacity: 0.7 }}>
      {t.footer.credit} ·{' '}
      <a href="https://github.com/maxauvy/OUCH" target="_blank" rel="noopener noreferrer" className="underline">
        {t.footer.sourceCode}
      </a>
    </p>
  )
}
