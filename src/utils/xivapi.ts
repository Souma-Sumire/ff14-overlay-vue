import { ROLE_ACTION_CATEGORY_BY_JOB } from '@/resources/roleActionCategoryByJob'
import { completeIcon } from '@/resources/status'

const params = new URLSearchParams(window.location.search)
const apiParam = params.get('api')?.toLowerCase()

const SITE_HOST = {
  cafe: 'cafemaker.wakingsands.com',
  xivapi: 'xivapi.com',
} as const
type SiteName = keyof typeof SITE_HOST

let primarySite: SiteName = apiParam === 'xivapi' ? 'xivapi' : 'cafe'

const ICON_REGEX = /(\d{6})\/(\d{6})\.png$/
const DEFAULT_ICON = '/i/000000/000405.png'
const ACTION_SEARCH_CACHE_VERSION = 'action_search_by_jobs_v2'

const actionCache = new Map<string, Record<string, any>>()
const actionSearchByJobCache = new Map<string, XivApiActionSearchItem[]>()

function getPrimaryHost(): string {
  return SITE_HOST[primarySite]
}

function getSecondaryHost(): string {
  return SITE_HOST[primarySite === 'cafe' ? 'xivapi' : 'cafe']
}

function getPrimaryUrl(): string {
  return `https://${getPrimaryHost()}`
}

function getSecondaryUrl(): string {
  return `https://${getSecondaryHost()}`
}

function buildUrl(host: string): string {
  return `https://${host}`
}

function switchPrimarySite(): void {
  const oldHost = getPrimaryHost()
  primarySite = primarySite === 'cafe' ? 'xivapi' : 'cafe'
  console.warn(`Primary site ${oldHost} failed, switching to ${getPrimaryHost()}`)
}

function isSecondaryUrl(url: string): boolean {
  return url.includes(getSecondaryHost())
}

function getIconHost(highRes: boolean): string {
  if (highRes && getPrimaryHost() !== SITE_HOST.cafe)
    return SITE_HOST.cafe
  return getPrimaryHost()
}

function getIconBaseUrl(highRes = false): string {
  return buildUrl(getIconHost(highRes))
}

function buildFallbackUrls(path: string): string[] {
  return [`${getPrimaryUrl()}${path}`, `${getSecondaryUrl()}${path}`]
}

/**
 * 你手里是图标数字 ID（如 12345）时用这个。
 * 会自动补全为标准图标路径，并按全局站点策略生成 URL。
 */
export function getIconSrcById(iconId: number, highRes = false): string {
  if (!Number.isFinite(iconId) || iconId <= 0)
    return ''
  return getIconSrcByFullIcon(completeIcon(Math.trunc(iconId)), highRes)
}

/**
 * 你手里是完整图标段（如 "000000/000405"）时用这个。
 * 常用于状态图标或已知图标分组路径。
 */
export function getIconSrcByFullIcon(fullIcon: string, highRes = false): string {
  const normalized = fullIcon.trim()
  if (!normalized)
    return ''
  const resolvedHost = getIconHost(highRes)
  const suffix = highRes && resolvedHost === SITE_HOST.cafe ? '_hr1' : ''
  return `${buildUrl(resolvedHost)}/i/${normalized}${suffix}.png`
}

/**
 * 你手里是 API 返回的图标路径（如 "/i/000000/000405.png"）时用这个。
 * 常用于 parseAction / search 返回的 Icon 字段。
 */
export function getIconSrcByPath(iconPath: string, itemIsHQ = false): string {
  if (!iconPath)
    return ''
  if (/^https?:\/\//.test(iconPath))
    return iconPath
  const baseUrl = getIconBaseUrl()
  return `${baseUrl}${iconPath}`.replace(
    ICON_REGEX,
    (_match, p1, p2) => `${p1}/${itemIsHQ ? 'hq/' : ''}${p2}.png`,
  )
}

/**
 * 你只有技能 Action ID，想直接拿图标 URL 时用这个。
 */
export async function getActionIconSrc(id: number): Promise<string> {
  const res = await parseAction('action', id, ['Icon'])
  return getIconSrcByPath(res.Icon)
}

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

function getRoleActionCategories(jobIds: number[]): number[] {
  const set = new Set<number>()
  jobIds.forEach((jobId) => {
    const categories = ROLE_ACTION_CATEGORY_BY_JOB[jobId]
    if (!categories)
      return
    categories.forEach(v => set.add(v))
  })
  return [...set].sort((a, b) => a - b)
}

function getActionCacheKey(type: string, actionId: number): string {
  return `${type}:${Math.trunc(actionId)}`
}

function hasAllColumns(record: Record<string, any>, columns: string[]): boolean {
  return columns.every(col => col === 'ID' || Object.prototype.hasOwnProperty.call(record, col))
}

/**
 * 需要查询单个技能/道具/坐骑等基础数据时用这个。
 * 会自动缓存并在主备站之间回退。
 */
export async function parseAction(
  type: string,
  actionId: number,
  columns: (keyof XivApiJson)[] = ['ID', 'Icon', 'ActionCategoryTargetID'],
): Promise<any> {
  const id = Math.trunc(Number(actionId))
  const key = getActionCacheKey(type, id)
  const requestedColumns = columns.map(col => String(col))
  const cached = actionCache.get(key)
  if (cached && hasAllColumns(cached, requestedColumns))
    return cached

  const path = `/${type}/${id}?columns=${requestedColumns.join(',')}`
  try {
    const result = await requestWithFallback(buildFallbackUrls(path))
    const merged = { ...(cached ?? {}), ...result }
    actionCache.set(key, merged)
    return merged
  }
  catch (error) {
    console.error(`Failed to parse action ${id}:`, error)
    const fallback = {
      ActionCategoryTargetID: 0,
      ID: id,
      Icon: DEFAULT_ICON,
    }
    const merged = { ...(cached ?? {}), ...fallback }
    actionCache.set(key, merged)
    return merged
  }
}

function toActionSearchItem(row: XivApiActionSearchItem): XivApiActionSearchItem | undefined {
  if (!row || !Number.isFinite(Number(row.ID)))
    return
  const isPvP = Number(row.IsPvP ?? 0)
  if (isPvP > 0)
    return
  const recast100ms = Number(row.Recast100ms ?? 0)
  if (!Number.isFinite(recast100ms) || recast100ms <= 0)
    return
  const actionId = Math.trunc(Number(row.ID))
  if (actionId <= 0)
    return
  return {
    ID: actionId,
    Name: row.Name ?? `#${actionId}`,
    Icon: row.Icon ?? DEFAULT_ICON,
    ClassJobLevel: Number(row.ClassJobLevel ?? 1),
    ClassJobTargetID: Number(row.ClassJobTargetID ?? 0),
    ActionCategoryTargetID: Number(row.ActionCategoryTargetID ?? 0),
    IsRoleAction: Number(row.IsRoleAction ?? 0),
    IsPvP: isPvP,
    Recast100ms: recast100ms,
    Recast1000ms: recast100ms / 10,
    Host: row.Host,
  }
}

async function fetchActionSearchPages(baseQuery: URLSearchParams, merged: Map<number, XivApiActionSearchItem>, limit: number): Promise<void> {
  const pageLimit = Number(baseQuery.get('limit') ?? 100)
  let page = 1

  while (merged.size < limit) {
    const query = new URLSearchParams(baseQuery)
    query.set('page', String(page))
    const result = await requestWithFallback(buildFallbackUrls(`/search?${query.toString()}`))
    const rows = Array.isArray(result?.Results) ? result.Results as XivApiActionSearchItem[] : []
    rows.forEach((row) => {
      const parsed = toActionSearchItem(row)
      if (parsed)
        merged.set(parsed.ID, parsed)
    })
    const pageTotal = Number(result?.Pagination?.PageTotal ?? page)
    if (page >= pageTotal || rows.length < pageLimit)
      break
    page += 1
  }
}

/**
 * 需要按职业批量拉取技能列表（职业技能 + 职能技能）时用这个。
 * 常用于设置页“选择技能”弹窗。
 */
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

  for (const jobId of normalized) {
    const query = new URLSearchParams({
      indexes: 'Action',
      columns: 'ID,Name,Icon,ClassJobLevel,ClassJobTargetID,ActionCategoryTargetID,IsRoleAction,IsPvP,Recast100ms',
      filters: `ClassJobTargetID=${jobId},IsPvP=0`,
      sort_field: 'ClassJobLevel',
      sort_order: 'asc',
      limit: '100',
    })
    await fetchActionSearchPages(query, merged, limit)
  }

  const roleCategories = getRoleActionCategories(normalized)
  for (const categoryId of roleCategories) {
    const query = new URLSearchParams({
      indexes: 'Action',
      columns: 'ID,Name,Icon,ClassJobLevel,ClassJobTargetID,ClassJobCategoryTargetID,ActionCategoryTargetID,IsPvP,IsRoleAction,Recast100ms',
      filters: `IsRoleAction=1,IsPvP=0,ClassJobCategoryTargetID=${categoryId}`,
      sort_field: 'ClassJobLevel',
      sort_order: 'asc',
      limit: '100',
    })
    await fetchActionSearchPages(query, merged, limit)
  }

  const list = [...merged.values()]
    .sort((a, b) => a.ClassJobLevel === b.ClassJobLevel ? a.ID - b.ID : a.ClassJobLevel - b.ClassJobLevel)
    .slice(0, limit)

  actionSearchByJobCache.set(cacheKey, list)
  return [...list]
}

/**
 * 用在 `<img @error>` 上的统一兜底处理函数。
 * 首次加载失败会自动尝试镜像站，仍失败则清空图片。
 */
export function handleImgError(event: Event): void {
  const target = event.target as HTMLImageElement
  if (!target?.src)
    return

  const url = new URL(target.src)
  const path = url.pathname

  if (target.src.includes('pictomancer.png')) {
    target.src = '//souma.diemoe.net/resources/img/pictomancer.png'
  }
  else if (target.src.includes('viper.png')) {
    target.src = '//souma.diemoe.net/resources/img/viper.png'
  }
  else if (url.host === getPrimaryHost()) {
    target.src = `${getSecondaryUrl()}${path}`
  }
  else {
    target.src = ''
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 3000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  }
  finally {
    clearTimeout(id)
  }
}

async function requestWithFallback(urls: string[], options: RequestInit = {}): Promise<any> {
  const mergedOptions: RequestInit = {
    cache: 'force-cache',
    mode: 'cors',
    ...options,
  }

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, mergedOptions)
      if (!response.ok) {
        console.warn(`Fetch failed for ${url}: status ${response.status}`)
        continue
      }
      if (isSecondaryUrl(url))
        switchPrimarySite()
      const json = await response.json()
      return { ...json, Host: new URL(url).host }
    }
    catch (error) {
      console.warn(`Fetch failed for ${url}:`, error)
    }
  }

  throw new Error('All fetch attempts failed.')
}
