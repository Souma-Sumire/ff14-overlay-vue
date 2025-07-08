interface CacheEntry<T> {
  data: T
  expire: number
}

interface CacheManagerOptions {
  key?: string
  maxSize?: number // in bytes
  cleanupRatio?: number // 0.0 ~ 1.0
}

export class CacheManager {
  private storageKey: string
  private maxSize: number
  private cleanupRatio: number

  constructor(options?: CacheManagerOptions) {
    this.storageKey = options?.key ?? 'cache:all'
    this.maxSize = options?.maxSize ?? 2 * 1024 * 1024 // 2MB
    this.cleanupRatio = options?.cleanupRatio ?? 0.25
  }

  private loadAll(): Record<string, CacheEntry<any>> {
    try {
      const raw = localStorage.getItem(this.storageKey)
      return raw ? JSON.parse(raw) : {}
    }
    catch {
      return {}
    }
  }

  private saveAll(data: Record<string, CacheEntry<any>>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    }
    catch {
      this.cleanupOldEntries(data)
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(data))
      }
      catch (e) {
        console.warn('[CacheManager] Failed to save after cleanup', e)
      }
    }
  }

  private getTotalSize(data: Record<string, CacheEntry<any>>): number {
    return new Blob([JSON.stringify(data)]).size
  }

  private cleanupOldEntries(data: Record<string, CacheEntry<any>>): void {
    const entries = Object.entries(data)
    const sortable = entries.map(([key, value]) => ({
      key,
      expire: value?.expire ?? 0,
    }))

    sortable.sort((a, b) => a.expire - b.expire)
    const count = Math.ceil(entries.length * this.cleanupRatio)
    for (let i = 0; i < count; i++) {
      delete data[sortable[i].key]
    }
  }

  public set<T>(key: string, value: T, ttl = 259_200_000): void {
    const all = this.loadAll()
    all[key] = {
      data: value,
      expire: Date.now() + ttl,
    }

    if (this.getTotalSize(all) > this.maxSize) {
      this.cleanupOldEntries(all)
    }

    this.saveAll(all)
  }

  public get<T>(key: string): T | null {
    const all = this.loadAll()
    const entry = all[key]
    if (!entry)
      return null

    if (entry.expire < Date.now()) {
      delete all[key]
      this.saveAll(all)
      return null
    }

    return entry.data
  }

  public clearExpired(): void {
    const all = this.loadAll()
    const now = Date.now()
    let changed = false

    for (const key in all) {
      if (!all[key].expire || all[key].expire < now) {
        delete all[key]
        changed = true
      }
    }

    if (changed) {
      this.saveAll(all)
    }
  }

  public clearAll(): void {
    localStorage.removeItem(this.storageKey)
  }
}
