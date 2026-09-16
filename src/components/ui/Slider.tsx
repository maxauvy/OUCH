interface SliderProps {
  label: string
  helper?: string
  value: number | undefined
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  /** labels shown under the ends of the track, e.g. ['Aucune', 'Extrême'] */
  endLabels?: [string, string]
  accent?: string
  format?: (v: number) => string
}

/** A big, thumb-friendly 0–10 slider. Fibromyalgia hands don't want fiddly
 * controls, so the track and thumb are oversized and the value is always
 * visible without hovering. */
export function Slider({
  label,
  helper,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  endLabels = ['Aucune', 'Extrême'],
  accent = 'var(--color-brand)',
  format,
}: SliderProps) {
  const displayValue = value ?? min
  const pct = ((displayValue - min) / (max - min)) * 100

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2">
        <label className="font-medium text-[15px]" style={{ color: 'var(--color-ink)' }}>
          {label}
        </label>
        <span
          className="tabular-nums text-sm font-semibold rounded-full px-2.5 py-0.5"
          style={{ background: value === undefined ? 'transparent' : accent, color: value === undefined ? 'var(--color-ink-muted)' : 'white' }}
        >
          {value === undefined ? '—' : format ? format(displayValue) : displayValue}
        </span>
      </div>
      {helper && (
        <p className="text-[13px] mt-0.5 mb-2" style={{ color: 'var(--color-ink-muted)' }}>
          {helper}
        </p>
      )}
      <div className="relative py-3 touch-none select-none">
        <div
          className="h-2.5 rounded-full w-full"
          style={{ background: 'color-mix(in srgb, ' + accent + ' 18%, var(--color-hairline))' }}
        >
          <div
            className="h-2.5 rounded-full"
            style={{ width: `${pct}%`, background: accent, transition: 'width 120ms ease' }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-x-0 top-0 w-full h-10 opacity-0 cursor-pointer"
          style={{ marginTop: '-2px' }}
        />
        <div
          className="absolute top-1/2 rounded-full shadow-md pointer-events-none"
          style={{
            width: 28,
            height: 28,
            left: `calc(${pct}% - 14px)`,
            transform: 'translateY(-50%)',
            background: 'var(--color-surface)',
            border: `3px solid ${accent}`,
            transition: 'left 120ms ease',
          }}
        />
      </div>
      <div className="flex justify-between text-[12px]" style={{ color: 'var(--color-ink-muted)' }}>
        <span>{endLabels[0]}</span>
        <span>{endLabels[1]}</span>
      </div>
    </div>
  )
}
