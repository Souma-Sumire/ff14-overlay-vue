import { worlds as worldNames } from '@/resources/generated/worlds'

export interface RollInfo {
  player: string
  type: 'need' | 'greed' | 'assign' | 'direct' | 'manual' | 'replace'
  value: number | null
}

export interface LootRecord {
  key: string
  timestamp: Date
  player: string
  item: string
  rolls: RollInfo[]
  isAssign?: boolean
  isManual?: boolean
}

const PRIVATE_USE_CHARS_REGEX = /[\uE000-\uF8FF]/g
const WRAP_QUOTES_REGEX = /^["「『]|["」』]$/g
const MAX_NAME_CACHE_SIZE = 10_000

function setCacheValue(cache: Map<string, string>, key: string, value: string) {
  if (cache.size >= MAX_NAME_CACHE_SIZE)
    cache.clear()
  cache.set(key, value)
}

const itemNameCache = new Map<string, string>()
export function sanitizeItemName(name: string): string {
  const cached = itemNameCache.get(name)
  if (cached !== undefined)
    return cached

  const normalized = name
    .replace(PRIVATE_USE_CHARS_REGEX, '')
    .replace(WRAP_QUOTES_REGEX, '')
    .trim()
  setCacheValue(itemNameCache, name, normalized)
  return normalized
}

const playerNameCache = new Map<string, string>()
const worldSuffixBuckets = (() => {
  const buckets = new Map<string, string[]>()
  for (const world of worldNames) {
    const ending = world.charAt(world.length - 1)
    const list = buckets.get(ending)
    if (list)
      list.push(world)
    else
      buckets.set(ending, [world])
  }
  return buckets
})()

export function sanitizePlayerName(name: string): string {
  const cached = playerNameCache.get(name)
  if (cached !== undefined)
    return cached

  let clean = name.replace(PRIVATE_USE_CHARS_REGEX, '')
  const suffixCandidates = worldSuffixBuckets.get(clean.charAt(clean.length - 1))
  if (suffixCandidates) {
    for (const s of suffixCandidates) {
      // Keep original world list order semantics while reducing scan set size.
      if (clean.length > s.length && clean.endsWith(s)) {
        clean = clean.slice(0, -s.length)
        break
      }
    }
  }

  const normalized = clean.trim()
  setCacheValue(playerNameCache, name, normalized)
  return normalized
}

export const ROLE_DEFINITIONS = [
  'MT',
  'ST',
  'H1',
  'H2',
  'D1',
  'D2',
  'D3',
  'D4',
] as const

export function getRoleType(role: string | null | undefined) {
  if (!role)
    return ''
  const r = role.toUpperCase()
  if (r.startsWith('LEFT:'))
    return 'role-left'
  if (r.startsWith('MT') || r.startsWith('ST'))
    return 'role-tank'
  if (r.startsWith('H1') || r.startsWith('H2'))
    return 'role-healer'
  return 'role-dps'
}

export function getRoleColor(role: string | null | undefined) {
  if (!role)
    return '#6366f1' // Default Indigo
  if (role.startsWith('LEFT:'))
    return '#64748b' // Gray
  switch (role) {
    case 'MT':
    case 'ST':
      return '#3b82f6' // Blue
    case 'H1':
    case 'H2':
      return '#10b981' // Green
  }
  return '#ef4444' // Red
}

export function getRoleDisplayName(role: string) {
  if (role.startsWith('LEFT:'))
    return '离队'
  return role
}

const ROLL_TYPE_NAME_MAP: Record<string, string> = {
  need: '需求',
  greed: '贪婪',
  assign: '分配',
  direct: '获得',
  manual: '手动',
  replace: '替换',
}

const ROLL_TYPE_ICON_MAP: Record<string, string> = {
  need: '需',
  greed: '贪',
  manual: '手',
  assign: '配',
  direct: '直',
  replace: '换',
}

export function getRollTypeName(type: string) {
  return ROLL_TYPE_NAME_MAP[type] || type
}

export function getRollTypeIcon(type: string) {
  return ROLL_TYPE_ICON_MAP[type] || '?'
}

export enum PartOrder {
  WeaponBox = '武器箱',
  HeadBox = '头部装备箱',
  BodyBox = '身体装备箱',
  HandsBox = '手臂装备箱',
  LegsBox = '腿部装备箱',
  FeetBox = '脚部装备箱',
  EarringBox = '耳部装备箱',
  NecklaceBox = '颈部装备箱',
  BraceletBox = '腕部装备箱',
  RingBox = '指环装备箱',
  Twine = '硬化药',
  Coating = '强化纤维',
  Tome = '神典石',
  Solvent = '强化药',
}

export const PART_ORDER = Object.values(PartOrder)

export enum DropOrder {
  EarringBox = '耳部装备箱',
  NecklaceBox = '颈部装备箱',
  BraceletBox = '腕部装备箱',
  RingBox = '指环装备箱',
  HeadBox = '头部装备箱',
  HandsBox = '手臂装备箱',
  FeetBox = '脚部装备箱',
  Tome = '神典石',
  Twine = '硬化药',
  BodyBox = '身体装备箱',
  LegsBox = '腿部装备箱',
  Solvent = '强化药',
  Coating = '强化纤维',
  WeaponBox = '武器箱',
}

export const DROP_ORDER = Object.values(DropOrder)
