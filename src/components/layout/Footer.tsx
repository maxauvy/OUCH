import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n'
import { isEarlyAccess, setEarlyAccess } from '../../lib/earlyAccess'
import { registerTap, type TapRun } from '../../lib/earlyAccessTaps'
import { reloadToLatest, useLatestCommit } from '../../hooks/useLatestCommit'
import { buildId } from '../../lib/buildId'

const REPO_URL = 'https://github.com/maxauvy/OUCH'

export function Footer() {
  const t = useTranslation()
  const latest = useLatestCommit()
  const isRelease = __APP_COMMIT__ !== 'dev' && __APP_COMMIT__ !== 'unknown'
  const outdated = isRelease && latest !== null && latest !== buildId(__APP_COMMIT__, __APP_IS_TAGGED_RELEASE__)

  // Five quick taps on the credit line switch early access on or off for this
  // device (see lib/earlyAccess.ts). Nothing on screen invites it: it is for
  // trying a feature on a phone before it is offered to everyone.
  const taps = useRef<TapRun | null>(null)
  const [said, setSaid] = useState<string | null>(null)
  useEffect(() => {
    if (said === null) return
    const timer = setTimeout(() => setSaid(null), 4000)
    return () => clearTimeout(timer)
  }, [said])
  function onCreditTap() {
    const { run, done } = registerTap(taps.current, Date.now())
    taps.current = run
    if (!done) return
    const next = !isEarlyAccess()
    setEarlyAccess(next)
    setSaid(next ? t.footer.earlyOn : t.footer.earlyOff)
  }

  return (
    // Muted ink without extra opacity: that is what keeps it at 4.5:1 or more.
    <div className="text-center text-caption mt-2 pt-3" style={{ color: 'var(--color-ink-muted)' }}>
      <p>
        <span onClick={onCreditTap}>{t.footer.credit}</span> ·{' '}
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
        {said}
        {!said && outdated && (
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
