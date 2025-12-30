import type { IDBPDatabase } from 'idb'
import { openDB } from 'idb'

const DB_NAME_PREFIX = 'souma'
const dbPromises = new Map<string, Promise<IDBPDatabase>>()

async function getDB(storeName: string) {
  const dbName = `${DB_NAME_PREFIX}-${storeName}`
  let promise = dbPromises.get(dbName)
  if (!promise) {
    promise = openDB(dbName, 3, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'key' })
        }
      },
      blocked() {
        console.warn('IndexedDB 升级被阻塞，请关闭其他标签页。')
      },
      blocking() {
        console.warn('当前页面正在阻塞其他标签页的 IndexedDB 升级。')
      },
      terminated() {
        dbPromises.delete(dbName)
      },
    })
    dbPromises.set(dbName, promise)

    // 处理版本变更导致的关闭
    promise.then(db => {
      db.onversionchange = () => {
        db.close()
        dbPromises.delete(dbName)
      }
    }).catch(() => {
      dbPromises.delete(dbName)
    })
  }
  return promise
}

export function useIndexedDB<T extends { key: string }>(storeName: string) {
  const withDB = async <R>(fn: (db: IDBPDatabase) => Promise<R>): Promise<R> => {
    let db = await getDB(storeName)
    try {
      return await fn(db)
    } catch (e: any) {
      // 如果错误是连接关闭，清除缓存并重试一次
      if (e.name === 'InvalidStateError' || e.message?.includes('closing') || e.message?.includes('closed')) {
        console.warn('检测到 IndexedDB 连接已关闭，正在尝试重连...')
        dbPromises.delete(`${DB_NAME_PREFIX}-${storeName}`)
        db = await getDB(storeName)
        return await fn(db)
      }
      throw e
    }
  }

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
    replaceAll: (items: T[]) =>
      withDB(async (db) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.store.clear()
        for (const item of items) tx.store.put(item)
        await tx.done
      }),
    remove: (key: string) => withDB((db) => db.delete(storeName, key)),
    clear: () => withDB((db) => db.clear(storeName)),
  }
}
