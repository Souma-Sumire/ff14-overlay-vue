import { worldNames } from '@/resources/worlds'

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

const itemNameCache = new Map<string, string>()
export function sanitizeItemName(name: string): string {
  if (itemNameCache.has(name)) return itemNameCache.get(name)!
  let clean = name.replace(/[\ue000-\uf8ff]/g, '')
  clean = clean.replace(/^["「『]|["」』]$/g, '').trim()
  const res = clean.trim()
  itemNameCache.set(name, res)
  return res
}

const playerNameCache = new Map<string, string>()
export function sanitizePlayerName(name: string): string {
  if (playerNameCache.has(name)) return playerNameCache.get(name)!
  let clean = name.replace(/[\ue000-\uf8ff]/g, '')
  for (const s of worldNames) {
    if (clean.length > s.length && clean.endsWith(s)) {
      clean = clean.slice(0, -s.length)
      break
    }
  }
  const res = clean.trim()
  playerNameCache.set(name, res)
  return res
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
  if (!role) return ''
  const r = role.toUpperCase()
  if (r.startsWith('LEFT:')) return 'role-left'
  if (r.startsWith('SUB:')) return 'role-sub'
  if (r.startsWith('MT') || r.startsWith('ST')) return 'role-tank'
  if (r.startsWith('H1') || r.startsWith('H2')) return 'role-healer'
  return 'role-dps'
}

export function getRoleColor(role: string | null | undefined) {
  if (!role) return '#6366f1' // Default Indigo
  if (role.startsWith('LEFT:')) return '#64748b' // Gray
  if (role.startsWith('SUB:')) return '#f59e0b' // Orange
  if (['MT', 'ST'].includes(role)) return '#3b82f6' // Blue
  if (['H1', 'H2'].includes(role)) return '#10b981' // Green
  return '#ef4444' // Red
}

export function getRoleDisplayName(role: string) {
  if (role.startsWith('LEFT:')) return '离队'
  if (role.startsWith('SUB:')) return '替补'
  return role
}

export function getRollTypeName(type: string) {
  return (
    {
      need: '需求',
      greed: '贪婪',
      assign: '分配',
      direct: '获得',
      manual: '手动',
      replace: '替换',
    }[type] || type
  )
}

export function getRollTypeIcon(type: string) {
  return (
    {
      need: '需',
      greed: '贪',
      manual: '手',
      assign: '配',
      direct: '直',
      replace: '换',
    }[type] || '?'
  )
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
