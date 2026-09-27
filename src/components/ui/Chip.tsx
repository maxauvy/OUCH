import { useDesign } from '../../hooks/useDesign'

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  const design = useDesign()
  const style =
    design === 'health'
      ? {
          background: selected ? 'var(--color-brand-soft)' : 'var(--color-surface)',
          color: selected ? 'var(--color-brand)' : 'var(--color-ink)',
          boxShadow: `inset 0 0 0 1px ${selected ? 'var(--color-brand)' : 'var(--color-hairline)'}`,
        }
      : {
          background: selected ? 'var(--color-brand)' : 'var(--color-brand-soft)',
          color: selected ? 'var(--color-on-brand)' : 'var(--color-brand)',
        }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="rounded-[var(--radius-control)] px-3.5 py-2 text-[14px] font-medium transition-colors"
      style={style}
    >
      {label}
    </button>
  )
}
