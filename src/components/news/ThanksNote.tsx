import { format, useLanguage, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

/** A word of thanks to the people already there, signed: once on its own, then from « Nouveautés ». Nothing to decide. */
export function ThanksNote({ days, onClose }: { days: number; onClose: () => void }) {
  const t = useTranslation().news
  const language = useLanguage()
  return (
    <ModalSheet title={t.thanks.title} closeLabel={t.close} onClose={onClose}>
      <div className="flex flex-col gap-3 text-body leading-relaxed">
        {days > 0 && <p>{format(t.thanks.days, { n: days }, language)}</p>}
        <p>{t.thanks.pace}</p>
        <p>{t.thanks.say}</p>
        <p style={{ color: 'var(--color-ink-muted)' }}>{t.thanks.kept}</p>
        <p className="italic" style={{ color: 'var(--color-ink-muted)' }}>
          {t.thanks.signature}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="min-h-12 rounded-[var(--radius-control)] px-4 text-control font-semibold"
        style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
      >
        {t.thanks.ok}
      </button>
    </ModalSheet>
  )
}
