import { radioGroupProps, radioProps } from '../../lib/a11y'

/** The one control for choosing a single option among a few short ones (a period, a language, a theme):
 * a soft track with the chosen option raised on it. Exposed as a radio group, with the arrow keys. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  pill = false,
  className = '',
}: {
  options: readonly { value: T; label: string }[]
  /** `undefined` when nothing is chosen yet. */
  value: T | undefined
  onChange: (value: T) => void
  /** Names the group for screen readers. */
  label: string
  /** Fully rounded and as wide as its content, for a page that may be softer than the rest of the app. */
  pill?: boolean
  className?: string
}) {
  return (
    <div
      {...radioGroupProps(label)}
      className={`gap-1 p-1 ${pill ? 'inline-flex self-center rounded-full' : 'flex rounded-[var(--radius-control)]'} ${className}`}
      style={{ background: 'var(--color-brand-soft)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}
    >
      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            {...radioProps(active)}
            // With nothing chosen yet, the first option is the way into the group.
            tabIndex={active || (value === undefined && i === 0) ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`${pill ? 'rounded-full px-4 whitespace-nowrap' : 'flex-1 rounded-[calc(var(--radius-control)-2px)] px-2'} min-h-10 text-control ${active ? 'font-semibold' : 'font-medium'}`}
            style={{
              background: active ? 'var(--color-surface)' : 'transparent',
              color: 'var(--color-brand)',
              // Like a chosen chip: outlined in the brand colour, so it reads in the dark theme too.
              boxShadow: active ? 'inset 0 0 0 1.5px var(--color-brand)' : undefined,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
