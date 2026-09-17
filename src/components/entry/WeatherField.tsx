import { useState } from 'react'
import type { ExternalWeatherCondition, WeatherInfo } from '../../db/types'
import { Chip } from '../ui/Chip'
import { fetchCurrentWeather, getCurrentPosition, WeatherError } from '../../lib/weather'
import { updateSettings } from '../../db'
import type { Settings } from '../../db/types'
import { useTranslation } from '../../i18n'

const CONDITIONS: ExternalWeatherCondition[] = ['ensoleille', 'variable', 'nuageux', 'pluvieux', 'orageux', 'neige']

export function WeatherField({
  value,
  onChange,
  settings,
}: {
  value: WeatherInfo | undefined
  onChange: (w: WeatherInfo) => void
  settings: Settings
}) {
  const t = useTranslation()
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
      setError(e instanceof WeatherError ? t.errors[e.code] : t.weatherField.unknownError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="font-medium text-[15px]">{t.weatherField.label}</label>
        <button
          type="button"
          onClick={handleAutoFetch}
          disabled={loading}
          className="text-[13px] font-semibold rounded-full px-3 py-1.5"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
        >
          {loading ? t.weatherField.fetching : t.weatherField.autoFill}
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
            label={t.weatherConditions[c]}
            selected={value?.condition === c}
            onClick={() => onChange({ ...value, source: value?.source === 'auto' && value.condition === c ? 'auto' : 'manual', condition: c })}
          />
        ))}
      </div>
    </div>
  )
}
