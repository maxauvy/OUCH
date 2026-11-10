import { useState } from 'react'
import { LazyShareSheet } from '../components/weather/LazyShareSheet'
import { IS_DEMO } from '../lib/demoMode'
import { DailyEntryForm } from '../components/entry/DailyEntryForm'
import { Footer } from '../components/layout/Footer'
import { hasPain } from '../lib/loggedEntries'
import { useLoggedEntries, useTodayEntry } from '../hooks/useEntries'
import { useTodayMessages } from '../hooks/useTodayMessages'
import type { Tab } from '../components/layout/TabBar'
import { useSettings } from '../hooks/useSettings'
import { useTranslation } from '../i18n'
import { IconCloud, IconMoodKid, type Icon } from '@tabler/icons-react'
import { GroupCaption } from '../components/ui/Card'
import { BackupReminderCard } from '../components/backup/BackupReminderCard'
import { AppointmentCard } from '../components/consultation/AppointmentCard'
import { PrescriptionCard } from '../components/prescription/PrescriptionCard'
import { TodayList } from '../components/today/TodayList'
import { useEarlyAccess } from '../lib/earlyAccess'
import { todayISO } from '../lib/dates'
import { useOpenRelief } from '../components/relief/reliefContext'

export function TodayPage({
  onGoToBackup,
  onOpenSettings,
  onOpenKids,
  onGoToTab,
}: {
  onGoToBackup: () => void
  onOpenSettings: () => void
  /** Absent when the kids' page is turned off in the settings. */
  onOpenKids?: () => void
  onGoToTab: (tab: Tab, date?: string) => void
}) {
  const entry = useTodayEntry()
  const settings = useSettings()
  const t = useTranslation()
  const [sharing, setSharing] = useState(false)
  const date = todayISO()
  const earlyAccess = useEarlyAccess()
  const openRelief = useOpenRelief()

  // What waits for the person is one quiet line under the title, which opens a
  // list (never during a flare: the soft word of the hard days stands alone).
  // The backup reminder keeps its own card: losing the journal is the worst case.
  const logged = useLoggedEntries()
  const messages = useTodayMessages()
  const canShareWeather = !!entry && hasPain(entry)

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      {!IS_DEMO && <BackupReminderCard onBackup={onGoToBackup} />}
      <AppointmentCard />
      <PrescriptionCard />
      <DailyEntryForm
        date={date}
        onGoToBackup={IS_DEMO ? undefined : onGoToBackup}
        onOpenSettings={onOpenSettings}
        afterHeader={
          <>
            {messages && logged && <TodayList messages={messages} settings={settings} entries={logged} today={date} earlyAccess={earlyAccess} onGoToTab={onGoToTab} />}
            {openRelief && (
              <button type="button" onClick={openRelief} className="self-start min-h-11 px-1 text-control font-semibold underline underline-offset-2" style={{ color: 'var(--color-brand)' }}>
                {t.relief.link}
              </button>
            )}
          </>
        }
      />
      {(canShareWeather || onOpenKids) && (
        <section aria-labelledby="share-title" className="flex flex-col gap-2">
          <GroupCaption>
            <span id="share-title">{t.today.shareTitle}</span>
          </GroupCaption>
          <div className="grid grid-cols-2 gap-2">
            {canShareWeather && (
              <ShareTile
                icon={IconCloud}
                title={t.today.shareWeather}
                hint={t.today.shareWeatherHint}
                onClick={() => setSharing(true)}
                tint="var(--cat-weather-soft)"
                color="var(--cat-weather)"
              />
            )}
            {onOpenKids && (
              <ShareTile
                icon={IconMoodKid}
                title={t.today.kidsTile}
                hint={t.today.kidsTileHint}
                onClick={onOpenKids}
                tint="var(--kids-soft, #ece4f8)"
                color="var(--kids, #6b4fa8)"
              />
            )}
          </div>
        </section>
      )}
      {sharing && canShareWeather && entry && (
        <LazyShareSheet entry={entry} displayName={settings.displayName || undefined} onClose={() => setSharing(false)} />
      )}
      <Footer />
    </div>
  )
}

/** A tile of the "Share" row: something to show to someone else (the day's weather, the page for the children). */
function ShareTile({ icon: I, title, hint, onClick, tint, color }: { icon: Icon; title: string; hint: string; onClick: () => void; tint: string; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-[var(--radius-card)] p-3.5 flex flex-col gap-2 min-h-11"
      style={{ background: tint, border: '1px solid var(--color-hairline)', boxShadow: 'var(--card-shadow)' }}
    >
      <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)', color }} aria-hidden>
        <I size={20} stroke={1.8} />
      </span>
      <span>
        <span className="block text-body font-semibold">{title}</span>
        <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {hint}
        </span>
      </span>
    </button>
  )
}
