import { useEffect } from 'react'
import { IconChevronRight, IconHeart, IconMessageHeart, IconWind, IconX, type Icon } from '@tabler/icons-react'
import { RoundIcon } from '../ui/RoundIcon'
import { db, updateSettings } from '../../db'
import type { HardDaysCard as Card } from '../../lib/hardDays'
import { useLanguage, useTranslation } from '../../i18n'
import { useOpenRelief } from '../relief/reliefContext'
import { useSettings } from '../../hooks/useSettings'
import { hasPlan } from '../../lib/hardDaysPlan'

// What the person wrote down as helping reads in their own words ("Bain
// chaud"), so it goes in the middle of a sentence in lower case, unless it
// starts like an acronym ("TENS").
const lowerFirst = (s: string) => (s.length > 1 && s[1] === s[1]!.toLocaleUpperCase() && s[1] !== s[1]!.toLocaleLowerCase() ? s : s.charAt(0).toLocaleLowerCase() + s.slice(1))

/** A soft word at the top of the day's page, once, when a flare is under way.
 * The ideas are highlighted in the text rather than set as buttons: they
 * lead nowhere, they are only there to be remembered.
 *
 * `card` comes from `useHardDays`, which reads the settings in one go: with
 * the defaults standing in for them, "not seen yet" would be written back
 * over what is stored about this flare (a dismissal, for one). `light` says
 * the day's form is the lighter one, so the way back to the full form is
 * offered here, the one day this card is shown. */
export function HardDaysCard({ date, card, light }: { date: string; card: Card | null; light: boolean }) {
  const t = useTranslation().hardDays
  const tr = useTranslation().relief
  const openRelief = useOpenRelief()
  const tp = useTranslation().plan
  const plan = useSettings().hardDaysPlan
  const language = useLanguage()
  const start = card?.episode.start

  // Remember that it was shown, so it does not come back on the next days.
  useEffect(() => {
    if (!start) return
    void (async () => {
      const seen = (await db.settings.get(1))?.hardDaysSeen
      if (seen?.start !== start || seen.date !== date) await updateSettings({ hardDaysSeen: { start, date, dismissed: false } })
    })()
  }, [start, date])

  if (!card || !start) return null

  const [before, after] = t.helped.split('{{list}}')
  const ideas = new Intl.ListFormat(language, { style: 'long', type: 'disjunction' }).formatToParts(card.helped.map(lowerFirst))

  return (
    <section
      aria-label={t.label}
      className="relative flex gap-3 rounded-[var(--radius-card)] py-3.5 pl-3.5 pr-12"
      style={{ background: 'var(--color-brand-soft)', boxShadow: 'var(--tint-edge, none)' }}
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
        {openRelief && (
          <div className="flex flex-col gap-2 mt-3">
            {hasPlan(plan) && <Action icon={IconMessageHeart} label={tp.open} onClick={() => openRelief('plan')} />}
            <Action icon={IconWind} label={tr.cardButton} onClick={() => openRelief('breath')} />
          </div>
        )}
        {light && (
          <button
            type="button"
            onClick={() => void updateSettings({ fullFormDay: date })}
            className="mt-3 text-control font-semibold underline underline-offset-2 text-left"
            style={{ color: 'var(--color-brand)' }}
          >
            {t.fullForm}
          </button>
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

/** A way to feel better, one tap away: a white row with a round icon, like the rows of the Consultation tab. */
function Action({ icon, label, onClick }: { icon: Icon; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 w-full min-h-12 py-1.5 pl-2 pr-3 rounded-[var(--radius-control)] text-left text-control font-semibold" style={{ background: 'var(--color-surface)' }}>
      <RoundIcon icon={icon} />
      <span className="flex-1 min-w-0">{label}</span>
      <IconChevronRight size={20} aria-hidden style={{ color: 'var(--color-ink-muted)' }} />
    </button>
  )
}

/** A highlighter stroke under the lower part of the words. */
const MARKER =
  'linear-gradient(transparent 58%, color-mix(in srgb, var(--color-weather-1) 45%, transparent) 58%, color-mix(in srgb, var(--color-weather-1) 45%, transparent) 92%, transparent 92%)'
