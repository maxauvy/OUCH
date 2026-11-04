/** "de mars", "d’avril": the French preposition before a month name drops its vowel before a vowel ("ton mois d’octobre"). */
export function frenchOfMonth(name: string): string {
  return /^[aeiouyàâäéèêëîïôöùûü]/i.test(name) ? `d’${name}` : `de ${name}`
}
