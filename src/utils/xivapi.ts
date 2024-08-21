import Util from './util'

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

const cacheExpirationTime = {
  get random() {
    return Math.floor(Math.random() * 86400000 * 11) + 86400000 * 25
  },
}

const userAction = new Map(
  Object.entries({
    任务指令: '/i/000000/000123.png',
    冲刺: '/i/000000/000104.png',
    坐骑: '/i/000000/000118.png',
    攻击: '/i/000000/000101.png',
    腐秽大地: '/i/003000/003090.png',
  }),
)

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

export function getClassjobIconSrc(jobEnum: number): string {
  const job = Util.jobEnumToJob(jobEnum)
  const fullName = Util.nameToFullName(job)
  return `${site.first}/cj/companion/${fullName.en
    .toLowerCase()
    .replaceAll(/\s/g, '')}.png`
}

export async function getImgSrcByActionId(id: number): Promise<string> {
  const res = await parseAction('action', id, ['Icon'])

  return getFullImgSrc(res.Icon)
}

export async function getActionByChineseName(name: string) {
  const customAction = userAction.get(name)
  if (customAction)
    return { ActionCategoryTargetID: 0, ID: 0, Icon: customAction }

  const cachedAction = cachedActionData.find(v => v.name === name)
  if (cachedAction?.action)
    return cachedAction.action

  try {
    const response = await requestPromise([
      `https://${siteList.cafe
      }/search?filters=ClassJobLevel>0&indexes=action&string=${encodeURIComponent(
        name,
      )}`,
    ])

    const result = response.Results[0]

    if (result) {
      const expirationTime = Date.now() + cacheExpirationTime.random
      const newCachedAction: CachedAction = {
        name,
        action: result,
        expirationTime,
      }
      cachedActionData.push(newCachedAction)
      localStorage.setItem(ACTION_CACHE_KEY, JSON.stringify(cachedActionData))

      return result
    }
    return { ActionCategoryTargetID: 0, ID: 0, Icon: '/i/000000/000405.png' }
  }
  catch (error) {
    console.error(`Failed to get action by name: ${error}`)
    throw new Error('Failed to retrieve action data')
  }
}

async function timeoutPromise<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T> {
  let timeoutId: NodeJS.Timeout
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
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
