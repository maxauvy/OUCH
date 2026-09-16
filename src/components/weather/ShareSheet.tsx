import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import type { DailyEntry } from '../../db/types'
import { WeatherCard } from './WeatherCard'
import { downloadBlob } from '../../lib/backup'

export function ShareSheet({ entry, displayName, onClose }: { entry: DailyEntry; displayName?: string; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  async function capture(): Promise<Blob> {
    if (!cardRef.current) throw new Error('Carte introuvable')
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
    const res = await fetch(dataUrl)
    return res.blob()
  }

  async function handleShare() {
    setBusy(true)
    try {
      const blob = await capture()
      const file = new File([blob], `meteo-${entry.date}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Météo du jour' })
      } else {
        downloadBlob(blob, file.name)
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        console.error(e)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload() {
    setBusy(true)
    try {
      const blob = await capture()
      downloadBlob(blob, `meteo-${entry.date}.png`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20, 15, 35, 0.45)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--color-paper)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Partager ma météo</h2>
          <button onClick={onClose} className="text-[20px] leading-none px-2" aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden self-center" style={{ border: '1px solid var(--color-hairline)' }}>
          <WeatherCard ref={cardRef} entry={entry} displayName={displayName} message={message || undefined} />
        </div>

        <div>
          <label className="text-[13px] font-medium block mb-1.5">Un mot pour tes proches (optionnel)</label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex : journée calme, merci d'être là"
            maxLength={80}
            className="w-full rounded-xl px-3.5 py-2.5 text-[15px] outline-none"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-ink)' }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={busy}
            className="flex-1 rounded-full py-3 text-[15px] font-semibold"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          >
            Télécharger
          </button>
          <button
            onClick={handleShare}
            disabled={busy}
            className="flex-1 rounded-full py-3 text-[15px] font-semibold text-white"
            style={{ background: 'var(--color-brand)' }}
          >
            {busy ? '…' : 'Envoyer'}
          </button>
        </div>
        <p className="text-[12px] text-center" style={{ color: 'var(--color-ink-muted)' }}>
          Rien n'est envoyé automatiquement : tu choisis toi-même à qui et quand l'envoyer.
        </p>
      </div>
    </div>
  )
}
