import { IconMoon } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import { setRestDay } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { useTranslation } from '../../i18n'
import { hasPlan } from '../../lib/hardDaysPlan'
import { useOpenRelief } from '../relief/reliefContext'

/** Under the pain on today's page, next to the link for a harder stretch: a quiet way to say "I am taking it easy today". Plain text, no alert, nothing to confirm. */
export function RestDayLink({ date }: { date: string }) {
  const t = useTranslation().restDay
  return (
    <div className="mt-1">
      <button type="button" onClick={() => void setRestDay(date, true)} className="inline-flex items-center gap-1.5 min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-brand)' }}>
        <IconMoon size={16} aria-hidden />
        {t.link}
      </button>
    </div>
  )
}

/**
 * Said at the top of the day once the person chose it: the day is quiet (a lighter form, nothing suggested), the plan for hard days is one tap away when there is one, and
 * the day can be taken back. `light` says the lighter form is on, so the way to the full form is offered here.
 */
export function RestDayCard({ date, light }: { date: string; light: boolean }) {
  const t = useTranslation()
  const tr = t.restDay
  const openRelief = useOpenRelief()
  const plan = useSettings().hardDaysPlan
  const link = 'text-control font-semibold underline underline-offset-2 text-left min-h-11'
  return (
    <section
      aria-label={tr.title}
      className="flex gap-3 rounded-[var(--radius-card)] py-3.5 px-3.5"
      style={{ background: 'var(--color-brand-soft)', boxShadow: 'var(--tint-edge, none)' }}
    >
      <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }} aria-hidden>
        <IconMoon size={20} stroke={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold">{tr.title}</p>
        <p className="text-body">{tr.body}</p>
        <div className="flex flex-col items-start mt-1">
          {openRelief && hasPlan(plan) && (
            <button type="button" onClick={() => openRelief('plan')} className={link} style={{ color: 'var(--color-brand)' }}>
              {t.plan.open}
            </button>
          )}
          {light && (
            <button type="button" onClick={() => void updateSettings({ fullFormDay: date })} className={link} style={{ color: 'var(--color-brand)' }}>
              {t.hardDays.fullForm}
            </button>
          )}
          <button type="button" onClick={() => void setRestDay(date, false)} className={link} style={{ color: 'var(--color-brand)' }}>
            {tr.resume}
          </button>
        </div>
      </div>
    </section>
  )
}
