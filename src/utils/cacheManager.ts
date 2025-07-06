interface CacheEntry<T> {
  data: T
  expire: number
}

interface CacheManagerOptions {
  prefix?: string
  maxSize?: number // in bytes
  cleanupRatio?: number // 0.0 ~ 1.0
}

export class CacheManager {
  private prefix: string
  private maxSize: number
  private cleanupRatio: number

  constructor(options?: CacheManagerOptions) {
    this.prefix = options?.prefix ?? 'cache:'
    this.maxSize = options?.maxSize ?? 2 * 1024 * 1024 // 2MB
    this.cleanupRatio = options?.cleanupRatio ?? 0.25
  }

  private buildKey(key: string): string {
    return this.prefix + key
  }

  private getAllCacheKeys(): string[] {
    return Object.keys(localStorage).filter(k => k.startsWith(this.prefix))
  }

  private getTotalSize(): number {
    return this.getAllCacheKeys().reduce((sum, key) => {
      const val = localStorage.getItem(key)
      return sum + (val ? new Blob([val]).size : 0)
    }, 0)
  }

  private cleanupOldEntries() {
    const entries: { key: string, expire: number }[] = []

    for (const key of this.getAllCacheKeys()) {
      try {
        const raw = localStorage.getItem(key)
        if (!raw)
          continue
        const parsed = JSON.parse(raw)
        entries.push({ key, expire: parsed.expire ?? 0 })
      }
      catch {
        localStorage.removeItem(key)
      }
    }

    entries.sort((a, b) => a.expire - b.expire)
    const count = Math.ceil(entries.length * this.cleanupRatio)
    for (let i = 0; i < count; i++) {
      localStorage.removeItem(entries[i].key)
    }
  }

  public set<T>(key: string, data: T, ttl = 3600_000): void {
    const fullKey = this.buildKey(key)
    const payload: CacheEntry<T> = {
      data,
      expire: Date.now() + ttl,
    }

    try {
      localStorage.setItem(fullKey, JSON.stringify(payload))
    }
    catch {
      this.cleanupOldEntries()
      try {
        localStorage.setItem(fullKey, JSON.stringify(payload))
      }
      catch (e) {
        console.warn(`[CacheManager] Failed to save cache "${fullKey}" after cleanup`, e)
      }
    }

    if (this.getTotalSize() > this.maxSize) {
      this.cleanupOldEntries()
    }
  }

  public get<T>(key: string): T | null {
    const fullKey = this.buildKey(key)
    try {
      const raw = localStorage.getItem(fullKey)
      if (!raw)
        return null
      const parsed: CacheEntry<T> = JSON.parse(raw)
      if (parsed.expire < Date.now()) {
        localStorage.removeItem(fullKey)
        return null
      }
      return parsed.data
    }
    catch {
      localStorage.removeItem(fullKey)
      return null
    }
  }

  public clearExpired(): void {
    const now = Date.now()
    for (const key of this.getAllCacheKeys()) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key)!)
        if (!parsed.expire || parsed.expire < now) {
          localStorage.removeItem(key)
        }
      }
      catch {
        localStorage.removeItem(key)
      }
    }
  }

  public clearAll(): void {
    for (const key of this.getAllCacheKeys()) {
      localStorage.removeItem(key)
    }
  }
}
