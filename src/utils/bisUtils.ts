import { PartOrder } from '@/utils/lootParser'

export interface BisRow {
  id: string
  name: string
  keywords: string
  type: 'toggle' | 'count'
}

export type BisValue = 'raid' | 'tome' | number

export interface BisConfig {
  playerBis: Record<string, Record<string, BisValue>>
  plannedWeeks?: number
  manualObtained?: Record<string, Record<string, number>>
}

export interface LegacyBisConfig {
  playerBis: Record<string, string[]>
}

export const DEFAULT_ROWS: BisRow[] = [
  { id: 'earring', name: '耳部', keywords: PartOrder.EarringBox, type: 'toggle' },
  { id: 'necklace', name: '颈部', keywords: PartOrder.NecklaceBox, type: 'toggle' },
  { id: 'bracelet', name: '腕部', keywords: PartOrder.BraceletBox, type: 'toggle' },
  { id: 'ring', name: '指环', keywords: PartOrder.RingBox, type: 'toggle' },
  { id: 'head', name: '头部', keywords: PartOrder.HeadBox, type: 'toggle' },
  { id: 'hands', name: '手臂', keywords: PartOrder.HandsBox, type: 'toggle' },
  { id: 'feet', name: '脚部', keywords: PartOrder.FeetBox, type: 'toggle' },
  { id: 'body', name: '身体', keywords: PartOrder.BodyBox, type: 'toggle' },
  { id: 'legs', name: '腿部', keywords: PartOrder.LegsBox, type: 'toggle' },
  { id: 'weapon', name: '武器箱', keywords: PartOrder.WeaponBox, type: 'toggle' },
  { id: 'random_weapon', name: '随武', keywords: '随武', type: 'count' },
  { id: 'twine', name: '强化纤维', keywords: PartOrder.Coating, type: 'count' },
  { id: 'coating', name: '硬化药', keywords: PartOrder.Twine, type: 'count' },
  { id: 'tome', name: '神典石', keywords: PartOrder.Tome, type: 'count' },
  { id: 'solvent', name: '强化药', keywords: PartOrder.Solvent, type: 'count' },
]

export const LAYER_CONFIG = [
  { name: '1层', items: ['earring', 'necklace', 'bracelet', 'ring'] },
  { name: '2层', items: ['head', 'hands', 'feet', 'tome', 'coating'] },
  { name: '3层', items: ['body', 'legs', 'solvent', 'twine'] },
  { name: '4层', items: ['weapon', 'random_weapon'] },
]

export function isPlayerComplete(config: BisConfig, playerOrRole: string) {
  if (!config?.playerBis?.[playerOrRole])
    return false
  for (const row of DEFAULT_ROWS) {
    if (row.type === 'toggle' && !config.playerBis[playerOrRole]?.[row.id]) {
      return false
    }
  }
  return true
}

export function isBisItem(
  row: BisRow,
  playerBis: Record<string, BisValue>,
): boolean {
  if (!playerBis)
    return false
  return row.type === 'toggle'
    ? playerBis[row.id] === 'raid'
    : typeof playerBis[row.id] === 'number' && (playerBis[row.id] as number) > 0
}

export function countObtainedItems(
  row: BisRow,
  obtainedItems: Record<string, number>,
): number {
  return Object.entries(obtainedItems).reduce(
    (sum, [name, c]) => (name.includes(row.keywords) ? sum + c : sum),
    0,
  )
}
