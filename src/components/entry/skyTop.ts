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
    // (Painting the page root with the sky's colour, #327, did not change the
    // strip of the installed app on iPhone and made the screen flash white at
    // each change of tab: the root's background was redrawn with the page's height.)
    const timer = setTimeout(() => meta.setAttribute('content', SKY_TOP[dark ? 1 : 0][level]), 0)
    return () => {
      clearTimeout(timer)
      meta.setAttribute('content', before)
    }
  }, [level, dark])
}

/** The first colour of each sky (index.css, `--sky-0` to `--sky-5`), light then dark: the colour of the status bar's strip above it. */
const SKY_TOP = [
  ['#ffe3d1', '#fbe2b4', '#f6e5c1', '#e2dee9', '#d4e0ec', '#ddd4ec'],
  ['#33243a', '#4a3b1d', '#3d3421', '#34323f', '#22354b', '#2d2548'],
] as const

/** How far below the status bar's strip a sky reaches its own colour (px). */
const RISE = 60

/**
 * A sky as a CSS background that starts with the page's paper and takes its
 * own colour a little lower. On iPhone the installed app paints the status
 * bar's strip itself, in a fixed light colour (the paper) that the page cannot
 * change: a sky that started at its strongest colour right under it made a
 * band. `height` is the sky's own height (a CSS length); the layer it is drawn
 * on can be taller.
 */
export function risingSky(level: number, height = '100%'): string {
  const strip = 'env(safe-area-inset-top, 0px)'
  const fade = `linear-gradient(180deg, var(--color-paper) 0, var(--color-paper) ${strip}, transparent calc(${strip} + ${RISE}px)) 0 0 / 100% 100% no-repeat`
  const sky = `var(--sky-${level}) 0 ${strip} / 100% calc(${height} - ${strip}) no-repeat`
  return `${fade}, ${sky}`
}
