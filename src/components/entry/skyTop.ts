import { useEffect } from 'react'
import { useIsDark } from '../../hooks/useIsDark'
import { useSettings } from '../../hooks/useSettings'

/** `null`: leave it as it is. The phone paints the strip of the status bar with the page's theme colour: it takes the sky's first colour, so the sky starts at the very top of the screen. */
export function useSkyTop(level: number | null) {
  const dark = useIsDark(useSettings().theme)
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta || level === null) return
    const before = meta.getAttribute('content') ?? ''
    // After the app's own setting of it, which runs once its children's effects are done.
    const timer = setTimeout(() => meta.setAttribute('content', SKY_TOP[dark ? 1 : 0][level]), 0)
    return () => {
      clearTimeout(timer)
      meta.setAttribute('content', before)
    }
  }, [level, dark])
}

/** The first colour of each sky (index.css, `--sky-0` to `--sky-5`), light then dark: the colour of the status bar's strip above it. */
const SKY_TOP = [
  ['#e3e9f1', '#fbe2b4', '#f6e5c1', '#e2dee9', '#d4e0ec', '#ddd4ec'],
  ['#1e2733', '#4a3b1d', '#3d3421', '#34323f', '#22354b', '#2d2548'],
] as const
