// What a place to keep copies has to do, whichever it is (Dropbox, Google
// Drive, a WebDAV server). The backup logic (`autoBackup.ts`) only knows this
// shape, so a provider is a few small calls and the rest is tested once.

export type ProviderId = 'dropbox' | 'drive' | 'webdav'

export interface RemoteCopy {
  /** Unique within the provider, and what `download` and `remove` take. */
  name: string
  /** Bytes, as the provider reports them. */
  size: number
  /** ISO date-time, as the provider reports it. */
  modifiedAt: string
}

export interface BackupProvider {
  readonly id: ProviderId | 'memory'
  /** Writes `text` under `name`; a name that exists is replaced. */
  upload(name: string, text: string): Promise<void>
  /** Every file in OUCH's own folder, in no particular order. */
  list(): Promise<RemoteCopy[]>
  download(name: string): Promise<string>
  remove(name: string): Promise<void>
}

/** Why a call failed, in the terms the person can act on: `auth` (the link to
 * the provider has to be made again), `network` (no connection, try again
 * later), `quota` (no room left there), `other`. */
export type ProviderFailure = 'auth' | 'network' | 'quota' | 'other'

export class ProviderError extends Error {
  readonly kind: ProviderFailure
  constructor(kind: ProviderFailure, message?: string) {
    super(message ?? kind)
    this.name = 'ProviderError'
    this.kind = kind
  }
}

export function failureOf(error: unknown): ProviderFailure {
  return error instanceof ProviderError ? error.kind : 'other'
}
