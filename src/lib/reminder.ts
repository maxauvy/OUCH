const LAST_SHOWN_KEY = 'accalmie:lastReminderShownDate'

export function canNotify(): boolean {
  return 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!canNotify()) return 'denied'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

/**
 * Local-only reminder: works while the app is open (or recently backgrounded
 * on some platforms). There is no push server here on purpose — that would
 * mean a backend and an account, which this app deliberately avoids — so a
 * fully reliable reminder even with the app closed isn't possible.
 */
export function maybeShowReminder(reminderTime: string, hasEntryToday: boolean, todayISO: string) {
  if (hasEntryToday) return
  if (!canNotify() || Notification.permission !== 'granted') return

  const [h, m] = reminderTime.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (now < target) return

  const lastShown = localStorage.getItem(LAST_SHOWN_KEY)
  if (lastShown === todayISO) return

  new Notification('Ta météo du jour t’attend', {
    body: 'Deux minutes suffisent pour noter comment tu te sens aujourd’hui.',
    icon: '/icons/icon-192.png',
    tag: 'accalmie-daily-reminder',
  })
  localStorage.setItem(LAST_SHOWN_KEY, todayISO)
}
