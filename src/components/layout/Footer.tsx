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

  // After the tap on "reload": the new version can take a few seconds to take over, so the page says it has heard, and that nothing is lost. The page reloads by itself; if it somehow does not, the link comes back.
  const [updating, setUpdating] = useState(false)
  useEffect(() => {
    if (!updating) return
    const timer = setTimeout(() => setUpdating(false), 15_000)
    return () => clearTimeout(timer)
  }, [updating])
  function onReload() {
    setUpdating(true)
    void reloadToLatest().catch(() => setUpdating(false))
  }

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
        {!said && outdated && !updating && (
          <>
            {t.footer.updateAvailable} ·{' '}
            <button type="button" onClick={onReload} className="underline font-medium">
              {t.footer.reload}
            </button>
          </>
        )}
        {!said && outdated && updating && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 mt-1 font-medium" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
              <span className="update-spin" aria-hidden />
              {t.footer.updating}
            </span>
            <br />
            {t.footer.updatingNote}
          </>
        )}
      </p>
    </div>
  )
}
