import { useEffect, useState } from 'react'

/**
 * Whether an element has scrolled away above the screen: for what floats in to stand in for it (the way back, the period, the day).
 * Give the returned callback as the element's `ref`. The top band counts as out of sight: on an installed iPhone the status bar
 * and its blur cover it. Nothing floats in where the browser cannot tell (no IntersectionObserver).
 */
export function useScrolledAway(): [(el: Element | null) => void, boolean] {
  const [el, setEl] = useState<Element | null>(null)
  const [away, setAway] = useState(false)
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    const watch = new IntersectionObserver(([entry]) => setAway(!entry.isIntersecting && entry.boundingClientRect.top < 0), { rootMargin: '-56px 0px 0px 0px' })
    watch.observe(el)
    return () => watch.disconnect()
  }, [el])
  // A new element is read afresh by its observer, which reports at once.
  return [setEl, el !== null && away]
}
