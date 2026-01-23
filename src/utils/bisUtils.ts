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
}

export interface LegacyBisConfig {
  playerBis: Record<string, string[]>
}

// prettier-ignore
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
  { id: 'twine', name: '强化纤维', keywords: PartOrder.Coating, type: 'count' },
  { id: 'coating', name: '硬化药', keywords: PartOrder.Twine, type: 'count' },
  { id: 'tome', name: '神典石', keywords: PartOrder.Tome, type: 'count' },
  { id: 'solvent', name: '强化药', keywords: PartOrder.Solvent, type: 'count' },
]

export const LAYER_CONFIG = [
  { name: '1层', items: ['earring', 'necklace', 'bracelet', 'ring'] },
  { name: '2层', items: ['head', 'hands', 'feet', 'tome', 'coating'] },
  { name: '3层', items: ['body', 'legs', 'solvent', 'twine'] },
  { name: '4层', items: ['weapon'] },
]

export function isPlayerComplete(config: BisConfig, playerOrRole: string) {
  if (!config?.playerBis?.[playerOrRole]) return false
  for (const row of DEFAULT_ROWS) {
    if (row.type === 'toggle' && !config.playerBis[playerOrRole]?.[row.id]) {
      return false
    }
  }
  return true
}
