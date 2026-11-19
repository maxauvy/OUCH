import { useMemo } from 'react'
import { encode } from 'uqr'

/**
 * The QR code a relative scans to follow the weather in OUCH Duo. Always dark
 * on white, whatever the theme: phone cameras read that best.
 */
export function DuoCode({ url, label }: { url: string; label: string }) {
  const { size, cells } = useMemo(() => {
    const { size, data } = encode(url, { ecc: 'M', border: 0 })
    const cells: string[] = []
    data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) cells.push(`M${x} ${y}h1v1h-1z`)
      }),
    )
    return { size, cells: cells.join('') }
  }, [url])

  return (
    <div className="self-center rounded-2xl p-4" style={{ background: '#ffffff', width: 'min(240px, 100%)' }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges" style={{ display: 'block', width: '100%', height: 'auto' }}>
        <path d={cells} fill="#1d2433" />
      </svg>
    </div>
  )
}
