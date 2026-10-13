// A provider that keeps its files in memory, with failures that can be asked
// for. It is what the tests run against, and what the interface can be tried
// with before a real provider is linked.

import { ProviderError, type BackupProvider, type ProviderFailure, type RemoteCopy } from './provider.ts'

export interface MemoryProvider extends BackupProvider {
  readonly id: 'memory'
  /** The files, by name. */
  readonly files: Map<string, { text: string; modifiedAt: string }>
  /** Every call fails with this until it is set back to null. */
  failWith: ProviderFailure | null
  /** What `download` returns for a name, instead of what was uploaded. */
  alterOnDownload: ((name: string, text: string) => string) | null
  /** The clock for `modifiedAt`. */
  now: () => Date
}

export function memoryProvider(now: () => Date = () => new Date()): MemoryProvider {
  const files = new Map<string, { text: string; modifiedAt: string }>()
  const provider: MemoryProvider = {
    id: 'memory',
    files,
    failWith: null,
    alterOnDownload: null,
    now,
    async upload(name, text) {
      if (provider.failWith) throw new ProviderError(provider.failWith)
      files.set(name, { text, modifiedAt: provider.now().toISOString() })
    },
    async list() {
      if (provider.failWith) throw new ProviderError(provider.failWith)
      const copies: RemoteCopy[] = []
      for (const [name, f] of files) {
        copies.push({ name, size: new TextEncoder().encode(f.text).length, modifiedAt: f.modifiedAt })
      }
      return copies
    },
    async download(name) {
      if (provider.failWith) throw new ProviderError(provider.failWith)
      const f = files.get(name)
      if (!f) throw new ProviderError('other', `missing: ${name}`)
      return provider.alterOnDownload ? provider.alterOnDownload(name, f.text) : f.text
    },
    async remove(name) {
      if (provider.failWith) throw new ProviderError(provider.failWith)
      files.delete(name)
    },
  }
  return provider
}
