import { useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCloud } from '@tabler/icons-react'
import type { PainWeather } from '../../db/types'
import { risingSky, useSkyTop } from './skyTop'
import { format, useTranslation } from '../../i18n'
import { WeatherIcon } from '../ui/WeatherIcon'
import { useRichLook } from '../../lib/look'

/**
 * The sky of the day, behind the top of today's page in the weather look: it
 * takes the colour of the day's pain weather, and a neutral sky until the pain
 * is noted. A layer behind the page (the cards slide over its lower part), so
 * it stays at the top whatever card comes first. It runs under the status bar
 * and fades out into the page. Pale even for a storm: it shows the day, it
 * does not alarm. When the pain changes, the new sky comes in over the old one
 * (a gradient cannot be transitioned in CSS): a fade of 700 ms, then the old
 * layer is dropped.
 */
export function TodaySkyBackdrop({ weather, height = 360 }: { weather: PainWeather | null; height?: number }) {
  const level = weather?.level ?? 0
  useSkyTop(level)
  const [layers, settle] = useSkyLayers(level)
  // Drawn at the top of the document, behind everything (not inside the page, where a link above it, like Settings' way back, would end up under it).
  return createPortal(
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 -z-10 pointer-events-none"
      style={{ height: `calc(var(--root-pad-top, 0px) + ${height}px)` }}
    >
      {layers.map((layer, i) => (
        <div
          key={layer.id}
          className={`absolute inset-0${i > 0 ? ' sky-fade-in' : ''}`}
          style={{ background: risingSky(layer.level) }}
          onAnimationEnd={i > 0 && i === layers.length - 1 ? () => settle(layer.id) : undefined}
        />
      ))}
    </div>,
    document.body,
  )
}

type SkyLayer = { id: number; level: number }

/** The skies on screen, oldest first: one at rest; while a change fades in, the newer ones above. A layer that has finished coming in drops those under it. */
function useSkyLayers(level: number): [SkyLayer[], (id: number) => void] {
  const [layers, setLayers] = useState<SkyLayer[]>(() => [{ id: 0, level }])
  const top = layers[layers.length - 1]
  // A new level: a new layer on top, set during render so the old sky never shows the new colour. Three at most when the pain changes fast.
  if (top.level !== level) setLayers([...layers.slice(-2), { id: top.id + 1, level }])
  const settle = (id: number) =>
    setLayers((current) => {
      const i = current.findIndex((l) => l.id === id)
      return i > 0 ? current.slice(i) : current
    })
  return [layers, settle]
}

/** Under the title: the day's weather, large, and the pain it comes from; before anything is noted, the question of the day. */
export function TodaySkyLine({ weather, painLevel }: { weather: PainWeather | null; painLevel: number | undefined }) {
  const t = useTranslation()
  // Once the weather has changed on this page, a new weather fades in; not when the page opens.
  const level = weather?.level ?? 0
  const [shown, setShown] = useState(level)
  const [changed, setChanged] = useState(false)
  if (shown !== level) {
    setShown(level)
    setChanged(true)
  }
  return (
    <div key={level} className={`flex items-center gap-3.5 px-1 pt-1 pb-2${changed ? ' sky-line-in' : ''}`}>
      <span className="shrink-0 flex" style={{ color: weather?.text ?? 'var(--color-ink-muted)' }} aria-hidden>
        {weather ? (
          <span className="weather-sway flex">
            <WeatherIcon name={weather.icon as never} size={72} className={weather.icon === 'sun' ? 'weather-turn' : undefined} />
          </span>
        ) : (
          <IconCloud size={64} stroke={1.3} />
        )}
      </span>
      <div className="min-w-0">
        <p className="sky-title text-display font-bold leading-tight">{weather ? t.painWeatherLevels[weather.level] : t.entryForm.skyEmpty}</p>
        {weather && painLevel !== undefined && (
          <p className="text-control mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
            {format(t.entryForm.skyPain, { n: painLevel })}
          </p>
        )}
      </div>
    </div>
  )
}

/** The neutral sky behind the top of the other tabs, in the weather look: the same as today's before anything is noted, shorter. The page's wrapper must be `relative isolate`. */
export function PageSky() {
  return useRichLook() ? <TodaySkyBackdrop weather={null} height={240} /> : null
}
