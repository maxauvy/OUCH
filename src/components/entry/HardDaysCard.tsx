import { useEffect } from 'react'
import { IconHeart, IconX } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { DailyEntry } from '../../db/types'
import { useStoredSettings } from '../../hooks/useSettings'
import { hardDaysCard } from '../../lib/hardDays'
import { useLanguage, useTranslation } from '../../i18n'

// What the person wrote down as helping reads in their own words ("Bain
// chaud"), so it goes in the middle of a sentence in lower case, unless it
// starts like an acronym ("TENS").
const lowerFirst = (s: string) => (s.length > 1 && s[1] === s[1]!.toLocaleUpperCase() && s[1] !== s[1]!.toLocaleLowerCase() ? s : s.charAt(0).toLocaleLowerCase() + s.slice(1))

/** A soft word at the top of the day's page, once, when a flare is under way.
 * The ideas are highlighted in the text rather than set as buttons: they
 * lead nowhere, they are only there to be remembered. */
export function HardDaysCard({ date, entries }: { date: string; entries: DailyEntry[] }) {
  const t = useTranslation().hardDays
  const language = useLanguage()
  // Until the settings are read there is nothing to go on: the defaults
  // would pass for "not seen yet", and writing that back would overwrite
  // what is stored about this flare (a dismissal, for one).
  const settings = useStoredSettings()
  const seen = settings?.hardDaysSeen
  const card = settings ? hardDaysCard({ entries, today: date, seen, enabled: settings.hardDaysCardEnabled }) : null
  const start = card?.episode.start

  // Remember that it was shown, so it does not come back on the next days.
  useEffect(() => {
    if (start && (seen?.start !== start || seen.date !== date)) {
      void updateSettings({ hardDaysSeen: { start, date, dismissed: false } })
    }
  }, [start, seen?.start, seen?.date, date])

  if (!card || !start) return null

  const [before, after] = t.helped.split('{{list}}')
  const ideas = new Intl.ListFormat(language, { style: 'long', type: 'disjunction' }).formatToParts(card.helped.map(lowerFirst))

  return (
    <section
      aria-label={t.label}
      className="relative flex gap-3 rounded-[var(--radius-card)] py-3.5 pl-3.5 pr-12"
      style={{ background: 'var(--color-brand-soft)' }}
    >
      <span
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center"
        style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }}
        aria-hidden
      >
        <IconHeart size={20} stroke={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold">{t.lead}</p>
        <p className="text-body">{t.body}</p>
        {card.helped.length > 0 && (
          <p className="text-heading font-medium mt-3 leading-[1.7]">
            {before}
            {ideas.map((part, i) =>
              part.type === 'element' ? (
                <mark key={i} className="font-bold px-0.5" style={{ color: 'inherit', background: MARKER }}>
                  {part.value}
                </mark>
              ) : (
                part.value
              )
            )}
            {after}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label={t.close}
        onClick={() => void updateSettings({ hardDaysSeen: { start, date, dismissed: true } })}
        className="absolute top-0.5 right-0.5 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ color: 'var(--color-ink-muted)' }}
      >
        <IconX size={16} aria-hidden />
      </button>
    </section>
  )
}

/** A highlighter stroke under the lower part of the words. */
const MARKER =
  'linear-gradient(transparent 58%, color-mix(in srgb, var(--color-weather-1) 45%, transparent) 58%, color-mix(in srgb, var(--color-weather-1) 45%, transparent) 92%, transparent 92%)'
