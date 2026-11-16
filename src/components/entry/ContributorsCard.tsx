import { FLARE_FACTORS, type FlareFactor } from '../../db/types'
import { upsertEntry } from '../../hooks/useEntries'
import { useTranslation } from '../../i18n'
import { toggleContributor } from '../../lib/contributors'
import { Chip } from '../ui/Chip'

/**
 * Under the pain, on a day that stands out from the person's usual: "what may have played a part?", a few labels to touch, optional, kept on the day. It is their sense of it, said as
 * such: never a cause. Nothing is ticked at first, and nothing happens when none is touched.
 */
export function ContributorsCard({ date, selected }: { date: string; selected: readonly FlareFactor[] | undefined }) {
  const t = useTranslation()
  const tc = t.contributors
  const toggle = (f: FlareFactor) => {
    const next = toggleContributor(selected, f)
    void upsertEntry(date, { contributors: next.length ? next : undefined })
  }
  return (
    <section aria-labelledby={`contributors-${date}`} className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}>
      <p className="text-body">
        <span id={`contributors-${date}`} className="font-semibold">
          {tc.title}
        </span>{' '}
        <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {tc.optional}
        </span>
      </p>
      <div className="flex flex-wrap gap-2 mt-2" role="group" aria-labelledby={`contributors-${date}`}>
        {FLARE_FACTORS.map((f) => (
          <Chip key={f} label={t.markedFlare.factors[f]} selected={!!selected?.includes(f)} onClick={() => toggle(f)} />
        ))}
      </div>
      <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
        {tc.note}
      </p>
    </section>
  )
}
