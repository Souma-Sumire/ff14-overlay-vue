import { useIndexedDB } from '@/composables/useIndexedDB'
import { XIVAPI_CACHE_VERSION } from '@/resources/cacheVersion'
import { ROLE_ACTION_CATEGORY_BY_JOB } from '@/resources/generated/roleActionCategoryByJob'
import { markRoleActionId, resolveActionMinLevel } from '@/resources/logic/actionMetaResolver'
import { completeIcon } from '@/resources/logic/status'
import Util from '@/utils/util'

const params = new URLSearchParams(window.location.search)
const apiParam = params.get('api')?.toLowerCase()

const SITE_HOST = {
  cafe: { host: 'cafemaker.wakingsands.com', imgHost: 'cafemaker.wakingsands.com', version: 1 },
  xivapi: { host: 'v2.xivapi.com', imgHost: 'xivapi.com', version: 2 },
} as const

type SiteName = keyof typeof SITE_HOST

interface IndexedDbCacheItem {
  key: string
  value: any
}

const CACHE_VERSION_STORAGE_KEY = 'xivapi-cache-version'
const PRIMARY_SITE_STORAGE_KEY = 'xivapi-primary-site'
let primarySite: SiteName = 'cafe'

const actionMetaCacheDb = useIndexedDB<IndexedDbCacheItem>('xivapi-action-meta-cache')
const actionSearchCacheDb = useIndexedDB<IndexedDbCacheItem>('xivapi-action-search-cache')
const pendingNetworkRequests = new Map<string, Promise<any>>()

function isSiteName(value: unknown): value is SiteName {
  return typeof value === 'string' && value in SITE_HOST
}

function ensureCacheVersion(): void {
  const storedVersion = localStorage.getItem(CACHE_VERSION_STORAGE_KEY)?.trim().replace(/^"(.*)"$/, '$1')
  if (storedVersion === XIVAPI_CACHE_VERSION)
    return
  localStorage.setItem(CACHE_VERSION_STORAGE_KEY, XIVAPI_CACHE_VERSION)
  persistPrimarySite('cafe')
  void actionMetaCacheDb.clear()
  void actionSearchCacheDb.clear()
}

function persistPrimarySite(site: SiteName): void {
  primarySite = site
  localStorage.setItem(PRIMARY_SITE_STORAGE_KEY, site)
}

function resolveInitialPrimarySite(): SiteName {
  ensureCacheVersion()
  if (isSiteName(apiParam))
    return apiParam
  const stored = localStorage.getItem(PRIMARY_SITE_STORAGE_KEY)?.trim().replace(/^"(.*)"$/, '$1')
  return isSiteName(stored) ? stored : 'cafe'
}

primarySite = resolveInitialPrimarySite()

export { XIVAPI_CACHE_VERSION }

function buildUrl(siteName: SiteName, api = true) {
  const { host, version } = SITE_HOST[siteName]
  return `https://${host}${api && version === 2 ? '/api' : ''}`
}

function buildImgUrl(siteName: SiteName) {
  return `https://${SITE_HOST[siteName].imgHost}`
}

/**
 * 切换全局主站，并强制救援当前页面所有 pending 状态的图片。
 */
let lastSwitchTime = 0
function switchPrimarySite(failedHost?: string): void {
  const currentConfig = SITE_HOST[primarySite]
  if (failedHost && failedHost !== currentConfig.host && failedHost !== currentConfig.imgHost)
    return

  const now = Date.now()
  if (now - lastSwitchTime < 2000)
    return
  lastSwitchTime = now

  const oldApiHost = currentConfig.host
  const oldImgHost = currentConfig.imgHost
  primarySite = primarySite === 'cafe' ? 'xivapi' : 'cafe'
  const newSite = primarySite
  const newBase = buildImgUrl(newSite)

  persistPrimarySite(newSite)
  console.warn(`[xivapi] Site ${oldApiHost} seems down. Switching to ${newSite} and rescuing pending images...`)

  if (typeof document !== 'undefined') {
    const imgs = document.querySelectorAll('img')
    imgs.forEach((img) => {
      const isOldHost = img.src && (img.src.includes(oldImgHost) || img.src.includes(oldApiHost))
      if (isOldHost && !img.dataset.tried) {
        const url = new URL(img.src)
        const path = url.pathname
        img.dataset.tried = '1'
        img.src = `${newBase}${path}`
      }
    })
  }
}

export const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='

export function getIconSrcById(iconId: number, highRes = false): string {
  if (!Number.isFinite(iconId) || iconId <= 0)
    return EMPTY_IMAGE
  const full = completeIcon(Math.trunc(iconId))
  const suffix = highRes ? '_hr1' : ''
  return `${buildImgUrl(primarySite)}/i/${full}${suffix}.png`
}

export function getIconSrcByFullIcon(fullIcon: string, highRes = false): string {
  if (!fullIcon)
    return EMPTY_IMAGE
  const suffix = highRes ? '_hr1' : ''
  return `${buildImgUrl(primarySite)}/i/${fullIcon}${suffix}.png`
}

export function getIconSrcByPath(iconPath: string, itemIsHQ = false, highRes = false): string {
  if (!iconPath)
    return EMPTY_IMAGE
  if (/^https?:\/\//.test(iconPath))
    return iconPath
  const suffix = highRes ? '_hr1' : ''
  const baseUrl = buildImgUrl(primarySite)
  return `${baseUrl}${iconPath}`.replace(/(\d{6})\.png$/, (_m, p1) => `${itemIsHQ ? 'hq/' : ''}${p1}${suffix}.png`)
}

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
  ClassJobCategoryTargetID?: number
  ActionCategoryTargetID?: number
  IsRoleAction?: number
  IsPvP?: number
  Recast100ms?: number
  Recast1000ms?: number
}

async function requestWithFallback(path: string): Promise<any> {
  const dedupKey = `req:${path}`
  if (pendingNetworkRequests.has(dedupKey))
    return pendingNetworkRequests.get(dedupKey)

  const task = (async () => {
    const sites: SiteName[] = primarySite === 'cafe' ? ['cafe', 'xivapi'] : ['xivapi', 'cafe']
    for (const siteName of sites) {
      const isV2 = SITE_HOST[siteName].version === 2
      let buildedPath = path
      if (isV2) {
        // V2 路径转换逻辑：/Action/ID -> /sheet/Action/ID
        // 支持匹配 /action/123 或 /api/action/123 (以防万一)
        const v2PathMatch = buildedPath.match(/^\/?(api\/)?([a-zA-Z0-9]+)\/(\d+)/)
        if (v2PathMatch && v2PathMatch[2] && v2PathMatch[3] && !buildedPath.includes('/search')) {
          const sheetName = v2PathMatch[2]
          const capitalized = sheetName.charAt(0).toUpperCase() + sheetName.slice(1)
          buildedPath = `/sheet/${capitalized}/${v2PathMatch[3]}${buildedPath.includes('?') ? `?${buildedPath.split('?')[1]}` : ''}`
        }
      }

      // 构建完整 URL
      const baseUrl = buildUrl(siteName, true)
      const urlObj = new URL(`${baseUrl}${buildedPath.startsWith('/') ? '' : '/'}${buildedPath}`)

      if (isV2) {
        // V2 参数翻译
        const urlParams = urlObj.searchParams

        // 核心翻译：显式只映射目前涉及到的几个分类字段
        if (urlParams.has('filters')) {
          const rawFilters = urlParams.get('filters') || ''
          const translated = rawFilters.split(',').filter(Boolean).map((f) => {
            const parts = f.split('=')
            if (parts.length < 2)
              return ''
            const k = parts[0] as string
            const v = parts[1] as string
            // 显式映射：防止误伤其他字段
            let newKey = k
            if (k === 'ClassJobTargetID')
              newKey = 'ClassJob'
            else if (k === 'ClassJobCategoryTargetID')
              newKey = 'ClassJobCategory'
            else if (k === 'ActionCategoryTargetID')
              newKey = 'ActionCategory'

            // 值翻译: V2 对布尔字段要求 false/true 文本，语法要求 +Key=Value
            let newVal = v
            if (v === '0')
              newVal = 'false'
            else if (v === '1')
              newVal = 'true'

            return `+${newKey}=${newVal}`
          }).filter(Boolean).join(' ')
          urlParams.set('query', translated)
          urlParams.delete('filters')
        }

        if (urlParams.has('columns')) {
          // 显式替换：只对已知字段进行映射转换，且 ID -> row_id
          let fields = urlParams.get('columns')!
          fields = fields.replace(/\bID\b/g, 'row_id')
            .replace(/ClassJobTargetID/g, 'ClassJob')
            .replace(/ClassJobCategoryTargetID/g, 'ClassJobCategory')
            .replace(/ActionCategoryTargetID/g, 'ActionCategory')
          urlParams.set('fields', fields)
          urlParams.delete('columns')
        }
        if (urlParams.has('indexes')) {
          urlParams.set('sheets', urlParams.get('indexes')!)
          urlParams.delete('indexes')
        }
      }

      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 6000)
        const fetchUrl = urlObj.toString()
        const resp = await fetch(fetchUrl, { signal: controller.signal, cache: 'force-cache' })
        clearTimeout(timer)
        if (!resp.ok) {
          console.error(`[xivapi] Request failed: ${fetchUrl} (${resp.status} ${resp.statusText})`)
          continue
        }

        if (siteName !== primarySite)
          switchPrimarySite()
        let json = await resp.json()

        if (isV2) {
          const norm = (i: any) => {
            if (!i)
              return i
            const f = i.fields || i || {}
            const res: any = { ...f, ID: i.row_id || i.ID }
            // 递归拆包 V2 的对象结构 (Boilmaster 专有)
            for (const key in res) {
              const val = res[key]
              if (val && typeof val === 'object' && !Array.isArray(val)) {
                if (val.path !== undefined)
                  res[key] = `/${val.path.replace(/^ui\/icon\//, 'i/').replace(/\.tex$/, '.png')}`
                else if (val.row_id !== undefined)
                  res[key] = val.row_id
                else if (val.value !== undefined)
                  res[key] = val.value
              }
            }
            // 字段映射并转换回 V1 风格以兼容现有逻辑
            return {
              ...res,
              ClassJobTargetID: res.ClassJob,
              ClassJobCategoryTargetID: res.ClassJobCategory,
              ActionCategoryTargetID: res.ActionCategory,
              IsPvP: res.IsPvP ? 1 : 0,
              IsRoleAction: res.IsRoleAction ? 1 : 0,
              Recast100ms: Number(res.Recast100ms) || 0,
              ClassJobLevel: Number(res.ClassJobLevel) || 0,
            }
          }
          if (json.results) {
            json = {
              Pagination: { PageTotal: json.total_pages },
              Results: json.results.map(norm),
            }
          }
          else if (json.row_id !== undefined || json.ID !== undefined) {
            json = norm(json)
          }
        }
        return json
      }
      catch (e) {
        console.warn(`Fetch ${siteName} failed:`, e)
      }
    }
    throw new Error(`All sites failed: ${path}`)
  })()

  pendingNetworkRequests.set(dedupKey, task)
  return task.finally(() => pendingNetworkRequests.delete(dedupKey))
}

export async function parseAction(type: string, id: number, columns: string[] = ['ID', 'Icon']): Promise<any> {
  const key = `${type}:${id}`
  const reqCols = Array.from(new Set([...columns, 'ID', 'Icon', 'ClassJobLevel', 'IsRoleAction']))

  const cache = await actionMetaCacheDb.get(key)
  if (cache?.value && reqCols.every(c => Object.prototype.hasOwnProperty.call(cache.value, c))) {
    return cache.value
  }

  const res = await requestWithFallback(`/${type}/${id}?columns=${reqCols.join(',')}`)
  const final = { id, ...res }
  if (type === 'action') {
    markRoleActionId(id, !!final.IsRoleAction)
    final.ClassJobLevel = resolveActionMinLevel(final.ClassJobLevel, { actionId: id, isRoleAction: !!final.IsRoleAction })
  }
  void actionMetaCacheDb.set({ key, value: final })
  return final
}

export async function searchActionsByClassJobs(jobIds: number[], limit = 500): Promise<XivApiActionSearchItem[]> {
  const normalized = jobIds.map(Number).filter(id => id > 0 && Util.isCombatJob(Util.jobEnumToJob(id)))
  const cacheKey = `search:${normalized.join(',')}:${limit}`
  const cached = await actionSearchCacheDb.get(cacheKey)
  if (cached?.value)
    return cached.value

  const merged = new Map<number, any>()

  const fetchPage = async (id: number) => {
    // V2 搜索逻辑增强：同时匹配 (职业专属技能) OR (职能技能)
    const jobCats = ROLE_ACTION_CATEGORY_BY_JOB[id] || []
    const catQuery = jobCats.length > 0
      ? ` +(${jobCats.map(cat => `ClassJobCategory=${cat}`).join(' ')})`
      : ''
    // 逻辑：IsPvP=false AND (ClassJob=id OR (IsRoleAction=true AND catQuery))
    // 注意：V2 (Boilmaster) 对 URL 编码极其敏感，必须将 '+' 编码为 '%2B'，否则会被解析为空格导致 400。
    const qRaw = `+IsPvP=false +(ClassJob=${id} (+IsRoleAction=true${catQuery}))`
    const q = `query=${qRaw.replace(/\+/g, '%2B').replace(/ /g, '%20')}`

    // V2 实测：可以直接获取点路径对象 Icon.path 和布尔值 IsRoleAction
    const v2Cols = 'row_id,Name,Icon.path,ClassJobLevel,Recast100ms,IsRoleAction'
    const res = await requestWithFallback(`/search?sheets=Action&${q}&limit=100&fields=${v2Cols}`)
    const rows = res.Results || []
    rows.forEach((r: any) => {
      const rid = Number(r.row_id || r.ID) || 0
      if (rid > 0 && !merged.has(rid)) {
        // 全 API 数据解析：V2 返回的 Icon 是一个嵌套对象 { path: "..." }
        const iconPath = typeof r.Icon === 'object' ? r.Icon?.path : r.Icon
        const row = {
          ...r,
          ID: rid,
          Icon: iconPath,
          IsRoleAction: r.IsRoleAction ? 1 : 0,
          ClassJobLevel: resolveActionMinLevel(r.ClassJobLevel, { actionId: rid, isRoleAction: !!r.IsRoleAction }),
        }
        merged.set(rid, row)
      }
    })
  }

  const tasks = normalized.map(id => fetchPage(id))
  await Promise.all(tasks)

  const list = Array.from(merged.values()).sort((a, b) => a.ClassJobLevel - b.ClassJobLevel || a.ID - b.ID).slice(0, limit)
  void actionSearchCacheDb.set({ key: cacheKey, value: list })
  return list
}

export function handleImgError(event: Event): void {
  const target = event.target as HTMLImageElement
  let isLocalFallback = false
  try {
    const errorUrl = new URL(target.src, window.location.href)
    isLocalFallback = errorUrl.origin === window.location.origin
  }
  catch (_e) {
    //
  }

  if (!target.src || target.dataset.tried || isLocalFallback || target.src.startsWith('data:')) {
    target.src = EMPTY_IMAGE
    return
  }

  if (target.src.includes('pictomancer.png')) {
    target.src = '//souma.diemoe.net/resources/img/pictomancer.png'
    return
  }
  if (target.src.includes('viper.png')) {
    target.src = '//souma.diemoe.net/resources/img/viper.png'
    return
  }

  const url = new URL(target.src)
  const failedHost = url.host
  switchPrimarySite(failedHost)

  target.dataset.tried = '1'
  const nextSite = primarySite
  const path = url.pathname
  target.src = `${buildImgUrl(nextSite)}${path}`
}
