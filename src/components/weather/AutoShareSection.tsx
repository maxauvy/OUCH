import { useId, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Toggle } from '../ui/Toggle'
import { format, useLocale, useTranslation } from '../../i18n'
import { todayISO } from '../../lib/dates'
import { duoBase } from '../../lib/duoBase'
import { duoUrl } from '../../lib/duoLink'
import { DuoCode } from './DuoCode'
import { IconChevronRight } from '@tabler/icons-react'
import { useOpenBackup } from '../settings/backupContext'
import { IS_DEMO } from '../../lib/demoMode'
import { askWeatherSharePermission, nextSendResult, turnOffWeatherShare, turnOnWeatherShare, type WeatherShareNotice } from '../../lib/weatherShareRuntime'

const mutedText = { color: 'var(--color-ink-muted)' }

/**
 * In the share sheet: the day's image kept at Dropbox for a relative, at a
 * link that stays the same. Offered only to people whose backup goes to
 * Dropbox (it uses the same link to Dropbox). Before it is on, it says what
 * turning it on means; once on, how the last image went and the link to send.
 */
export function AutoShareSection({ notice }: { notice: WeatherShareNotice | null }) {
  const t = useTranslation().shareSheet.auto
  const { intlLocale } = useLocale()
  const settings = useSettings()
  const share = settings.weatherShare
  const factsId = useId()
  const [asking, setAsking] = useState(false)
  const [activating, setActivating] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [say, setSay] = useState<string | null>(notice ? { ready: t.ready, denied: t.denied, failed: t.returnFailed }[notice] : null)

  const openBackup = useOpenBackup()

  // Without the Dropbox backup the daily image cannot go out: the same section says so, and leads to the backup (not in the demo, which has none).
  if (settings.autoBackup?.provider !== 'dropbox') {
    if (IS_DEMO || !openBackup) return null
    return (
      <section className="flex flex-col gap-1 pt-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
        <p className="text-body font-semibold">{t.title}</p>
        <p className="text-caption" style={mutedText}>
          {t.needsBackup}
        </p>
        <button
          type="button"
          onClick={openBackup}
          className="self-start min-h-11 -mb-1.5 flex items-center gap-1 text-control font-semibold"
          style={{ color: 'var(--color-brand)' }}
        >
          {t.setUpBackup}
          <IconChevronRight size={18} stroke={2.2} aria-hidden />
        </button>
      </section>
    )
  }

  async function turnOn() {
    setSay(null)
    setActivating(true)
    setAsking(false)
    const result = nextSendResult()
    await turnOnWeatherShare()
    // Dropbox has not allowed the link yet: off to Dropbox, as the person asked.
    if ((await result) === 'permission') {
      setLeaving(true)
      await askWeatherSharePermission()
    }
    setActivating(false)
  }

  async function turnOff() {
    setSay(null)
    const result = await turnOffWeatherShare()
    if (result !== 'off') setSay(t.stopFailed)
  }

  // What a relative receives: OUCH Duo's address, with the image's link and the first name after # (see lib/duoLink.ts).
  const relativeUrl = share?.link && share.key ? duoUrl(duoBase(), { link: share.link, key: share.key, name: settings.displayName }) : null

  async function sendLink() {
    if (!relativeUrl) return
    try {
      if (navigator.share) {
        await navigator.share({ text: t.linkShareText, url: relativeUrl })
        return
      }
      await navigator.clipboard.writeText(relativeUrl)
      setSay(t.linkCopied)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setSay(relativeUrl)
    }
  }

  const on = !!share
  let status: string | null = null
  if (leaving) status = t.going
  else if (share) {
    if (share.lastFailure === 'permission') status = t.permission
    else if (share.lastFailure === 'auth') status = t.auth
    else if (share.lastFailure) status = t.failed
    else if (activating) status = t.sending
    else if (share.sentAt !== undefined && todayISO(new Date(share.sentAt)) === todayISO())
      status = format(t.sentToday, { time: new Date(share.sentAt).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' }) })
    else status = t.sentBefore
  }

  return (
    <section className="flex flex-col gap-2.5 pt-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-semibold">{t.title}</p>
          <p className="text-caption" style={mutedText} id={factsId}>
            {on ? t.offNote : t.hintOff}
          </p>
        </div>
        <Toggle
          checked={on || asking}
          label={t.title}
          onChange={(v) => {
            setSay(null)
            if (v) setAsking(true)
            else if (on) void turnOff()
            else setAsking(false)
          }}
        />
      </div>

      {asking && !on && (
        <div className="flex flex-col gap-2.5">
          <ul className="flex flex-col gap-1.5 text-caption list-disc pl-5">
            {t.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setAsking(false)}>
              {t.cancel}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => void turnOn()}>
              {t.turnOn}
            </button>
          </div>
        </div>
      )}

      {(status || say) && (
        <div role="status" className="flex flex-col gap-1">
          {status && <p className="text-caption">{status}</p>}
          {say && (
            <p className="text-caption break-all select-text" style={mutedText}>
              {say}
            </p>
          )}
        </div>
      )}

      {on && share.lastFailure === 'permission' && !leaving && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setLeaving(true)
            void askWeatherSharePermission()
          }}
        >
          {t.allow}
        </button>
      )}
      {on && relativeUrl && (
        <>
          {showCode && (
            <div className="flex flex-col gap-2">
              <DuoCode url={relativeUrl} label={t.codeAlt} />
              <p className="text-caption" style={mutedText}>
                {t.codeHint}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" aria-expanded={showCode} onClick={() => setShowCode((v) => !v)}>
              {showCode ? t.hideCode : t.showCode}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => void sendLink()}>
              {t.sendLink}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
