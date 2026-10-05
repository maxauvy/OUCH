import { useCallback, useEffect, useState } from 'react'
import { isStorageProtected, requestStorageProtection, type StorageProtection } from '../lib/storage'

/** Whether the browser promises to keep the data, and a way to ask again.
 * `undefined` until the browser has answered. */
export function useStorageProtection() {
  const [protection, setProtection] = useState<StorageProtection | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void isStorageProtected().then((value) => {
      if (!cancelled) setProtection(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // From a tap, so that Firefox may show its permission prompt.
  const request = useCallback(async () => {
    const value = await requestStorageProtection()
    setProtection(value)
    return value
  }, [])

  return { protection, request }
}
