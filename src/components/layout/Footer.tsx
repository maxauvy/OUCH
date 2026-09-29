import { useTranslation } from '../../i18n'

const REPO_URL = 'https://github.com/maxauvy/OUCH'

export function Footer() {
  const t = useTranslation()
  const isRelease = __APP_COMMIT__ !== 'dev' && __APP_COMMIT__ !== 'unknown'
  return (
    // Muted ink without extra opacity: that is what keeps it at 4.5:1 or more.
    <p className="text-center text-caption mt-2 pt-3" style={{ color: 'var(--color-ink-muted)' }}>
      {t.footer.credit} ·{' '}
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline">
        {t.footer.sourceCode}
      </a>
      {' · '}
      {isRelease ? (
        <a
          href={`${REPO_URL}/commit/${__APP_COMMIT__}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          <span className="font-mono">{__APP_COMMIT__}</span> · {__APP_BUILD_DATE__}
        </a>
      ) : (
        <span className="font-mono">{__APP_COMMIT__}</span>
      )}
    </p>
  )
}
