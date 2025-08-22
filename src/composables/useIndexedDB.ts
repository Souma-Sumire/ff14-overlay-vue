import type { IDBPDatabase } from 'idb'
import { openDB } from 'idb'

const DB_NAME = 'souma'
let dbPromise: Promise<IDBPDatabase> | null = null

async function getDB(storeName: string) {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

export function useIndexedDB<T extends { key: string }>(storeName: string) {
  const withDB = async <R>(fn: (db: IDBPDatabase) => Promise<R>) =>
    fn(await getDB(storeName))

  return {
    getAll: () => withDB((db) => db.getAll(storeName)),
    get: (key: string) => withDB((db) => db.get(storeName, key)),
    set: (item: T) => withDB((db) => db.put(storeName, item)),
    bulkSet: (items: T[]) =>
      withDB(async (db) => {
        const tx = db.transaction(storeName, 'readwrite')
        for (const item of items) tx.store.put(item)
        await tx.done
      }),
    remove: (key: string) => withDB((db) => db.delete(storeName, key)),
    clear: () => withDB((db) => db.clear(storeName)),
  }
}
