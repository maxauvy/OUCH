// The address and the app password of the person's WebDAV server, kept on this
// device. They open OUCH's own folder there, which holds files nobody can read
// without the backup password. Like the Dropbox tokens, they live in their own
// IndexedDB database, apart from the journal and from the backup key.

import { ProviderError } from './provider.ts'
import { normalizeUrl, type WebdavConfig } from './webdavProvider.ts'

const DB_NAME = 'ouch-webdav'
const STORE = 'config'
const ID = 'main'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = work(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

function isConfig(v: unknown): v is WebdavConfig {
  const c = v as Partial<WebdavConfig> | undefined
  return !!c && typeof c.url === 'string' && typeof c.user === 'string' && typeof c.password === 'string'
}

export async function saveWebdavConfig(config: WebdavConfig): Promise<void> {
  await run('readwrite', (s) => s.put({ ...config, url: normalizeUrl(config.url), user: config.user.trim() }, ID))
}

/** The kept address and credentials. Throws `ProviderError('auth')` when there are none (the link is to be made again). */
export async function getWebdavConfig(): Promise<WebdavConfig> {
  try {
    const found = await run<unknown>('readonly', (s) => s.get(ID))
    if (isConfig(found)) return found
  } catch {
    // Treated as none.
  }
  throw new ProviderError('auth')
}

export async function clearWebdavConfig(): Promise<void> {
  await run('readwrite', (s) => s.delete(ID)).catch(() => undefined)
}
