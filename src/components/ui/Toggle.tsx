export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-12 h-7 rounded-full relative shrink-0 transition-colors"
      style={{ background: checked ? 'var(--color-brand)' : 'var(--color-hairline)' }}
    >
      <span
        className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow"
        style={{ left: checked ? 24 : 4 }}
      />
    </button>
  )
}
