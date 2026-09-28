import { useEffect, useId, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { IconX } from '@tabler/icons-react'
import type { DailyEntry } from '../../db/types'
import { computePainWeather } from '../../lib/painWeather'
import { painTrend, painTrendText, painWordIndex } from '../../lib/painTrend'
import { useAllEntries } from '../../hooks/useEntries'
import { HealthWeatherCard, WeatherCard } from './WeatherCard'
import { useDesign } from '../../hooks/useDesign'
import { downloadBlob } from '../../lib/backup'
import { format, useTranslation } from '../../i18n'

export function ShareSheet({ entry, displayName, onClose }: { entry: DailyEntry; displayName?: string; onClose: () => void }) {
  const t = useTranslation()
  const Card = useDesign() === 'health' ? HealthWeatherCard : WeatherCard
  const messageId = useId()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const weather = computePainWeather(entry)
  const trend = painTrend(entry, useAllEntries() ?? [])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const previewAreaRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<{ scale: number; width: number; height: number } | null>(null)

  // The card is rendered at its export size (the PNG is captured from it),
  // which is wider than a phone screen. The preview shrinks it to the sheet's
  // width with a transform on a wrapper: the captured node itself keeps its
  // full size, so the exported image is unchanged.
  useEffect(() => {
    const area = previewAreaRef.current
    const card = cardRef.current
    if (!area || !card) return
    const update = () => {
      const width = card.offsetWidth
      const height = card.offsetHeight
      // 2px for the preview's border
      setFit({ scale: Math.min(1, (area.clientWidth - 2) / width), width, height })
    }
    const observer = new ResizeObserver(update)
    observer.observe(area)
    observer.observe(card) // the height changes with the message
    return () => observer.disconnect()
  }, [])

  async function capture(): Promise<Blob> {
    if (!cardRef.current) throw new Error(t.shareSheet.cardNotFound)
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
        // Messaging apps don't carry an image description, so a short text
        // summary goes along for people who can't see the image.
        const title = displayName ? format(t.weatherCard.weatherOfName, { name: displayName }) : t.weatherCard.weatherOfDay
        const summary =
          format(t.weatherCard.shareSummary, {
            title,
            weather: t.painWeatherLevels[weather.level],
            painWord: t.weatherCard.painWords[painWordIndex(entry.painLevel)].toLocaleLowerCase(),
            pain: entry.painLevel,
          }) + (trend ? `, ${painTrendText(t, trend).toLocaleLowerCase()}.` : '.')
        await navigator.share({
          files: [file],
          title: t.shareSheet.nativeShareTitle,
          text: message ? `${summary} ${message}` : summary,
        })
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

  // A native modal <dialog> brings most of the accessibility for free:
  // announced as a dialog, the rest of the page made inert, and Escape
  // reported as a `cancel` event. Focus goes to the close button on open;
  // the parent unmounts the sheet instead of calling close(), so focus is
  // handed back to the button that opened it here. Page scrolling is locked
  // while it's open.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    // Otherwise Chrome may focus the scrollable sheet itself.
    closeRef.current?.focus()
    return () => {
      // Closing first lifts the page's inertness, so the opener can take
      // focus again (and StrictMode's remount captures the right opener).
      dialog.close()
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-0 p-0 w-full h-full max-w-none max-h-none bg-transparent backdrop:bg-transparent"
    >
      <div
        className="w-full h-full flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(20, 15, 35, 0.45)' }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
          style={{ background: 'var(--color-paper)' }}
        >
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="text-heading font-semibold">
              {t.shareSheet.title}
            </h2>
            <button
              ref={closeRef}
              onClick={onClose}
              className="w-11 h-11 -my-2 -mr-2 rounded-[var(--radius-control)] flex items-center justify-center"
              style={{ color: 'var(--color-ink-muted)' }}
              aria-label={t.shareSheet.close}
            >
              <IconX size={22} aria-hidden />
            </button>
          </div>

          {/* The card is read as one image with a summary, not line by line. */}
          <div ref={previewAreaRef} className="flex justify-center">
            <div
              role="img"
              aria-label={format(t.shareSheet.previewLabel, {
                weather: t.painWeatherLevels[weather.level],
                pain: entry.painLevel,
              })}
              className="rounded-2xl overflow-hidden shrink-0"
              style={{
                border: '1px solid var(--color-hairline)',
                width: fit ? fit.width * fit.scale + 2 : undefined,
                height: fit ? fit.height * fit.scale + 2 : undefined,
              }}
            >
              <div
                style={{ width: fit?.width, transform: fit ? `scale(${fit.scale})` : undefined, transformOrigin: 'top left' }}
              >
                <Card ref={cardRef} entry={entry} displayName={displayName} message={message || undefined} />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor={messageId} className="text-caption font-medium block mb-1.5">{t.shareSheet.messageLabel}</label>
            <input
              id={messageId}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.shareSheet.messagePlaceholder}
              maxLength={80}
              className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
              style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={busy}
              className="flex-1 rounded-[var(--radius-control)] py-3 text-body font-semibold"
              style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
            >
              {t.shareSheet.download}
            </button>
            <button
              onClick={handleShare}
              disabled={busy}
              className="flex-1 rounded-[var(--radius-control)] py-3 text-body font-semibold text-[var(--color-on-brand)]"
              style={{ background: 'var(--color-brand)' }}
            >
              {busy ? t.shareSheet.sending : t.shareSheet.send}
            </button>
          </div>
          <p className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
            {t.shareSheet.footer}
          </p>
        </div>
      </div>
    </dialog>
  )
}
