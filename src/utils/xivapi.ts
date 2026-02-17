import { ROLE_ACTION_CATEGORY_BY_JOB } from '@/resources/roleActionCategoryByJob'

const params = new URLSearchParams(window.location.search)
const apiParam = params.get('api')?.toLowerCase()

const SITE_LIST = {
  cafe: 'cafemaker.wakingsands.com',
  xivapi: 'xivapi.com',
} as const

class SiteManager {
  private hosts: string[]
  private currentIndex: number = 0

  constructor(primary: 'xivapi' | 'cafe') {
    if (primary === 'xivapi') {
      this.hosts = [SITE_LIST.xivapi, SITE_LIST.cafe]
    }
    else {
      this.hosts = [SITE_LIST.cafe, SITE_LIST.xivapi]
    }
  }

  get primaryHost() {
    return this.hosts[this.currentIndex]!
  }

  get secondaryHost() {
    return this.hosts[1 - this.currentIndex]!
  }

  get primaryUrl() {
    return `https://${this.primaryHost}`
  }

  get secondaryUrl() {
    return `https://${this.secondaryHost}`
  }

  switch() {
    console.warn(`Primary site ${this.primaryHost} failed, switching to ${this.secondaryHost}`)
    this.currentIndex = 1 - this.currentIndex
  }

  isSecondary(url: string) {
    return url.includes(this.secondaryHost)
  }
}

export const siteManager = new SiteManager(apiParam === 'xivapi' ? 'xivapi' : 'cafe')

// 兼容旧代码的导出
export const site = {
  get first() { return siteManager.primaryUrl },
  set first(_v) { /* ignore */ },
  get second() { return siteManager.secondaryUrl },
  set second(_v) { /* ignore */ },
}

export const hostCache = new Map<number, any>()
const imgCache = new Map<string, string>()
const actionSearchByJobCache = new Map<string, XivApiActionSearchItem[]>()
const ACTION_SEARCH_CACHE_VERSION = 'action_search_by_jobs_v2'

const ICON_REGEX = /(\d{6})\/(\d{6})\.png$/
const DEFAULT_ICON = '/i/000000/000405.png'

export interface XivApiActionSearchItem {
  ID: number
  Name: string
  Icon: string
  ClassJobLevel: number
  ClassJobTargetID: number
  ActionCategoryTargetID?: number
  IsRoleAction?: number
  IsPvP?: number
  Recast100ms?: number
  Recast1000ms?: number
  Host?: string
}

function getRoleActionCategories(jobIds: number[]) {
  const set = new Set<number>()
  jobIds.forEach((jobId) => {
    const categories = ROLE_ACTION_CATEGORY_BY_JOB[jobId]
    if (!categories)
      return
    categories.forEach(v => set.add(v))
  })
  return [...set].sort((a, b) => a - b)
}

/**
 * 解析技能/物品等数据
 */
export async function parseAction(
  type: string,
  actionId: number,
  columns: (keyof XivApiJson)[] = ['ID', 'Icon', 'ActionCategoryTargetID'],
): Promise<any> {
  if (hostCache.has(actionId)) {
    return hostCache.get(actionId)
  }

  const columnStr = columns.join(',')
  const urls = [
    `${siteManager.primaryUrl}/${type}/${actionId}?columns=${columnStr}`,
    `${siteManager.secondaryUrl}/${type}/${actionId}?columns=${columnStr}`,
  ]

  try {
    const result = await requestWithFallback(urls)
    hostCache.set(actionId, result)
    return result
  }
  catch (error) {
    console.error(`Failed to parse action ${actionId}:`, error)
    return {
      ActionCategoryTargetID: 0,
      ID: actionId,
      Icon: DEFAULT_ICON,
    }
  }
}

/**
 * 获取完整的图片链接
 */
export function getFullImgSrc(icon: string, itemIsHQ = false, host?: string) {
  const baseUrl = host ? `https://${host}` : siteManager.primaryUrl
  return `${baseUrl}${icon}`.replace(
    ICON_REGEX,
    (_match, p1, p2) => `${p1}/${itemIsHQ ? 'hq/' : ''}${p2}.png`,
  )
}

/**
 * 根据 Action ID 直接获取图片链接
 */
export async function getImgSrcByActionId(id: number): Promise<string> {
  const res = await parseAction('action', id, ['Icon'])
  return getFullImgSrc(res.Icon, false, res.Host)
}

export async function searchActionsByClassJobs(jobIds: number[], limit = 500): Promise<XivApiActionSearchItem[]> {
  const normalized = Array.from(
    new Set(
      jobIds
        .map(v => Number(v))
        .filter(v => Number.isFinite(v) && v > 0)
        .map(v => Math.trunc(v)),
    ),
  ).sort((a, b) => a - b)

  if (!normalized.length)
    return []

  const cacheKey = `${ACTION_SEARCH_CACHE_VERSION}|${normalized.join(',')}|${limit}`
  if (actionSearchByJobCache.has(cacheKey))
    return [...actionSearchByJobCache.get(cacheKey)!]

  const merged = new Map<number, XivApiActionSearchItem>()
  const pageLimit = 100

  for (const jobId of normalized) {
    let page = 1
    while (merged.size < limit) {
      const query = new URLSearchParams({
        indexes: 'Action',
        columns: 'ID,Name,Icon,ClassJobLevel,ClassJobTargetID,ActionCategoryTargetID,IsRoleAction,IsPvP,Recast100ms',
        filters: `ClassJobTargetID=${jobId},IsPvP=0`,
        sort_field: 'ClassJobLevel',
        sort_order: 'asc',
        limit: String(pageLimit),
        page: String(page),
      })

      const urls = [
        `${siteManager.primaryUrl}/search?${query.toString()}`,
        `${siteManager.secondaryUrl}/search?${query.toString()}`,
      ]

      const result = await requestWithFallback(urls)
      const rows = Array.isArray(result?.Results) ? result.Results as XivApiActionSearchItem[] : []
      rows.forEach((row) => {
        if (!row || !Number.isFinite(Number(row.ID)))
          return
        const isPvP = Number(row.IsPvP ?? 0)
        if (isPvP > 0)
          return
        const actionCategoryTargetId = Number(row.ActionCategoryTargetID ?? 0)
        const recast100ms = Number(row.Recast100ms ?? 0)
        if (!Number.isFinite(recast100ms) || recast100ms <= 0)
          return
        const recast1000ms = recast100ms / 10

        const actionId = Math.trunc(Number(row.ID))
        if (actionId <= 0)
          return
        merged.set(actionId, {
          ID: actionId,
          Name: row.Name ?? `#${actionId}`,
          Icon: row.Icon ?? DEFAULT_ICON,
          ClassJobLevel: Number(row.ClassJobLevel ?? 1),
          ClassJobTargetID: Number(row.ClassJobTargetID ?? 0),
          ActionCategoryTargetID: actionCategoryTargetId,
          IsRoleAction: Number(row.IsRoleAction ?? 0),
          IsPvP: isPvP,
          Recast100ms: recast100ms,
          Recast1000ms: recast1000ms,
          Host: row.Host,
        })
      })

      const pageTotal = Number(result?.Pagination?.PageTotal ?? page)
      if (page >= pageTotal)
        break
      page += 1
    }
  }

  // Merge role actions for the queried jobs.
  const roleCategories = getRoleActionCategories(normalized)
  for (const categoryId of roleCategories) {
    let page = 1
    while (merged.size < limit) {
      const query = new URLSearchParams({
        indexes: 'Action',
        columns: 'ID,Name,Icon,ClassJobLevel,ClassJobTargetID,ClassJobCategoryTargetID,ActionCategoryTargetID,IsPvP,IsRoleAction,Recast100ms',
        filters: `IsRoleAction=1,IsPvP=0,ClassJobCategoryTargetID=${categoryId}`,
        sort_field: 'ClassJobLevel',
        sort_order: 'asc',
        limit: String(pageLimit),
        page: String(page),
      })

      const urls = [
        `${siteManager.primaryUrl}/search?${query.toString()}`,
        `${siteManager.secondaryUrl}/search?${query.toString()}`,
      ]

      const result = await requestWithFallback(urls)
      const rows = Array.isArray(result?.Results) ? result.Results as XivApiActionSearchItem[] : []
      rows.forEach((row) => {
        if (!row || !Number.isFinite(Number(row.ID)))
          return
        const isPvP = Number(row.IsPvP ?? 0)
        if (isPvP > 0)
          return
        const recast100ms = Number(row.Recast100ms ?? 0)
        if (!Number.isFinite(recast100ms) || recast100ms <= 0)
          return
        const recast1000ms = recast100ms / 10

        const actionId = Math.trunc(Number(row.ID))
        if (actionId <= 0)
          return
        merged.set(actionId, {
          ID: actionId,
          Name: row.Name ?? `#${actionId}`,
          Icon: row.Icon ?? DEFAULT_ICON,
          ClassJobLevel: Number(row.ClassJobLevel ?? 1),
          ClassJobTargetID: Number(row.ClassJobTargetID ?? 0),
          ActionCategoryTargetID: Number(row.ActionCategoryTargetID ?? 0),
          IsRoleAction: Number(row.IsRoleAction ?? 0),
          IsPvP: isPvP,
          Recast100ms: recast100ms,
          Recast1000ms: recast1000ms,
          Host: row.Host,
        })
      })

      const pageTotal = Number(result?.Pagination?.PageTotal ?? page)
      if (page >= pageTotal)
        break
      page += 1
    }
  }

  const sorted = [...merged.values()].sort((a, b) => {
    if (a.ClassJobLevel === b.ClassJobLevel)
      return a.ID - b.ID
    return a.ClassJobLevel - b.ClassJobLevel
  })

  const list = sorted.slice(0, limit)

  actionSearchByJobCache.set(cacheKey, list)
  return [...list]
}

/**
 * 获取普通图片链接（带缓存）
 */
export function getImgSrc(src: string): string {
  if (imgCache.has(src)) {
    return imgCache.get(src)!
  }
  return `${siteManager.primaryUrl}${src}`
}

/**
 * 处理图片加载错误，尝试切换镜像站
 */
export function handleImgError(event: Event) {
  const target = event.target as HTMLImageElement
  if (!target.src)
    return

  const url = new URL(target.src)
  const path = url.pathname

  if (target.src.includes('pictomancer.png')) {
    target.src = '//souma.diemoe.net/resources/img/pictomancer.png'
  }
  else if (target.src.includes('viper.png')) {
    target.src = '//souma.diemoe.net/resources/img/viper.png'
  }
  else if (url.host === siteManager.primaryHost) {
    target.src = `${siteManager.secondaryUrl}${path}`
  }
  else {
    target.src = ''
  }

  imgCache.set(path, target.src)
}

/**
 * 带超时的 fetch
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 3000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  }
  finally {
    clearTimeout(id)
  }
}

/**
 * 带有站点回退机制的请求
 */
async function requestWithFallback(urls: string[], options: RequestInit = {}): Promise<any> {
  const mergedOptions: RequestInit = {
    cache: 'force-cache',
    mode: 'cors',
    ...options,
  }

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, mergedOptions)
      if (response.ok) {
        if (siteManager.isSecondary(url)) {
          siteManager.switch()
        }
        const json = await response.json()
        return { ...json, Host: new URL(url).host }
      }
      console.warn(`Fetch failed for ${url}: status ${response.status}`)
    }
    catch (e) {
      console.warn(`Fetch failed for ${url}:`, e)
    }
  }
  throw new Error('All fetch attempts failed.')
}
