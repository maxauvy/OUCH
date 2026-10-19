/** A toggle chip (aria-pressed). Pass `actionLabel` for a chip that performs
 * an action instead, like adding a suggestion: it is then announced as a
 * plain button with that name, not as a toggle that is "not pressed". */
export function Chip({
  label,
  selected,
  onClick,
  actionLabel,
  tone,
}: {
  label: string
  selected: boolean
  onClick: () => void
  actionLabel?: string
  /** A measure category (`mood`, `outdoor`…): in the luminous look, the chip is picked out in its colour. */
  tone?: string
}) {
  const accent = tone ? `var(--look-${tone}, var(--color-brand))` : 'var(--color-brand)'
  const soft = tone ? `var(--look-${tone}-soft, var(--color-brand-soft))` : 'var(--color-brand-soft)'
  const style = {
    background: selected ? soft : 'var(--color-surface)',
    color: selected ? accent : 'var(--color-ink)',
    boxShadow: `inset 0 0 0 1px ${selected ? accent : 'var(--color-hairline)'}`,
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actionLabel ? undefined : selected}
      aria-label={actionLabel}
      className="rounded-[var(--radius-control)] px-3.5 py-2 text-control font-medium transition-colors"
      style={style}
    >
      {label}
    </button>
  )
}
