import { useEffect, useRef, useState } from 'react'

/** How long a sheet takes to go back down (ms): its exit animation in index.css. */
const SHEET_OUT_MS = 200

/**
 * Closing a sheet from inside it: it goes back down first (`closing`), then
 * `onClose` lets its parent remove it. A sheet its parent removes on its own
 * (after a save) leaves at once. With reduced motion, at once too.
 */
export function useSheetClose(onClose: () => void, busy = false): [boolean, () => void] {
  const [closing, setClosing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  function close() {
    if (busy || closing) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return onClose()
    setClosing(true)
    timer.current = setTimeout(onClose, SHEET_OUT_MS)
  }
  return [closing, close]
}
