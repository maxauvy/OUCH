import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** A4 width in CSS pixels (210 mm at 96 dpi): the preview is scaled from it. */
const PAGE_WIDTH = 794

/** Shrinks the A4 pages to the screen's width, keeping their layout intact. */
export function ScaledPreview({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ scale: 1, height: 0 })

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const update = () => {
      const scale = Math.min(1, outer.clientWidth / PAGE_WIDTH)
      setBox({ scale, height: inner.offsetHeight * scale })
    }
    const observer = new ResizeObserver(update)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={outerRef} style={{ height: box.height || undefined, overflow: 'hidden' }}>
      <div ref={innerRef} style={{ width: PAGE_WIDTH, transform: `scale(${box.scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}
