import type { IDBPDatabase } from 'idb'
import { openDB } from 'idb'

let dbPromise: Promise<IDBPDatabase> | null = null

export function useIndexedDB<T extends { key: string }>(
  dbName: string = 'app-db',
  storeName: string = 'data',
) {
  async function getDB(): Promise<IDBPDatabase> {
    if (!dbPromise) {
      dbPromise = openDB(dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'key' })
          }
        },
      })
    }
    return dbPromise
  }

  return {
    async getAll(): Promise<T[]> {
      const db = await getDB()
      return db.getAll(storeName)
    },

    async get(key: string): Promise<T | undefined> {
      const db = await getDB()
      return db.get(storeName, key)
    },

    async set(item: T): Promise<IDBValidKey> {
      const db = await getDB()
      return db.put(storeName, item)
    },

    async bulkSet(items: T[]): Promise<void> {
      const db = await getDB()
      const tx = db.transaction(storeName, 'readwrite')
      items.forEach(item => tx.store.put(item))
      await tx.done
    },

    async remove(key: string): Promise<void> {
      const db = await getDB()
      await db.delete(storeName, key)
    },

    async clear(): Promise<void> {
      const db = await getDB()
      await db.clear(storeName)
    },
  }
}
