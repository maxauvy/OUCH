// Whether this page load is the demo: a sandbox with ninety fictional days,
// kept in a database of its own so the person's journal is never touched.
// Decided once, at startup, from a flag in localStorage (so it survives a
// relaunch of the installed app) or from a `?demo` link; leaving the demo
// deletes the sandbox and the flag, and reloads. Kept free of imports so the
// database module can read it before it opens anything.

export type DemoLanguage = 'fr' | 'en'

/** localStorage: the demo's language while it is on. */
export const DEMO_KEY = 'ouch:demo'
/** localStorage: 'pending' until the guided tour has been seen or skipped. */
export const DEMO_TOUR_KEY = 'ouch:demo-tour'
export const DEMO_DB_NAME = 'ouch-demo'

export function parseDemoFlag(value: string | null): DemoLanguage | null {
  return value === 'fr' || value === 'en' ? value : null
}

/** The first language of the browser that the app speaks; French otherwise. */
export function languageFromBrowser(languages: readonly string[]): DemoLanguage {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0]
    if (base === 'fr' || base === 'en') return base
  }
  return 'fr'
}

/** The address without its `demo` parameter, or null when it has none. */
export function withoutDemoParam(href: string): string | null {
  const url = new URL(href)
  if (!url.searchParams.has('demo')) return null
  url.searchParams.delete('demo')
  return url.pathname + url.search + url.hash
}

function readAtStart(): DemoLanguage | null {
  if (typeof window === 'undefined') return null
  try {
    const clean = withoutDemoParam(location.href)
    if (clean !== null) {
      // The link starts the demo once; the address is cleaned so that a
      // reload, or leaving the demo, does not start it again.
      const language = languageFromBrowser(navigator.languages?.length ? navigator.languages : [navigator.language])
      localStorage.setItem(DEMO_KEY, language)
      localStorage.setItem(DEMO_TOUR_KEY, 'pending')
      history.replaceState(null, '', clean)
      return language
    }
    return parseDemoFlag(localStorage.getItem(DEMO_KEY))
  } catch {
    return null
  }
}

/** The demo's language when this page load is the demo, else null. */
export const DEMO_LANGUAGE: DemoLanguage | null = readAtStart()

export const IS_DEMO = DEMO_LANGUAGE !== null
