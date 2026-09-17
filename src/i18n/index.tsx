import { createContext, useContext, type PropsWithChildren } from 'react'
import { fr as dateFnsFr, enUS as dateFnsEnUS, type Locale as DateFnsLocale } from 'date-fns/locale'
import type { Translations } from './types'
import type { Language } from './language'
import fr from './locales/fr'
import en from './locales/en'

export type { Language } from './language'
export { LANGUAGES, DEFAULT_LANGUAGE } from './language'
export { format } from './format'
export type { Translations } from './types'

const DICTIONARIES: Record<Language, Translations> = { fr, en }

const DATE_FNS_LOCALES: Record<Language, DateFnsLocale> = { fr: dateFnsFr, en: dateFnsEnUS }
const INTL_LOCALES: Record<Language, string> = { fr: 'fr-FR', en: 'en-US' }

const I18nContext = createContext<Language>('fr')

export function I18nProvider({ language, children }: PropsWithChildren<{ language: Language }>) {
  return <I18nContext.Provider value={language}>{children}</I18nContext.Provider>
}

export function useLanguage(): Language {
  return useContext(I18nContext)
}

export function useTranslation(): Translations {
  return getTranslations(useLanguage())
}

/** For the rare non-component call site (e.g. a browser Notification built
 * outside React) that needs a translation without a hook. */
export function getTranslations(language: Language): Translations {
  return DICTIONARIES[language] ?? DICTIONARIES.fr
}

export function useLocale(): { language: Language; dateFnsLocale: DateFnsLocale; intlLocale: string } {
  const language = useLanguage()
  return { language, dateFnsLocale: DATE_FNS_LOCALES[language], intlLocale: INTL_LOCALES[language] }
}
