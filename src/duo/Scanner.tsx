import { Brand } from './Brand'
import { useEffect, useRef, useState } from 'react'
import { readDuoInput, type DuoTarget } from '../lib/duoLink'
import { strings as t } from './strings'

interface Detector {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
}
type DetectorClass = new (options: { formats: string[] }) => Detector

/** Reads one frame: the phone's own QR reader when it has one (Android), jsQR otherwise (iPhone). */
async function makeReader(): Promise<(video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>> {
  const Native = (window as unknown as { BarcodeDetector?: DetectorClass & { getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector
  if (Native) {
    try {
      const formats = (await Native.getSupportedFormats?.()) ?? ['qr_code']
      if (formats.includes('qr_code')) {
        const detector = new Native({ formats: ['qr_code'] })
        return async (video) => (await detector.detect(video))[0]?.rawValue ?? null
      }
    } catch {
      // Falls back to jsQR below.
    }
  }
  const { default: jsQR } = await import('jsqr')
  return async (video, canvas) => {
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight))
    const w = Math.round(video.videoWidth * scale)
    const h = Math.round(video.videoHeight * scale)
    if (!w || !h) return null
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    return jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
}

/** The camera, until a code from OUCH is read. A code from anywhere else is said so, and scanning goes on. */
export function Scanner({ onFound, onCancel, onPaste }: { onFound: (target: DuoTarget) => void; onCancel: () => void; onPaste: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [refused, setRefused] = useState(false)
  const found = useRef(onFound)
  useEffect(() => {
    found.current = onFound
  }, [onFound])

  useEffect(() => {
    let stream: MediaStream | null = null
    let stopped = false
    let timer = 0

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch {
        if (!stopped) setRefused(true)
        return
      }
      const video = videoRef.current
      if (stopped || !video) return
      video.srcObject = stream
      await video.play().catch(() => {})
      const read = await makeReader()
      const tick = async () => {
        if (stopped) return
        const canvas = canvasRef.current
        if (video.readyState >= 2 && canvas) {
          const value = await read(video, canvas).catch(() => null)
          if (stopped) return
          if (value) {
            const target = readDuoInput(value)
            if (target) {
              found.current(target)
              return
            }
            setProblem(t.pasteWrong)
          }
        }
        timer = window.setTimeout(() => void tick(), 200)
      }
      void tick()
    }
    void start()
    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return (
    <div className="stack grow">
      <Brand />
      <h1 className="title">{t.welcomeTitle}</h1>
      {refused ? (
        <p className="card text">{t.cameraRefused}</p>
      ) : (
        <div className="viewfinder">
          <video ref={videoRef} muted playsInline aria-hidden="true" />
          <div className="frame" aria-hidden="true" />
          <p role="status">{problem ?? t.scanHint}</p>
        </div>
      )}
      <canvas ref={canvasRef} hidden />
      <div className="stack">
        <button type="button" className="btn soft" onClick={onPaste}>
          {t.paste}
        </button>
        <button type="button" className="link-btn center" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </div>
  )
}
