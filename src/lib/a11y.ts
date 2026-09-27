import type { KeyboardEvent } from 'react'

// Single-choice button rows (language, theme, child's age…) are exposed as
// radio groups: a screen reader announces the group, the checked option and
// its position, and the arrow keys move the choice like native radios.

function onRadioGroupKeyDown(e: KeyboardEvent<HTMLElement>) {
  const step =
    e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!step) return
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'))
  const i = radios.indexOf(document.activeElement as HTMLElement)
  if (i === -1) return
  e.preventDefault()
  const next = radios[(i + step + radios.length) % radios.length]!
  next.focus()
  next.click()
}

export function radioGroupProps(label: string) {
  return { role: 'radiogroup', 'aria-label': label, onKeyDown: onRadioGroupKeyDown } as const
}

/** Only the checked option is in the tab order; the arrows reach the others. */
export function radioProps(checked: boolean) {
  return { role: 'radio', 'aria-checked': checked, tabIndex: checked ? 0 : -1 } as const
}

/** Splits a leading emoji off a text ("🤗 Faire un câlin") so it can be
 * rendered aria-hidden instead of being read aloud. */
export function splitLeadingEmoji(text: string): { emoji: string | null; label: string } {
  const match = text.match(/^(\S+)\s+(.*)$/su)
  if (match && /\p{Extended_Pictographic}/u.test(match[1]!)) return { emoji: match[1]!, label: match[2]! }
  return { emoji: null, label: text }
}
