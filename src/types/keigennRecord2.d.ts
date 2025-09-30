import type { FFIcon } from '@/types/fflogs'
import type { DamageEffect, DamageType } from '@/utils/flags'

export interface RowVO {
  key: string
  time: string
  id?: string
  actionCN: string
  action: string
  source: string
  target: string
  targetId: string
  job: string
  jobIcon: FFIcon
  jobEnum: number
  amount: number
  keigenns: Status[]
  currentHp: number
  maxHp: number
  effect: DamageEffect
  type: DamageType
  shield: string
  povId: string
  reduction: number
}

export interface Status {
  type: KeigennType
  name: string
  count: number
  effect: string
  effectId: string
  source: string
  sourceId: string
  target: string
  targetId: string
  expirationTimestamp: number
  performance: PerformanceType
  fullIcon: string
  isPov: boolean
  remainingDuration?: string
}

export interface Encounter {
  key: string
  zoneName: string
  duration: string
  table: RowVO[]
  timestamp: number
}

export type KeigennType = 'multiplier' | 'absorbed'

export interface PerformanceType {
  physics: number
  magic: number
  darkness: number
}

export interface Keigenn {
  id: number
  fullIcon: string
  type: KeigennType
  performance: PerformanceType
  isFriendly: boolean
  name: string
}
export type Server = 'Chinese' | 'Global'
