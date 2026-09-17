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

/** Direct call to Open-Meteo from the browser — no server, no key, nothing to self-host. */
export async function fetchCurrentWeather(lat: number, lon: number): Promise<FetchedWeather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('current', 'temperature_2m,pressure_msl,weather_code')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString())
  if (!res.ok) throw new WeatherError('weatherFetchFailed')
  const data = await res.json()
  const current = data.current
  return {
    tempC: Math.round(current.temperature_2m),
    pressureHpa: Math.round(current.pressure_msl),
    condition: conditionFromWmoCode(current.weather_code),
  }
}

/** Reverse-geocode to a short place label, purely cosmetic (shown in settings). */
export async function reverseGeocode(lat: number, lon: number, language = 'fr'): Promise<string | undefined> {
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse')
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lon))
    url.searchParams.set('language', language)
    const res = await fetch(url.toString())
    if (!res.ok) return undefined
    const data = await res.json()
    return data?.results?.[0]?.name
  } catch {
    return undefined
  }
}
