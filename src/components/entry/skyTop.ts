import { useEffect } from 'react'
import { useIsDark } from '../../hooks/useIsDark'
import { useSettings } from '../../hooks/useSettings'

/** `null`: leave it as it is. The phone paints the strip of the status bar with the page's theme colour: it takes the sky's first colour, so the sky starts at the very top of the screen. */
export function useSkyTop(level: number | null) {
  const dark = useIsDark(useSettings().theme)
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (level === null) return
    const top = SKY_TOP[dark ? 1 : 0][level]
    const root = document.documentElement.style
    const beforeMeta = meta?.getAttribute('content') ?? ''
    const beforeRoot = root.getPropertyValue('--status-top')
    // The installed app on iOS paints the status bar's strip with the page root's colour (see index.css); browsers that read theme-color take it from there.
    root.setProperty('--status-top', top)
    // After the app's own setting of theme-color, which runs once its children's effects are done.
    const timer = setTimeout(() => meta?.setAttribute('content', top), 0)
    return () => {
      clearTimeout(timer)
      meta?.setAttribute('content', beforeMeta)
      if (beforeRoot) root.setProperty('--status-top', beforeRoot)
      else root.removeProperty('--status-top')
    }
  }, [level, dark])
}

/** The first colour of each sky (index.css, `--sky-0` to `--sky-5`), light then dark: the colour of the status bar's strip above it. */
const SKY_TOP = [
  ['#e3e9f1', '#fbe2b4', '#f6e5c1', '#e2dee9', '#d4e0ec', '#ddd4ec'],
  ['#1e2733', '#4a3b1d', '#3d3421', '#34323f', '#22354b', '#2d2548'],
] as const
