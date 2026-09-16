export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors"
      style={{
        background: selected ? 'var(--color-brand)' : 'var(--color-brand-soft)',
        color: selected ? 'white' : 'var(--color-brand)',
      }}
    >
      {label}
    </button>
  )
}
