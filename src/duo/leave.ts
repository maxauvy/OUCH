import { useEffect, useRef, useState } from 'react'

/** How long a sheet takes to go back down (ms): its exit animation in duo.css. */
const LEAVE_MS = 200

/**
 * Leaving softly: `leaving` turns on (the sheet goes back down), then `done`
 * runs. At once with reduced motion, which Duo's CSS keeps still anyway.
 */
export function useLeave(done: () => void): [boolean, () => void] {
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  function leave() {
    if (leaving) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return done()
    setLeaving(true)
    timer.current = setTimeout(done, LEAVE_MS)
  }
  return [leaving, leave]
}
