// A suggestion of "what helped" is stored as the text that was picked. When
// the app rewords one, what is already in the journal (and in older backups)
// keeps the old words, and the two would count as two different actions. The
// old wordings are listed here, with what they became.

/** Old wording (lower case, one space between words) → current wording, in the same language. */
const RENAMED: Record<string, string> = {
  'bain chaud': 'Bain / douche chaude',
  'warm bath': 'Warm bath / shower',
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase()

/** The current wording of an action that was a suggestion under an old one; anything else comes back as it was. */
export function currentLabel(label: string): string {
  return RENAMED[tidy(label)] ?? label
}

/** A day's actions under their current wording, with no repeat (case aside) once two wordings have met. */
export function currentLabels(list: readonly string[]): string[] {
  const out: string[] = []
  for (const raw of list) {
    const label = currentLabel(raw)
    if (!out.some((o) => tidy(o) === tidy(label))) out.push(label)
  }
  return out
}

/** The same for the kept gestures: the first of two that meet stays, with its time. */
export function currentGestures<T extends { name: string }>(list: readonly T[]): T[] {
  const out: T[] = []
  for (const g of list) {
    const name = currentLabel(g.name)
    if (!out.some((o) => tidy(o.name) === tidy(name))) out.push({ ...g, name })
  }
  return out
}
