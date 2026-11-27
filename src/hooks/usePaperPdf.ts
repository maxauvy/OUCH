import { useEffect, useRef, useState } from 'react'
import { buildImagePdf } from '../lib/pdf'
import { capturePages } from '../lib/capturePages'
import { sharePdf } from '../lib/sharePdf'

/**
 * A PDF made from a copy of the paper sheet laid out out of sight, only while it is being made:
 * render the copy with `captureRef` while `capturing`, and call `start` from the button.
 * `title` ("title date") is the PDF's title and the page's while it is open; `fileName` the file's name.
 */
export function usePaperPdf(title: string, fileName: string, shareTitle: string) {
  const captureRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [failed, setFailed] = useState(false)

  // Browsers name the PDF saved from the print dialog after the page title.
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])

  useEffect(() => {
    if (!capturing) return
    let live = true
    void (async () => {
      try {
        await document.fonts?.ready
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
        if (!captureRef.current) return
        const blob = buildImagePdf(await capturePages(captureRef.current), title)
        await sharePdf(blob, fileName, shareTitle)
      } catch (e) {
        console.error(e)
        if (live) setFailed(true)
      } finally {
        if (live) setCapturing(false)
      }
    })()
    return () => {
      live = false
    }
  }, [capturing, title, fileName, shareTitle])

  const start = () => {
    setFailed(false)
    setCapturing(true)
  }
  return { captureRef, capturing, failed, start }
}
