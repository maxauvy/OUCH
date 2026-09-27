import { useId } from 'react'
import { useDesign } from '../../hooks/useDesign'

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
  /** Track only: the caller already shows the label and value. */
  bare?: boolean
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
  bare = false,
}: SliderProps) {
  const health = useDesign() === 'health'
  const id = useId()
  const trackHeight = health ? 6 : 10
  const displayValue = value ?? min
  const pct = ((displayValue - min) / (max - min)) * 100

  return (
    <div className="w-full">
      {!bare && (
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="font-medium text-[15px]" style={{ color: 'var(--color-ink)' }}>
            {label}
          </label>
          {health ? (
            <span className="tabular-nums text-[15px] font-bold" style={{ color: 'var(--color-ink)' }}>
              {value === undefined ? '—' : format ? format(displayValue) : displayValue}
              {value !== undefined && !format && (
                <span className="text-[12px] font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                  {' '}/ {max}
                </span>
              )}
            </span>
          ) : (
            <span
              className="tabular-nums text-sm font-semibold rounded-full px-2.5 py-0.5"
              style={{
                background: value === undefined ? 'transparent' : accent,
                color:
                  value === undefined
                    ? 'var(--color-ink-muted)'
                    : accent === 'var(--color-brand)'
                      ? 'var(--color-on-brand)'
                      : 'white',
              }}
            >
              {value === undefined ? '—' : format ? format(displayValue) : displayValue}
            </span>
          )}
        </div>
      )}
      {!bare && helper && (
        <p className="text-[13px] mt-0.5 mb-2" style={{ color: 'var(--color-ink-muted)' }}>
          {helper}
        </p>
      )}
      <div className="relative py-3 touch-none select-none">
        <div
          className="rounded-full w-full"
          style={{
            height: trackHeight,
            background: health ? 'var(--color-control-off)' : 'color-mix(in srgb, ' + accent + ' 18%, var(--color-hairline))',
          }}
        >
          <div
            className="rounded-full"
            style={{
              height: trackHeight,
              width: `${pct}%`,
              background: value === undefined && health ? 'transparent' : accent,
              transition: 'width 120ms ease',
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => onChange(Number(e.target.value))}
          id={id}
          aria-label={bare ? label : undefined}
          aria-valuetext={format ? format(displayValue) : undefined}
          className="peer absolute inset-x-0 top-0 w-full h-10 opacity-0 cursor-pointer"
          style={{ marginTop: '-2px' }}
        />
        {/* The real input is invisible, so the thumb carries its keyboard focus ring. */}
        <div
          className="absolute top-1/2 rounded-full shadow-md pointer-events-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[var(--color-brand)]"
          style={{
            width: 28,
            height: 28,
            left: `calc(${pct}% - 14px)`,
            transform: 'translateY(-50%)',
            background: 'var(--color-surface)',
            border: `3px solid ${value === undefined && health ? 'var(--color-hairline)' : accent}`,
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
