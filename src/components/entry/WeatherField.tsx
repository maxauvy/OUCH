import { useId, useState } from 'react'
import type { ExternalWeatherCondition, WeatherInfo } from '../../db/types'
import { Chip } from '../ui/Chip'
import { fetchDailyWeather, formatCoordinates, WeatherError } from '../../lib/weather'
import { saveCurrentLocation } from '../../lib/weatherLocation'
import type { Settings } from '../../db/types'
import { useTranslation } from '../../i18n'
import { IconMapPin } from '@tabler/icons-react'

const CONDITIONS: ExternalWeatherCondition[] = ['ensoleille', 'variable', 'nuageux', 'pluvieux', 'orageux', 'neige']

export function WeatherField({
  date,
  value,
  onChange,
  settings,
}: {
  date: string
  value: WeatherInfo | undefined
  onChange: (w: WeatherInfo) => void
  settings: Settings
}) {
  const t = useTranslation()
  const tempId = useId()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleManualTemp(raw: string) {
    const tempC = raw === '' ? undefined : Number(raw)
    onChange({ ...value, source: 'manual', tempC: tempC === undefined || Number.isNaN(tempC) ? undefined : tempC })
  }

  async function handleAutoFetch() {
    setLoading(true)
    setError(null)
    try {
      let lat = settings.autoWeatherLat
      let lon = settings.autoWeatherLon
      if (lat === undefined || lon === undefined) {
        ;({ lat, lon } = await saveCurrentLocation(settings.language))
      }
      const w = await fetchDailyWeather(lat, lon, date)
      onChange({ source: 'auto', condition: w.condition, tempC: w.tempC, pressureHpa: w.pressureHpa })
    } catch (e) {
      setError(e instanceof WeatherError ? t.errors[e.code] : t.weatherField.unknownError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-medium text-body">{t.weatherField.label}</span>
        <button
          type="button"
          onClick={handleAutoFetch}
          disabled={loading}
          className="text-caption font-semibold rounded-[var(--radius-control)] px-3 py-1.5 inline-flex items-center gap-1"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
        >
          {!loading && <IconMapPin size={15} aria-hidden />}
          {loading ? t.weatherField.fetching : t.weatherField.autoFill}
        </button>
      </div>
      {settings.autoWeatherLat !== undefined && settings.autoWeatherLon !== undefined && (
        <p className="text-caption mb-2" style={{ color: 'var(--color-ink-muted)' }}>
          {settings.autoWeatherLabel ?? formatCoordinates(settings.autoWeatherLat, settings.autoWeatherLon)}
        </p>
      )}
      {error && (
        <p className="text-caption mb-2" style={{ color: 'var(--color-weather-5-text)' }}>
          {error}
        </p>
      )}
      {value?.source === 'auto' && value.pressureHpa != null && (
        <p className="text-caption mb-2" style={{ color: 'var(--color-ink-muted)' }}>
          {value.pressureHpa} hPa
        </p>
      )}
      <div className="flex items-center gap-2 mb-3">
        <label htmlFor={tempId} className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {t.weatherField.temperatureLabel}
        </label>
        <input
          id={tempId}
          type="number"
          inputMode="numeric"
          value={value?.tempC ?? ''}
          onChange={(e) => handleManualTemp(e.target.value)}
          placeholder={t.weatherField.temperaturePlaceholder}
          className="w-[5.5em] rounded-xl px-3 py-1.5 text-control outline-none"
          style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
        />
      </div>
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
