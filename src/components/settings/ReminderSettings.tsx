import { useState } from 'react'
import { IconBell, IconCalendarEvent } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import { useSettings } from '../../hooks/useSettings'
import { buildReminderIcs, REMINDER_FILENAME } from '../../lib/agendaReminder'
import { downloadBlob } from '../../lib/backup'
import { canNotify, requestNotificationPermission } from '../../lib/reminder'
import { format, useTranslation } from '../../i18n'
import { Card } from '../ui/Card'
import { RoundIcon } from '../ui/RoundIcon'
import { Toggle } from '../ui/Toggle'

const inputStyle = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }

/**
 * The daily reminder, in the setup and in the Settings: one time, then the way to be
 * reminded. The calendar comes first because it is the one that rings with the app
 * closed (a small file the phone's calendar opens: no server, nothing sent). The
 * notification of the app comes second, with its limit said.
 */
export function ReminderSettings({ primary = false }: { primary?: boolean }) {
  const t = useTranslation().settings
  const setup = useTranslation().setup
  const settings = useSettings()
  const [denied, setDenied] = useState(false)
  const agenda = settings.agendaReminder
  const stale = agenda !== undefined && agenda.time !== settings.reminderTime

  async function toggleInApp(on: boolean) {
    setDenied(false)
    if (on && canNotify()) {
      const perm = await requestNotificationPermission()
      if (perm !== 'granted') {
        setDenied(true)
        await updateSettings({ reminderEnabled: false })
        return
      }
    }
    await updateSettings({ reminderEnabled: on })
  }

  async function addToAgenda() {
    const sequence = (agenda?.sequence ?? -1) + 1
    const ics = buildReminderIcs({
      time: settings.reminderTime,
      appUrl: location.origin + import.meta.env.BASE_URL,
      title: t.agendaIcsTitle,
      description: t.agendaIcsDescription,
      sequence,
      now: new Date(),
    })
    downloadBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), REMINDER_FILENAME)
    await updateSettings({ agendaReminder: { time: settings.reminderTime, sequence } })
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <RoundIcon icon={IconBell} className="self-start mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-body font-semibold">{t.reminderTitle}</h2>
          <p className="text-caption mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
            {t.reminderCardHelper}
          </p>
        </div>
      </div>

      <label className="block mt-3">
        <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {setup.reminderTime}
        </span>
        <input
          type="time"
          value={settings.reminderTime}
          onChange={(e) => e.target.value && updateSettings({ reminderTime: e.target.value })}
          className="block rounded-xl px-3.5 py-2.5 text-body outline-none mt-1"
          style={inputStyle}
        />
      </label>

      <section aria-label={t.agendaTitle} className="mt-4 rounded-[var(--radius-card)] p-3.5" style={{ background: 'var(--color-brand-soft)' }}>
        <div className="flex items-start gap-3">
          <RoundIcon icon={IconCalendarEvent} className="self-start" />
          <div className="min-w-0">
            <h3 className="text-body font-semibold">{t.agendaTitle}</h3>
            <p className="text-caption mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
              {t.agendaHelper}
            </p>
          </div>
        </div>
        <button type="button" onClick={addToAgenda} disabled={!settings.reminderTime} className={`${primary && !agenda ? 'btn-primary' : 'btn-secondary'} w-full mt-3`} style={primary && !agenda ? undefined : { background: 'var(--color-surface)' }}>
          {stale ? t.agendaUpdate : t.agendaAdd}
        </button>
        {agenda && (
          <p className="text-caption mt-2 font-medium" role="status">
            {stale ? format(t.agendaStale, { time: agenda.time }) : format(t.agendaSent, { time: agenda.time })}
          </p>
        )}
        <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
          {t.agendaNote}
        </p>
      </section>

      <div className="flex items-center justify-between gap-3 mt-4">
        <div className="min-w-0">
          <p className="text-control font-medium">{t.reminderInAppTitle}</p>
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {t.reminderHelper}
          </p>
        </div>
        <Toggle checked={settings.reminderEnabled} onChange={toggleInApp} label={t.reminderInAppTitle} />
      </div>
      <p className="text-caption mt-2" role={denied ? 'alert' : undefined} style={{ color: 'var(--color-ink-muted)' }}>
        {denied ? setup.reminderDenied : t.reminderNote}
      </p>
    </Card>
  )
}
