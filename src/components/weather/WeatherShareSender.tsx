import { useEffect, useRef } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useTodayEntry } from '../../hooks/useEntries'
import { hasPain } from '../../lib/loggedEntries'
import { cardToPng } from '../../lib/cardImage'
import { onWeatherImageNow, readyWeatherShare, RETRY_AFTER_MS, sendWeatherImage, takeNowRequest, weatherImageKey } from '../../lib/weatherShareRuntime'
import { WeatherCard } from './WeatherCard'
import { useLook } from '../../lib/look'
import { useImageFlare } from '../../hooks/useImageFlare'
import { sharedFlareKey } from '../../lib/sharedFlare'

/** Quiet time after the last change of the day before the image is made and
 * sent: a day is often a few edits in a row. Short, so that closing the app
 * soon after filling the day rarely beats it; not shorter, since making the
 * image holds the page for about a second on a phone. */
const SETTLE_MS = 3_000

/**
 * Keeps the day's weather image at Dropbox up to date, when the person turned
 * it on: once the day changed and the changes settled, and right away when the
 * app goes to the background. Only while the app is open (a web app has
 * nothing to run in the background). The card is drawn off screen, only while
 * an image is due, since the image is captured from the page.
 */
export function WeatherShareSender() {
  const settings = useSettings()
  const entry = useTodayEntry()
  const share = settings.weatherShare
  const cardRef = useRef<HTMLDivElement>(null)
  const look = useLook()

  const logged = entry && hasPain(entry) ? entry : null
  // What the image says of a flare is part of what it is made from: a change there sends it again.
  const imageFlare = useImageFlare(logged?.date ?? '')
  const flareKey = sharedFlareKey(imageFlare?.flare ?? null, imageFlare?.note)
  const key = logged ? weatherImageKey(logged, { displayName: settings.displayName || undefined, language: settings.language, look, flare: flareKey }) : null
  // `permission` waits for the person to allow the link in the share sheet.
  // A share from before the encryption has no key yet: its image goes again (encrypted, with a new link) even if the day did not change.
  const due = !!share && !!key && (key !== share.sentKey || !share.key) && share.lastFailure !== 'permission'
  const triedAt = share?.triedAt
  const failed = !!share?.lastFailure

  useEffect(() => {
    if (!due || !key) return
    let timer: ReturnType<typeof setTimeout> | undefined
    // Once per image: leaving the app while it is being made or sent does not start it over.
    let started = false
    // The link to Dropbox renewed now if it is close to its end, not while the app leaves the screen.
    void readyWeatherShare()
    const send = () => {
      clearTimeout(timer)
      const node = cardRef.current
      if (!node || started) return
      started = true
      void cardToPng(node)
        .then((png) => sendWeatherImage(png, key))
        .catch(() => undefined)
    }
    const wait = failed && triedAt !== undefined ? Math.max(SETTLE_MS, RETRY_AFTER_MS - (Date.now() - triedAt)) : SETTLE_MS
    // Asked for now, or the day was saved as the app left the screen (the form saves at once then): no waiting.
    if (takeNowRequest() || (document.visibilityState === 'hidden' && !failed)) send()
    else timer = setTimeout(send, wait)
    const stopListening = onWeatherImageNow(() => {
      takeNowRequest()
      send()
    })
    // Leaving the app: the image goes now, or it would wait for the next opening.
    const onHide = () => {
      if (document.visibilityState === 'hidden' && !failed) send()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      clearTimeout(timer)
      stopListening()
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [due, key, failed, triedAt])

  if (!due || !logged) return null
  return (
    <div aria-hidden inert style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
      <WeatherCard ref={cardRef} entry={logged} displayName={settings.displayName || undefined} />
    </div>
  )
}
