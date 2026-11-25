import type { IDBPDatabase } from "idb";
import { openDB } from "idb";

const DB_NAME_PREFIX = "souma";
const dbPromises = new Map<string, Promise<IDBPDatabase>>();

function stripTableField<T>(item: T): Omit<T, "table"> {
  if (item && typeof item === "object" && "table" in item) {
    const { table: _table, ...meta } = item as T & { table?: unknown };
    return meta;
  }
  return item;
}

async function getDB(storeName: string, hasMetadataStore = false) {
  const dbName = `${DB_NAME_PREFIX}-${storeName}`;
  const metaStoreName = `${storeName}_meta`;
  const targetVersion = hasMetadataStore ? 4 : 3;
  let promise = dbPromises.get(dbName);
  if (!promise) {
    promise = openDB(dbName, targetVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "key" });
        }
        if (hasMetadataStore && !db.objectStoreNames.contains(metaStoreName)) {
          db.createObjectStore(metaStoreName, { keyPath: "key" });
        }
      },
      blocked() {
        console.warn("IndexedDB 升级被阻塞，请关闭其他标签页。");
      },
      blocking() {
        console.warn("当前页面正在阻塞其他标签页的 IndexedDB 升级。");
      },
      terminated() {
        dbPromises.delete(dbName);
      },
    });
    dbPromises.set(dbName, promise);

    // 处理版本变更导致的关闭
    promise
      .then((db) => {
        db.onversionchange = () => {
          db.close();
          dbPromises.delete(dbName);
        };
      })
      .catch(() => {
        dbPromises.delete(dbName);
      });
  }
  return promise;
}

export function useIndexedDB<T extends { key: string }>(
  storeName: string,
  options?: { hasMetadataStore?: boolean },
) {
  const hasMetadataStore = Boolean(options?.hasMetadataStore);
  const metaStoreName = `${storeName}_meta`;

  const withDB = async <R>(fn: (db: IDBPDatabase) => Promise<R>): Promise<R> => {
    let db = await getDB(storeName, hasMetadataStore);
    try {
      return await fn(db);
    } catch (e: any) {
      // 如果错误是连接关闭，清除缓存并重试一次
      if (
        e.name === "InvalidStateError" ||
        e.message?.includes("closing") ||
        e.message?.includes("closed")
      ) {
        console.warn("检测到 IndexedDB 连接已关闭，正在尝试重连...");
        dbPromises.delete(`${DB_NAME_PREFIX}-${storeName}`);
        db = await getDB(storeName, hasMetadataStore);
        return await fn(db);
      }
      throw e;
    }
  };

  return {
    getAll: () => withDB((db) => db.getAll(storeName)),
    getAllMetadata: () =>
      withDB(async (db) => {
        if (hasMetadataStore && db.objectStoreNames.contains(metaStoreName)) {
          const metaList = await db.getAll(metaStoreName);
          if (metaList.length > 0) return metaList;

          // 首次升级迁移：若旧主表已有数据但元数据表为空，则回填一次元数据表
          const total = await db.count(storeName);
          if (total === 0) return [];
          const tx = db.transaction([storeName, metaStoreName], "readwrite");
          const store = tx.objectStore(storeName);
          const metaStore = tx.objectStore(metaStoreName);
          const result: any[] = [];
          let cursor = await store.openCursor();
          while (cursor) {
            const meta = stripTableField(cursor.value);
            result.push(meta);
            void metaStore.put(meta);
            cursor = await cursor.continue();
          }
          await tx.done;
          return result;
        }

        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const result: any[] = [];
        let cursor = await store.openCursor();
        while (cursor) {
          result.push(stripTableField(cursor.value));
          cursor = await cursor.continue();
        }
        return result;
      }),
    get: (key: string) => withDB((db) => db.get(storeName, key)),
    set: (item: T) =>
      withDB(async (db) => {
        if (hasMetadataStore && db.objectStoreNames.contains(metaStoreName)) {
          const tx = db.transaction([storeName, metaStoreName], "readwrite");
          void tx.objectStore(storeName).put(item);
          void tx.objectStore(metaStoreName).put(stripTableField(item));
          await tx.done;
          return;
        }
        await db.put(storeName, item);
      }),
    bulkSet: (items: T[]) =>
      withDB(async (db) => {
        if (hasMetadataStore && db.objectStoreNames.contains(metaStoreName)) {
          const tx = db.transaction([storeName, metaStoreName], "readwrite");
          const store = tx.objectStore(storeName);
          const metaStore = tx.objectStore(metaStoreName);
          for (const item of items) {
            void store.put(item);
            void metaStore.put(stripTableField(item));
          }
          await tx.done;
          return;
        }
        const tx = db.transaction(storeName, "readwrite");
        for (const item of items) void tx.store.put(item);
        await tx.done;
      }),
    replaceAll: (items: T[]) =>
      withDB(async (db) => {
        if (hasMetadataStore && db.objectStoreNames.contains(metaStoreName)) {
          const tx = db.transaction([storeName, metaStoreName], "readwrite");
          const store = tx.objectStore(storeName);
          const metaStore = tx.objectStore(metaStoreName);
          void store.clear();
          void metaStore.clear();
          for (const item of items) {
            void store.put(item);
            void metaStore.put(stripTableField(item));
          }
          await tx.done;
          return;
        }
        const tx = db.transaction(storeName, "readwrite");
        void tx.store.clear();
        for (const item of items) void tx.store.put(item);
        await tx.done;
      }),
    remove: (key: string) =>
      withDB(async (db) => {
        if (hasMetadataStore && db.objectStoreNames.contains(metaStoreName)) {
          const tx = db.transaction([storeName, metaStoreName], "readwrite");
          void tx.objectStore(storeName).delete(key);
          void tx.objectStore(metaStoreName).delete(key);
          await tx.done;
          return;
        }
        await db.delete(storeName, key);
      }),
    clear: () =>
      withDB(async (db) => {
        if (hasMetadataStore && db.objectStoreNames.contains(metaStoreName)) {
          const tx = db.transaction([storeName, metaStoreName], "readwrite");
          void tx.objectStore(storeName).clear();
          void tx.objectStore(metaStoreName).clear();
          await tx.done;
          return;
        }
        await db.clear(storeName);
      }),
  };
}
