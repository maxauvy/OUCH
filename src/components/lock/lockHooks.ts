import { useEffect, useState } from 'react'
import { lockWaitMs } from '../../lib/appLock'
import { format, useLanguage, useTranslation } from '../../i18n'

/** "On fait une pause. Réessaie dans 30 secondes.": how long a pause has left, in words. */
export function useWaitText(): (waitMs: number) => string {
  const t = useTranslation().lock
  const language = useLanguage()
  return (waitMs) =>
    waitMs >= 60_000
      ? format(t.waitMinutes, { n: Math.ceil(waitMs / 60_000) }, language)
      : format(t.waitSeconds, { n: Math.max(1, Math.ceil(waitMs / 1000)) }, language)
}

/** The pause after too many wrong codes: milliseconds left, counting down by itself. */
export function usePause(): { waitMs: number; set: (ms: number) => void } {
  const [waitMs, setWaitMs] = useState(() => lockWaitMs())
  const pausing = waitMs > 0
  useEffect(() => {
    if (!pausing) return
    const timer = setInterval(() => setWaitMs(lockWaitMs()), 500)
    return () => clearInterval(timer)
  }, [pausing])
  return { waitMs, set: setWaitMs }
}
