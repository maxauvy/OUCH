import { radioGroupProps, radioProps } from '../../lib/a11y'
import { useRichLook } from '../../lib/look'

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
  // The weather look: separate soft chips, the chosen one tinted and ringed, like the day's choices.
  const rich = useRichLook() && !pill
  return (
    <div
      {...radioGroupProps(label)}
      className={`${rich ? 'flex gap-1.5' : 'gap-1 p-1'} ${pill ? 'inline-flex self-center rounded-full' : rich ? '' : 'flex rounded-[var(--radius-control)]'} ${className}`}
      style={rich ? undefined : { background: 'var(--color-brand-soft)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}
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
            className={`${pill ? 'rounded-full px-4 whitespace-nowrap' : rich ? 'flex-1 rounded-[12px] px-2' : 'flex-1 rounded-[calc(var(--radius-control)-2px)] px-2'} min-h-10 text-control ${active ? (rich ? 'font-bold' : 'font-semibold') : 'font-medium'}`}
            style={
              rich
                ? {
                    background: active ? 'var(--color-brand-soft)' : 'var(--chip-bg, var(--color-surface-raised))',
                    color: active ? 'var(--color-brand)' : 'var(--color-ink)',
                    boxShadow: active ? 'inset 0 0 0 1.5px var(--color-brand)' : undefined,
                  }
                : {
                    background: active ? 'var(--color-surface)' : 'transparent',
                    color: 'var(--color-brand)',
                    // Like a chosen chip: outlined in the brand colour, so it reads in the dark theme too.
                    boxShadow: active ? 'inset 0 0 0 1.5px var(--color-brand)' : undefined,
                  }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
