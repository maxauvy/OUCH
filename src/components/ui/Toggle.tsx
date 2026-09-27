export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  /** Accessible name — the visible label sits next to the switch, not inside it. */
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="w-12 h-7 rounded-full relative shrink-0 transition-colors"
      style={{ background: checked ? 'var(--color-brand)' : 'var(--color-control-off)' }}
    >
      <span
        className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow"
        style={{ left: checked ? 24 : 4 }}
      />
    </button>
  )
}
