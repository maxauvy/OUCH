import type { PropsWithChildren } from 'react'
import type { Language } from './language'
import { I18nContext } from './context'

// Kept alone in its file so Vite's fast refresh can hot-reload it (a .tsx
// file mixing components with hooks and helpers falls back to a full reload).
export function I18nProvider({ language, children }: PropsWithChildren<{ language: Language }>) {
  return <I18nContext.Provider value={language}>{children}</I18nContext.Provider>
}
