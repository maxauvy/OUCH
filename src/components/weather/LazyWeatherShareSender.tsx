import { lazy, Suspense } from 'react'
import { useSettings } from '../../hooks/useSettings'

// The sender of the day's image (and the weather card it captures) is fetched only for those who send it every day:
// without the setting it does nothing, so most people never load it. A « send now » asked before it is loaded is
// kept by lib/weatherShareRuntime.ts and taken when it starts.
const WeatherShareSender = lazy(() => import('./WeatherShareSender').then((m) => ({ default: m.WeatherShareSender })))

export function LazyWeatherShareSender() {
  const { weatherShare } = useSettings()
  if (!weatherShare) return null
  return (
    <Suspense fallback={null}>
      <WeatherShareSender />
    </Suspense>
  )
}
