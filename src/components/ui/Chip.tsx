/** A toggle chip (aria-pressed). Pass `actionLabel` for a chip that performs
 * an action instead, like adding a suggestion: it is then announced as a
 * plain button with that name, not as a toggle that is "not pressed". */
export function Chip({
  label,
  selected,
  onClick,
  actionLabel,
}: {
  label: string
  selected: boolean
  onClick: () => void
  actionLabel?: string
}) {
  const style = {
    background: selected ? 'var(--color-brand-soft)' : 'var(--color-surface)',
    color: selected ? 'var(--color-brand)' : 'var(--color-ink)',
    boxShadow: `inset 0 0 0 1px ${selected ? 'var(--color-brand)' : 'var(--color-hairline)'}`,
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
