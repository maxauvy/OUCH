// The word typed to confirm deleting everything. Compared without regard to
// case, accents or stray spaces, so a phone keyboard that capitalises or
// adds a trailing space does not leave the button stuck.

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase()

export function confirmationMatches(typed: string, word: string): boolean {
  return plain(word) !== '' && plain(typed) === plain(word)
}
