import { useState } from 'react'
import type { ExternalWeatherCondition, WeatherInfo } from '../../db/types'
import { EXTERNAL_WEATHER_LABELS } from '../../db/types'
import { Chip } from '../ui/Chip'
import { fetchCurrentWeather, getCurrentPosition } from '../../lib/weather'
import { updateSettings } from '../../db'
import type { Settings } from '../../db/types'

const CONDITIONS = Object.keys(EXTERNAL_WEATHER_LABELS) as ExternalWeatherCondition[]

export function WeatherField({
  value,
  onChange,
  settings,
}: {
  value: WeatherInfo | undefined
  onChange: (w: WeatherInfo) => void
  settings: Settings
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAutoFetch() {
    setLoading(true)
    setError(null)
    try {
      let lat = settings.autoWeatherLat
      let lon = settings.autoWeatherLon
      if (lat === undefined || lon === undefined) {
        const pos = await getCurrentPosition()
        lat = pos.lat
        lon = pos.lon
        await updateSettings({ autoWeatherLat: lat, autoWeatherLon: lon, autoWeatherEnabled: true })
      }
      const w = await fetchCurrentWeather(lat, lon)
      onChange({ source: 'auto', condition: w.condition, tempC: w.tempC, pressureHpa: w.pressureHpa })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="font-medium text-[15px]">Météo extérieure</label>
        <button
          type="button"
          onClick={handleAutoFetch}
          disabled={loading}
          className="text-[13px] font-semibold rounded-full px-3 py-1.5"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
        >
          {loading ? 'Récupération…' : '📍 Remplir automatiquement'}
        </button>
      </div>
      {error && (
        <p className="text-[13px] mb-2" style={{ color: 'var(--color-weather-5)' }}>
          {error}
        </p>
      )}
      {value?.source === 'auto' && (
        <p className="text-[13px] mb-2" style={{ color: 'var(--color-ink-muted)' }}>
          {value.tempC}°C · {value.pressureHpa} hPa
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {CONDITIONS.map((c) => (
          <Chip
            key={c}
            label={EXTERNAL_WEATHER_LABELS[c]}
            selected={value?.condition === c}
            onClick={() => onChange({ ...value, source: value?.source === 'auto' && value.condition === c ? 'auto' : 'manual', condition: c })}
          />
        ))}
      </div>
    </div>
  )
}
