const params = new URLSearchParams(window.location.href.split('?')[1])

const api = params.get('api')

const siteList = {
  cafe: 'cafemaker.wakingsands.com',
  xivapi: 'xivapi.com',
}

export const hostCache = new Map()

export const site: { first: string, second: string } = {
  first: `https://${api?.toLowerCase() === 'xivapi' ? siteList.xivapi : siteList.cafe}`,
  second: `https://${api?.toLowerCase() === 'xivapi' ? siteList.cafe : siteList.xivapi}`,
}

interface CachedAction {
  name: string
  action: unknown
  expirationTime: number
}

const ACTION_CACHE_KEY = 'souma-action-cache'
const cachedActionData: CachedAction[] = JSON.parse(
  localStorage.getItem(ACTION_CACHE_KEY) || '[]',
) as CachedAction[]
const currentTime = Date.now()
const MAX_CACHE_LENGTH = 1000
const updatedActionData = cachedActionData.filter(
  (v, index) => v.expirationTime >= currentTime && index < MAX_CACHE_LENGTH,
)
localStorage.setItem(ACTION_CACHE_KEY, JSON.stringify(updatedActionData))

const ICON_REGEX = /(\d{6})\/(\d{6})\.png$/

export async function parseAction(
  type: string,
  actionId: number,
  columns: (keyof XivApiJson)[] = ['ID', 'Icon', 'ActionCategoryTargetID'],
): Promise<any> {
  if (hostCache.has(actionId)) {
    return hostCache.get(actionId)
  }
  const urls = generateActionUrls(type, actionId, columns)
  try {
    const result = await requestPromise(urls, { mode: 'cors' })
    hostCache.set(actionId, result)
    return result
  }
  catch (error) {
    console.error(`Failed to parse action: ${error}`)
    return Promise.resolve({
      ActionCategoryTargetID: 0,
      ID: actionId,
      Icon: '/i/000000/000405.png',
    })
  }
}

function generateActionUrls(
  type: string,
  actionId: number,
  columns: (keyof XivApiJson)[],
) {
  const urlTemplate = `${site.first}/${type}/${actionId}?columns=${columns.join(
    ',',
  )}`
  return [urlTemplate, urlTemplate.replace(site.first, site.second)]
}

export async function getFullImgSrc(icon: string, itemIsHQ = false) {
  const url = `${site.first}${icon}`
  return url.replace(
    ICON_REGEX,
    (_match, p1, p2) => `${p1}/${itemIsHQ ? 'hq/' : ''}${p2}.png`,
  )
}

export async function getImgSrcByActionId(id: number): Promise<string> {
  const res = await parseAction('action', id, ['Icon'])

  return getFullImgSrc(res.Icon)
}

async function timeoutPromise<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T> {
  let timeoutId: number
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('Promise timed out'))
    }, timeout)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

async function requestPromise(
  urls: string[],
  options?: RequestInit,
): Promise<any> {
  const _options = Object.assign({ cache: 'force-cache' }, options)
  for (const url of urls) {
    try {
      const response = await timeoutPromise(fetch(url, _options), 3000)
      if (response.ok) {
        const json = await response.json()
        const host = new URL(url).host
        return { ...json, Host: host }
      }
    }
    catch {}
  }
  throw new Error('All fetch attempts failed.')
}

const imgCache = new Map<string, string>()

export function getImgSrc(src: string): string {
  if (imgCache.has(src)) {
    return imgCache.get(src) as string
  }
  return `${site.first}${src}`
}

export function handleImgError(event: Event) {
  const target = event.target as HTMLImageElement
  const path = target.src.match(/(?<=\.\w+)\/.+$/)?.[0]
  if (!path || target.src === '')
    return
  if (/pictomancer\.png$/.test(target.src)) {
    target.src = '//souma.diemoe.net/resources/img/pictomancer.png'
  }
  else if (/viper\.png$/.test(target.src)) {
    target.src = '//souma.diemoe.net/resources/img/viper.png'
  }
  else if (target.src.includes(site.first)) {
    target.src = target.src.replace(site.first, site.second)
  }
  else {
    target.src = ''
  }
  imgCache.set(path, target.src)
}
