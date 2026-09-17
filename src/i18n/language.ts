export type Language = 'fr' | 'en'

export const DEFAULT_LANGUAGE: Language = 'fr'

/** Each language's name is shown in itself, not translated. */
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
]
