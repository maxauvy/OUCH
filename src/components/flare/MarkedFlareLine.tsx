import { useState } from 'react'
import { format as formatDate } from 'date-fns'
import { updateSettings } from '../../db'
import { useSettings } from '../../hooks/useSettings'
import { todayISO } from '../../lib/dates'
import { endMarked, ongoingMarked, removeOngoing } from '../../lib/markedFlares'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { MarkedFlareSheet } from './MarkedFlareSheet'

/** Under the pain on today's page: a quiet link to mark a harder stretch, or, while one is open, a line to say it is over. Plain text and links, no alert. */
export function MarkedFlareLine() {
  const t = useTranslation().markedFlare
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const settings = useSettings()
  const today = todayISO()
  const [open, setOpen] = useState(false)
  const ongoing = ongoingMarked(settings.markedFlares, today)
  const link = 'min-h-11 text-control font-semibold underline underline-offset-4'

  return (
    <div className="mt-1">
      {ongoing ? (
        <p className="text-control" style={{ color: 'var(--color-ink-muted)' }}>
          {format(t.ongoing, { date: formatDate(new Date(ongoing.start + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale }) }, language)}{' '}
          <button type="button" onClick={() => void updateSettings({ markedFlares: endMarked(settings.markedFlares, today) })} className={link} style={{ color: 'var(--color-brand)' }}>
            {t.finished}
          </button>{' '}
          <button type="button" onClick={() => void updateSettings({ markedFlares: removeOngoing(settings.markedFlares, today) })} className="min-h-11 text-control underline underline-offset-4">
            {t.remove}
          </button>
        </p>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={link} style={{ color: 'var(--color-brand)' }}>
          {t.link}
        </button>
      )}
      {open && <MarkedFlareSheet settings={settings} today={today} onClose={() => setOpen(false)} />}
    </div>
  )
}
