import { lazy, Suspense, type ComponentProps } from 'react'

// The sheet and the image capture behind it are fetched when someone shares a day.
const ShareSheet = lazy(() => import('./ShareSheet').then((m) => ({ default: m.ShareSheet })))

export function LazyShareSheet(props: ComponentProps<typeof ShareSheet>) {
  return (
    <Suspense fallback={null}>
      <ShareSheet {...props} />
    </Suspense>
  )
}
