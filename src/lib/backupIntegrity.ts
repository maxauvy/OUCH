// Is a copy that went to a provider the copy that was meant to go? Two checks,
// neither needing the password (the device keeps the key, see `BackupKey`):
// what came back is byte for byte what was sent (SHA-256), and it still opens
// (AES-GCM authenticates the content: a wrong byte anywhere fails it).

import { decryptJSONWithKey, sha256Hex, type BackupKey } from './crypto.ts'

/** Whether `received`, read back from the provider, is exactly `sentSha256`'s text. */
export async function matchesSent(sentSha256: string, received: string): Promise<boolean> {
  return (await sha256Hex(received)) === sentSha256
}

/** The first characters of a hash: enough to compare two copies by eye. */
export function shortFingerprint(sha256: string): string {
  return sha256.slice(0, 8)
}

type CopyCheck =
  | { ok: true; exportedAt?: string; entries?: number }
  | { ok: false; reason: 'format' | 'otherKey' | 'corrupt' }

/** Opens a copy with the kept key and says what is in it, never the content itself. */
export async function checkCopyOpens(text: string, backupKey: BackupKey): Promise<CopyCheck> {
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'format' }
  }
  const opened = await decryptJSONWithKey<{ exportedAt?: unknown; entries?: unknown }>(payload, backupKey)
  if (!opened.ok) return opened
  const { exportedAt, entries } = opened.data ?? {}
  return {
    ok: true,
    exportedAt: typeof exportedAt === 'string' ? exportedAt : undefined,
    entries: Array.isArray(entries) ? entries.length : undefined,
  }
}
