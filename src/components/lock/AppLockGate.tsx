import { useEffect, type ReactNode } from 'react'
import { useSettings, useSettingsLoaded } from '../../hooks/useSettings'
import { syncLockLanguage, useLockState } from '../../lib/appLock'
import { LockScreen } from './LockScreen'

/**
 * Puts the lock in front of the app. The app behind stays mounted (what was
 * being typed, the tab, the background backup are all still there when the code
 * is right) but cannot be seen, reached by keyboard, or read by a screen reader.
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { locked } = useLockState()
  const { language } = useSettings()
  const loaded = useSettingsLoaded()
  // The lock keeps the language the app is in (read at the next start, before the settings).
  useEffect(() => {
    if (loaded) syncLockLanguage(language)
  }, [loaded, language])
  return (
    <>
      {/* `contents`: no box of its own, so the app's layout is not touched. */}
      <div inert={locked} aria-hidden={locked || undefined} style={{ display: 'contents', visibility: locked ? 'hidden' : undefined }}>
        {children}
      </div>
      {locked && <LockScreen />}
    </>
  )
}
