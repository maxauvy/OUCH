// Automatic backup on this device: what the screen and the app call. It joins
// the pieces that stand apart (the kept key, the provider, the copy logic) to
// the journal and to the settings that remember how the last copy went.

import { db, getSettings, updateSettings } from '../db'
import type { AutoBackupState } from '../db/types'
import { exportBackupWithKey } from './backup'
import { runBackup, type BackupOutcome } from './autoBackup'
import { createBackupKey } from './crypto'
import { clearBackupKey, loadBackupKey, saveBackupKey } from './backupKeyStore'
import { memoryProvider } from './cloud/memoryProvider'
import type { BackupProvider } from './cloud/provider'
import { dropboxProvider } from './cloud/dropboxProvider'
import { cleanReturnAddress, finishDropboxLink, forgetPendingDropboxLink, getDropboxToken, readDropboxReturn, startDropboxLink, unlinkDropbox } from './cloud/dropboxLink'

const FLAG = 'ouch:autobackup'

/** Early access: the card is shown in development, and on a device where it
 * was asked for with `?autobackup` at the end of the address (`?autobackup=0`
 * takes it back). Until it has been tried on phones, it is not for everyone. */
function readFlag(): boolean {
  try {
    const params = new URLSearchParams(location.search)
    if (params.has('autobackup')) {
      if (params.get('autobackup') === '0') localStorage.removeItem(FLAG)
      else localStorage.setItem(FLAG, '1')
      params.delete('autobackup')
      const rest = params.toString()
      history.replaceState(null, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`)
    }
    return import.meta.env.DEV || localStorage.getItem(FLAG) === '1'
  } catch {
    return import.meta.env.DEV
  }
}

export const AUTO_BACKUP_AVAILABLE = readFlag()

type ProviderId = AutoBackupState['provider']

/** Providers that can be chosen today, in the order they are listed. The
 * trial one (in memory, lost at reload) only exists in development. */
export const AVAILABLE_PROVIDERS: ProviderId[] = import.meta.env.DEV ? ['dropbox', 'memory'] : ['dropbox']

/** Providers that send the person away to agree, and bring them back to the app. */
export const REDIRECT_PROVIDERS: ProviderId[] = ['dropbox']

let trial: BackupProvider | null = null

/** The place copies go for `id`, or null while that provider is not built. */
export function providerFor(id: ProviderId): BackupProvider | null {
  if (id === 'memory') return (trial ??= memoryProvider())
  if (id === 'dropbox') return dropboxProvider(getDropboxToken)
  return null
}

let running = false

/** Makes, sends and checks a copy now, and remembers how it went. Only one at a time. */
export async function backupNow(): Promise<BackupOutcome | null> {
  if (running) return null
  running = true
  try {
    const state = (await getSettings()).autoBackup
    const provider = state && providerFor(state.provider)
    const backupKey = await loadBackupKey()
    const attemptAt = Date.now()
    if (!state || !provider || !backupKey) {
      // The key is gone (the browser dropped it): copies cannot be made until it is set up again.
      if (state) await updateSettings({ autoBackup: { ...state, lastAttemptAt: attemptAt, lastFailure: 'auth' } })
      return { ok: false, reason: 'auth' }
    }
    const outcome = await runBackup({ provider, backupKey, makeCopy: exportBackupWithKey })
    if (outcome.ok) {
      await updateSettings({
        autoBackup: { provider: state.provider, lastCopy: outcome.copy, lastAttemptAt: attemptAt },
        // A checked copy is a backup: the date on Today and the reminder follow it.
        lastBackupAt: outcome.copy.at,
        backupReminderSnoozedUntil: undefined,
      })
    } else {
      if (import.meta.env.DEV) console.warn('[autobackup]', outcome.reason, outcome.detail)
      await updateSettings({
        autoBackup: { ...state, lastAttemptAt: attemptAt, lastFailure: outcome.reason, lastFailureDetail: outcome.detail },
      })
    }
    return outcome
  } finally {
    running = false
  }
}

/** Links `provider`, keeps the key made from `password`, and sends a first copy. */
export async function setUpAutoBackup(provider: ProviderId, password: string): Promise<BackupOutcome | null> {
  await saveBackupKey(await createBackupKey(password))
  await updateSettings({ autoBackup: { provider } })
  return backupNow()
}

/** For a provider the person has to agree with elsewhere: keeps the key made from
 * `password` (it must survive the trip), then sends the person away. The link
 * is finished by `handleProviderReturn` when they come back. */
export async function beginRedirectLink(provider: ProviderId, password: string): Promise<void> {
  await saveBackupKey(await createBackupKey(password))
  if (provider === 'dropbox') await startDropboxLink()
}

/** How a trip to a provider ended, said once when the person is back. */
export type ReturnNotice = 'sent' | 'unsent' | 'denied' | 'failed'
const NOTICE_KEY = 'ouch:autobackup-notice'

/** Called at start: if the address says the person is back from Dropbox, finishes
 * the link, sends a first copy, and remembers how it went for the card to say. */
export async function handleProviderReturn(): Promise<ReturnNotice | null> {
  const back = readDropboxReturn(location.search)
  if (!back) return null
  cleanReturnAddress()
  let notice: ReturnNotice
  if ('denied' in back) {
    forgetPendingDropboxLink()
    notice = 'denied'
  } else if (!(await finishDropboxLink(back.code, back.state))) {
    notice = 'failed'
  } else {
    await updateSettings({ autoBackup: { provider: 'dropbox' } })
    notice = (await backupNow())?.ok ? 'sent' : 'unsent'
  }
  if (notice === 'denied' || notice === 'failed') await clearBackupKey().catch(() => undefined)
  try {
    sessionStorage.setItem(NOTICE_KEY, notice)
  } catch {
    // The card will not say it; the settings show the result anyway.
  }
  return notice
}

/** The notice left by `handleProviderReturn`. Read without removing it (a
 * render can happen twice); `clearReturnNotice` removes it once it was said. */
export function peekReturnNotice(): ReturnNotice | null {
  try {
    const v = sessionStorage.getItem(NOTICE_KEY)
    return v === 'sent' || v === 'unsent' || v === 'denied' || v === 'failed' ? v : null
  } catch {
    return null
  }
}

export function clearReturnNotice(): void {
  try {
    sessionStorage.removeItem(NOTICE_KEY)
  } catch {
    // Nothing to remove.
  }
}

/** Stops sending copies. The ones already there stay where they are. */
export async function stopAutoBackup(): Promise<void> {
  const state = (await getSettings()).autoBackup
  if (state?.provider === 'dropbox') await unlinkDropbox()
  await clearBackupKey()
  await updateSettings({ autoBackup: undefined })
}

/** When the journal last changed (ms), or undefined while it is empty. `updatedAt`
 * has no index (the journal is small: a scan, as the backup reminder does). */
export async function latestChangeAt(): Promise<number | undefined> {
  let latest: number | undefined
  const see = (e: { updatedAt: number }) => {
    if (latest === undefined || e.updatedAt > latest) latest = e.updatedAt
  }
  await db.entries.each(see)
  await db.medications.each(see)
  return latest
}
