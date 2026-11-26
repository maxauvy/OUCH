// Réglages: every setting has an id, a short name (listed under its group's title while the group is folded) and a few extra words
// that search finds it by (« code » finds the lock). Search ignores accents and case, and wants every word typed.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

export const SETTING_IDS = [
  // À l'essai (early access only)
  'physio',
  'flareImage',
  'webdav',
  // Mon profil
  'firstName',
  'parentGender',
  'illnesses',
  'rerun',
  // Ce que je note
  'factors',
  'medications',
  'cycle',
  // Ce que l'app fait pour moi
  'reminder',
  'suggestions',
  'weatherPlace',
  'forecast',
  // Les jours difficiles
  'hardDaysCard',
  'lightForm',
  // Apparence
  'language',
  'appearance',
  'kidsTab',
  // Confidentialité et données
  'demo',
  'lock',
  'autoBackup',
  'backup',
  'audience',
  'sensitive',
  // À propos
  'about',
  'demoStart',
  'audienceDetail',
  'sources',
  'privacy',
] as const

export type SettingId = (typeof SETTING_IDS)[number]

/** Lower case, without accents, one kind of apostrophe and single spaces. */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Whether every word of the query is found in the texts (title, short name, keywords, group). False for an empty query. */
export function matchesSearch(query: string, texts: readonly string[]): boolean {
  const words = normalizeSearch(query).split(' ').filter(Boolean)
  if (!words.length) return false
  const text = normalizeSearch(texts.join(' '))
  return words.every((w) => text.includes(w))
}
