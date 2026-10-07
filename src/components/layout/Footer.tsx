import { useTranslation } from '../../i18n'
import { reloadToLatest, useLatestCommit } from '../../hooks/useLatestCommit'

const REPO_URL = 'https://github.com/maxauvy/OUCH'

export function Footer() {
  const t = useTranslation()
  const latest = useLatestCommit()
  const isRelease = __APP_COMMIT__ !== 'dev' && __APP_COMMIT__ !== 'unknown'
  const outdated = isRelease && latest !== null && latest !== __APP_COMMIT__
  return (
    // Muted ink without extra opacity: that is what keeps it at 4.5:1 or more.
    <div className="text-center text-caption mt-2 pt-3" style={{ color: 'var(--color-ink-muted)' }}>
      <p>
        {t.footer.credit} ·{' '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline">
          {t.footer.sourceCode}
        </a>
        {' · '}
        {isRelease ? (
          <a
            href={
              __APP_IS_TAGGED_RELEASE__
                ? `${REPO_URL}/releases/tag/v${__APP_VERSION__}`
                : `${REPO_URL}/commit/${__APP_COMMIT__}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {__APP_IS_TAGGED_RELEASE__ ? (
              <>v{__APP_VERSION__}</>
            ) : (
              <>
                {__APP_VERSION__}+<span className="font-mono">{__APP_COMMIT__}</span>
              </>
            )}{' '}
            · {__APP_BUILD_DATE__}
          </a>
        ) : (
          <span className="font-mono">{__APP_COMMIT__}</span>
        )}
      </p>
      <p role="status">
        {outdated && (
          <>
            {t.footer.updateAvailable} ·{' '}
            <button type="button" onClick={() => void reloadToLatest()} className="underline font-medium">
              {t.footer.reload}
            </button>
          </>
        )}
      </p>
    </div>
  )
}
