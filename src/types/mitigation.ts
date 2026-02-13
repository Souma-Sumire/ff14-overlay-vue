import type { PerformanceType } from '@/types/keigennRecord2'
import type { DamageType } from '@/utils/flags'

export type MitigationScope = 'self' | 'party'

export interface PartyMember {
  id: string
  name: string
  job: number
  level: number
}

export interface EncounterCandidate {
  id: string
  zoneId: number | null
  zoneName: string
  startTime: number
  endTime: number
  durationStr: string
  lines: string[]
  party: PartyMember[]
}

export interface SheetMechanicState {
  rows: MitigationRow[]
  filterMechanics: string[]
}

export interface SheetPlannerState {
  playerActions: PlayerActionRecord[]
  columns: ColumnDef[]
  playerLevel: number
}

export interface CellSimState {
  status: 'active-start' | 'active' | 'ready' | 'cooldown' | 'conflict' | ''
  classes: string | string[] | Record<string, boolean>
  showDot: boolean
  offset: number
  useTimestamp?: number
  actionId?: string
  tooltip: string
  ready: boolean
  charges: number
  maxCharges: number
  recastLeft: number
  conflictTime?: number
}

export interface RowSimState {
  cells: Record<string, CellSimState>
  activeMitigations: number[]
  damageTypeClass: string
}

export interface MitigationRow {
  key: string
  timestamp: number

  action: string
  actionId: string
  source: string
  damageType: DamageType
  rawDamage: number
  targetCount: number
  isAOE: boolean
  isTB: boolean
  isShare?: boolean
  shieldValue?: number
  castTime?: string
  castStartTime?: number

  targets: string[]
  rawLines: string[]
  flags: string[]
  damageDetails: Array<{
    target: string
    targetId: string
    damage: number
    flag: string
    estimatedRaw?: number
  }>

  _sim?: RowSimState
  _sim_str?: string
  _v?: number
}

export interface ColumnDef {
  key: string
  jobEnum: number
  role: 'tank' | 'healer' | 'dps' | 'unknown'
  skills: MitigationSkill[]
  targetId?: string
  hiddenSkillIds?: number[]
}

export interface MitigationSkill {
  id: number
  name: string
  icon: string
  mitigationScope?: MitigationScope
  damageTakenMultiplier?: PerformanceType
  recast: number
  duration?: number
  maxCharges?: number
}

export interface SheetState {
  id: string
  name: string
  meta?: {
    zoneId: number | null
    zoneName?: string
  }
  mechanics: SheetMechanicState
  planner: SheetPlannerState
}

export interface PlayerActionRecord {
  id: string
  timestamp: number
  columnKey: string
  skillId: number
  rowKey?: string
  recastOverride?: number
}
