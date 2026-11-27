import { useState } from 'react'
import { IconCalendarHeart, IconMoon, type Icon } from '@tabler/icons-react'
import { setRestDay } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { useTranslation } from '../../i18n'
import { todayISO } from '../../lib/dates'
import { ongoingMarked } from '../../lib/markedFlares'
import { ModalSheet } from '../ui/ModalSheet'
import { RoundIcon } from '../ui/RoundIcon'
import { MarkedFlareLine } from '../flare/MarkedFlareLine'
import { MarkedFlareSheet } from '../flare/MarkedFlareSheet'
import { RestDayLink } from './RestDay'

/**
 * Under the pain on today's page, one quiet link « Une journée à part ? » for the two ways of saying the day is not an ordinary one:
 * a quiet day (just today) or a harder stretch that starts. One line to read instead of two. When only one of them is still open
 * (a quiet day already chosen, a stretch already noted), that one shows as before, and a stretch under way keeps its line.
 */
export function DayApart({ date, rest }: { date: string; rest: boolean }) {
  const t = useTranslation().dayApart
  const settings = useSettings()
  const today = todayISO()
  const [choosing, setChoosing] = useState(false)
  const [marking, setMarking] = useState(false)
  const ongoing = !!ongoingMarked(settings.markedFlares, today)

  if (rest || ongoing)
    return (
      <>
        <MarkedFlareLine />
        {!rest && <RestDayLink date={date} />}
      </>
    )

  return (
    <div className="mt-1">
      <button type="button" onClick={() => setChoosing(true)} className="inline-flex items-center gap-1.5 min-h-11 text-control font-semibold underline underline-offset-4" style={{ color: 'var(--color-brand)' }}>
        <IconMoon size={16} aria-hidden />
        {t.link}
      </button>
      {choosing && (
        <ModalSheet title={t.title} closeLabel={t.close} onClose={() => setChoosing(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>
              {t.intro}
            </p>
            <Choice
              icon={IconMoon}
              title={t.restTitle}
              body={t.restBody}
              onClick={() => {
                setChoosing(false)
                void setRestDay(date, true)
              }}
            />
            <Choice
              icon={IconCalendarHeart}
              title={t.markedTitle}
              body={t.markedBody}
              onClick={() => {
                setChoosing(false)
                setMarking(true)
              }}
            />
          </div>
        </ModalSheet>
      )}
      {marking && <MarkedFlareSheet settings={settings} today={today} onClose={() => setMarking(false)} />}
    </div>
  )
}

/** One of the two ways: a white row with its icon, its name and what it does. */
function Choice({ icon, title, body, onClick }: { icon: Icon; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-start gap-3 w-full p-3.5 rounded-[16px] text-left" style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}>
      <RoundIcon icon={icon} />
      <span className="flex-1 min-w-0">
        <span className="block text-control font-semibold">{title}</span>
        <span className="block text-caption mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
          {body}
        </span>
      </span>
    </button>
  )
}
