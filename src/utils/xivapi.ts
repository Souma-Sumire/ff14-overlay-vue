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

const ICON_REGEX = /(\d{6})\/(\d{6})\.png$/
const DEFAULT_ICON = '/i/000000/000405.png'

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
