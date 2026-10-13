// Where the device keeps the backup key (`BackupKey`): its own small
// IndexedDB database, not the journal's, so that the key is never part of a
// backup, an export or a "delete my data" restore by accident. A CryptoKey
// that is not extractable can be stored in IndexedDB as it is: the browser
// holds it, the page can use it but not read it.

import type { BackupKey } from './crypto'

const DB_NAME = 'ouch-backup-key'
const STORE = 'keys'
const ID = 'main'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
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

function isBackupKey(v: unknown): v is BackupKey {
  const k = v as Partial<BackupKey> | undefined
  return !!k && typeof k.salt === 'string' && typeof k.iterations === 'number' && k.key instanceof CryptoKey
}

export async function saveBackupKey(key: BackupKey): Promise<void> {
  await run('readwrite', (s) => s.put(key, ID))
}

/** Null when none was set up, or when the browser dropped it. */
export async function loadBackupKey(): Promise<BackupKey | null> {
  try {
    const found = await run<unknown>('readonly', (s) => s.get(ID))
    return isBackupKey(found) ? found : null
  } catch {
    return null
  }
}

export async function clearBackupKey(): Promise<void> {
  await run('readwrite', (s) => s.delete(ID))
}
