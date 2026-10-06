import { updateSettings } from '../db'
import { getCurrentPosition, reverseGeocode } from './weather'

/** Asks the device for its position, looks up a town name and saves both, so the
 * settings page and the entry form show the same place. The name is best-effort:
 * the position is saved even when the lookup fails. */
export async function saveCurrentLocation(language: string): Promise<{ lat: number; lon: number }> {
  const { lat, lon } = await getCurrentPosition()
  const label = await reverseGeocode(lat, lon, language)
  await updateSettings({ autoWeatherEnabled: true, autoWeatherLat: lat, autoWeatherLon: lon, autoWeatherLabel: label })
  return { lat, lon }
}
