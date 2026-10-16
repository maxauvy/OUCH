// Automatic backup, without the screen or the provider: when a copy is due,
// how it is made, sent, checked and how many are kept. The copy itself
// (`makeCopy`) and the place it goes (`provider`) are handed in, so all of it
// runs in the tests with nothing real behind it.

import type { BackupKey } from './crypto.ts'
import { checkCopyOpens, matchesSent } from './backupIntegrity.ts'
import { failureOf, type BackupProvider, type ProviderFailure, type RemoteCopy } from './cloud/provider.ts'

/** How many copies stay at the provider: the latest, and two before it, so a
 * bad copy never replaces the only good one. */
export const COPIES_KEPT = 3

/** Copies are sent at most this often (ms), however often the journal changes. */
export const MIN_GAP_MS = 15 * 60 * 1000

const NAME = /^ouch-(\d{8})-(\d{6})\.json$/

/** `ouch-20261013-081205.json`, in UTC: the names sort in time order. */
export function copyName(at: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return (
    `ouch-${at.getUTCFullYear()}${p(at.getUTCMonth() + 1)}${p(at.getUTCDate())}` +
    `-${p(at.getUTCHours())}${p(at.getUTCMinutes())}${p(at.getUTCSeconds())}.json`
  )
}

/** The moment a copy name stands for, or null for a file that is not ours. */
export function copyNameDate(name: string): Date | null {
  const m = NAME.exec(name)
  if (!m) return null
  const [d, t] = [m[1]!, m[2]!]
  const date = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +t.slice(0, 2), +t.slice(2, 4), +t.slice(4, 6)))
  return Number.isNaN(date.getTime()) ? null : date
}

/** A copy is due when something changed since the last good one, and the last
 * attempt was not just now. Never when there is nothing to protect. */
export function isBackupDue(state: {
  /** When the last copy was sent and checked (ms), if any. */
  lastCopyAt?: number
  /** When the journal last changed (ms), if it holds anything. */
  latestChangeAt?: number
  /** When a copy was last tried, whether or not it worked (ms). */
  lastAttemptAt?: number
  now: number
}): boolean {
  if (state.latestChangeAt === undefined) return false
  if (state.lastCopyAt !== undefined && state.latestChangeAt <= state.lastCopyAt) return false
  if (state.lastAttemptAt !== undefined && state.now - state.lastAttemptAt < MIN_GAP_MS) return false
  return true
}

interface SentCopy {
  name: string
  bytes: number
  sha256: string
  /** When it was sent (ms). */
  at: number
}

export type BackupOutcome =
  | { ok: true; copy: SentCopy }
  /** `mismatch`: what came back was not what was sent. `unreadable`: it came
   * back identical but does not open with the key. In both cases the bad file
   * is removed and the older copies are left alone. */
  | { ok: false; reason: ProviderFailure | 'mismatch' | 'unreadable'; /** What the provider said, for finding out what went wrong. */ detail?: string }

/**
 * Makes a copy, sends it, reads it back and checks it, then drops the copies
 * beyond `COPIES_KEPT`. The check is the point: a copy is only reported as
 * good if what the provider holds is, to the byte, what was sent, and opens.
 */
export async function runBackup(args: {
  provider: BackupProvider
  backupKey: BackupKey
  makeCopy: (key: BackupKey) => Promise<{ text: string; bytes: number; sha256: string }>
  now?: () => Date
  keep?: number
}): Promise<BackupOutcome> {
  const { provider, backupKey, makeCopy } = args
  const now = args.now ?? (() => new Date())
  const keep = args.keep ?? COPIES_KEPT
  const at = now()
  const name = copyName(at)

  try {
    const copy = await makeCopy(backupKey)
    await provider.upload(name, copy.text)

    const received = await provider.download(name)
    if (!(await matchesSent(copy.sha256, received))) {
      await discard(provider, name)
      return { ok: false, reason: 'mismatch' }
    }
    if (!(await checkCopyOpens(received, backupKey)).ok) {
      await discard(provider, name)
      return { ok: false, reason: 'unreadable' }
    }

    await prune(provider, name, keep)
    return { ok: true, copy: { name, bytes: copy.bytes, sha256: copy.sha256, at: at.getTime() } }
  } catch (error) {
    const reason = failureOf(error)
    // A message that only repeats the kind says nothing more.
    const detail = error instanceof Error && error.message !== reason ? error.message : undefined
    return detail ? { ok: false, reason, detail } : { ok: false, reason }
  }
}

/** Removes a bad file; if that fails too, the outcome is still the original one. */
async function discard(provider: BackupProvider, name: string): Promise<void> {
  try {
    await provider.remove(name)
  } catch {
    // Left behind, and the next successful run's pruning takes it.
  }
}

/** Removes our own copies beyond the `keep` newest, never `latest`. Files that
 * are not named like ours are never touched. A failure here is not the
 * backup's failure: the copy is already safe. */
async function prune(provider: BackupProvider, latest: string, keep: number): Promise<void> {
  try {
    const ours = (await provider.list())
      .filter((c) => copyNameDate(c.name) !== null)
      .sort((a, b) => b.name.localeCompare(a.name))
    for (const old of ours.slice(keep)) {
      if (old.name !== latest) await provider.remove(old.name)
    }
  } catch {
    // The next run prunes again.
  }
}

export interface ListedCopy extends RemoteCopy {
  /** The moment in the name (UTC); the provider's own date can differ. */
  at: Date
}

/** The copies a person can restore, newest first. */
export async function listCopies(provider: BackupProvider): Promise<ListedCopy[]> {
  const listed: ListedCopy[] = []
  for (const c of await provider.list()) {
    const at = copyNameDate(c.name)
    if (at) listed.push({ ...c, at })
  }
  return listed.sort((a, b) => b.at.getTime() - a.at.getTime())
}

/** A copy as a file, for the restore that already exists (`importEncryptedBackup`). */
export async function copyAsFile(provider: BackupProvider, name: string): Promise<File> {
  return new File([await provider.download(name)], name, { type: 'application/json' })
}
