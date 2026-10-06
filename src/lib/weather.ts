import type { WeatherInfo } from '../db/types'

// Open-Meteo: free, no API key, no account — fits a local-first app with no backend.
const WMO_TO_CONDITION: Record<number, WeatherInfo['condition']> = {
  0: 'ensoleille',
  1: 'ensoleille',
  2: 'variable',
  3: 'nuageux',
  45: 'nuageux',
  48: 'nuageux',
  51: 'pluvieux',
  53: 'pluvieux',
  55: 'pluvieux',
  61: 'pluvieux',
  63: 'pluvieux',
  65: 'pluvieux',
  71: 'neige',
  73: 'neige',
  75: 'neige',
  80: 'pluvieux',
  81: 'pluvieux',
  82: 'orageux',
  95: 'orageux',
  96: 'orageux',
  99: 'orageux',
}

export function conditionFromWmoCode(code: number): WeatherInfo['condition'] {
  return WMO_TO_CONDITION[code] ?? 'variable'
}

/** Thrown with a translation key (see `t.errors`) rather than a message, so
 * callers can display it in the active language. */
export class WeatherError extends Error {
  code: 'geolocationUnavailable' | 'weatherFetchFailed'
  constructor(code: 'geolocationUnavailable' | 'weatherFetchFailed') {
    super(code)
    this.code = code
  }
}

export async function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new WeatherError('geolocationUnavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60 * 60 * 1000 }
    )
  })
}

export interface FetchedWeather {
  tempC: number
  pressureHpa: number
  condition: WeatherInfo['condition']
}

// The forecast API only reaches ~92 days back; older days come from the archive API.
const FORECAST_PAST_DAYS_LIMIT = 90

/** Direct call to Open-Meteo from the browser — no server, no key, nothing to self-host.
 * Returns the day's max temperature, mean pressure and dominant condition for `date`
 * (YYYY-MM-DD, local to the location), so the value reflects the whole day rather than
 * the moment the button was pressed. */
export async function fetchDailyWeather(lat: number, lon: number, date: string): Promise<FetchedWeather> {
  const daysAgo = (Date.now() - new Date(date + 'T00:00:00').getTime()) / 86_400_000
  const base =
    daysAgo > FORECAST_PAST_DAYS_LIMIT
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast'
  const url = new URL(base)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('daily', 'temperature_2m_max,pressure_msl_mean,weather_code')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)

  const res = await fetch(url.toString())
  if (!res.ok) throw new WeatherError('weatherFetchFailed')
  const data = await res.json()
  const daily = data.daily
  const tempMax = daily?.temperature_2m_max?.[0]
  if (tempMax == null) throw new WeatherError('weatherFetchFailed')
  return {
    tempC: Math.round(tempMax),
    pressureHpa: Math.round(daily.pressure_msl_mean?.[0]),
    condition: conditionFromWmoCode(daily.weather_code?.[0]),
  }
}

/** Coordinates rounded to two decimals (about 1 km): enough to name a town, and
 * far less precise than the exact position that is kept on the device. */
function coarse(n: number): string {
  return n.toFixed(2)
}

/** Short "45.76, 4.84" form, for when no place name could be found. */
export function formatCoordinates(lat: number, lon: number): string {
  return `${coarse(lat)}, ${coarse(lon)}`
}

/** Reverse-geocode to a town name, purely cosmetic (shown in settings and in the
 * entry form). Uses Nominatim (OpenStreetMap): Open-Meteo has no reverse endpoint.
 * Only ~1 km precision leaves the device, and only when the person asks for
 * their position to be set. The browser sends the site's origin as Referer, which
 * is what Nominatim's usage policy asks apps to identify themselves with. */
export async function reverseGeocode(lat: number, lon: number, language = 'fr'): Promise<string | undefined> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', coarse(lat))
    url.searchParams.set('lon', coarse(lon))
    url.searchParams.set('zoom', '10')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('accept-language', language)
    const res = await fetch(url.toString())
    if (!res.ok) return undefined
    const a = (await res.json())?.address
    return a?.city ?? a?.town ?? a?.village ?? a?.municipality ?? a?.county ?? undefined
  } catch {
    return undefined
  }
}
