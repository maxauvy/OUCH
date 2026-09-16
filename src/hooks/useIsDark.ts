import { useEffect, useState } from 'react'
import type { ThemePref } from '../db/types'

/** Resolves 'system' | 'light' | 'dark' to an actual boolean, tracking the
 * OS setting live for 'system' so charts (which can't rely on CSS
 * prefers-color-scheme) stay in sync without a reload. */
export function useIsDark(themePref: ThemePref): boolean {
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (themePref === 'light') return false
  if (themePref === 'dark') return true
  return systemDark
}
