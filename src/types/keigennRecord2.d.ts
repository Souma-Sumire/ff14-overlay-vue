import type { FFIcon } from '@/types/fflogs'
import type { DynamicValue } from '@/types/keySkill'
import type { DamageEffect, DamageType } from '@/utils/flags'

export type Scope = 'self' | 'party' | 'other'

export { DynamicValue }

export interface KeigennSkill {
  id: DynamicValue
  recast1000ms: DynamicValue
  job: number[]
  minLevel: number
  maxCharges?: DynamicValue
  scope: Scope
  showResource?: boolean
  resourceCost?: number
  overrideIconId?: number
  duration?: DynamicValue
}

export interface RowVO {
  key: string
  time: string
  timestamp: number
  id?: string
  actionCN: string
  action: string
  source: string
  target: string
  targetId: string
  job: string
  jobIcon: FFIcon
  jobEnum: number
  hasDuplicate: boolean
  amount: number
  keigenns: Status[]
  currentHp: number
  maxHp: number
  effect: DamageEffect | 'death'
  type: DamageType | 'death'
  shield: string
  povId: string
  reduction: number
  keySkills: KeySkillSnapshot[]
  preCalculated: {
    reductionColor: string
    amountDisplay: string
    damageTypeClass: string
    jobIconSrc: string
    keigenns: {
      src: string
      usefulClass: string
      title: string
      duration: string
      isPov: boolean
      effect: string
    }[]
    originalDamageDisplay: string
    hpPercent: number
    sortedSkills: KeySkillSnapshot[]
  }
}

export interface KeySkillSnapshot {
  id: number
  name: string
  icon: string
  recast1000ms: number
  recastLeft: number
  ready: boolean
  ownerId: string
  ownerName: string
  ownerJob: number
  ownerJobName: string
  chargesReady?: number
  maxCharges?: number
  scope: Scope
  jobResource?: number
  resourceCost?: number
  showResource?: boolean
  extraText?: string
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

export interface CombatDataEvent {
  type: string
  Encounter: OverlayEncounter
  Combatant: OverlayCombatant
  isActive: string | boolean
}

export interface OverlayCombatant {
  [key: string]: OverlayCombatantDetail
}

export interface OverlayCombatantDetail {
  'n': string
  't': string
  'name': string
  'duration': string
  'DURATION': string
  'damage': string
  'damage-m': string
  'damage-b': string
  'damage-*': string
  'DAMAGE-k': string
  'DAMAGE-m': string
  'DAMAGE-b': string
  'DAMAGE-*': string
  'damage%': string
  'dps': string
  'dps-*': string
  'DPS': string
  'DPS-k': string
  'DPS-m': string
  'DPS-*': string
  'encdps': string
  'encdps-*': string
  'ENCDPS': string
  'ENCDPS-k': string
  'ENCDPS-m': string
  'ENCDPS-*': string
  'hits': string
  'crithits': string
  'crithit%': string
  'crittypes': string
  'misses': string
  'hitfailed': string
  'swings': string
  'tohit': string
  'TOHIT': string
  'maxhit': string
  'MAXHIT': string
  'maxhit-*': string
  'MAXHIT-*': string
  'healed': string
  'healed%': string
  'enchps': string
  'enchps-*': string
  'ENCHPS': string
  'ENCHPS-k': string
  'ENCHPS-m': string
  'ENCHPS-*': string
  'critheals': string
  'critheal%': string
  'heals': string
  'cures': string
  'maxheal': string
  'MAXHEAL': string
  'maxhealward': string
  'MAXHEALWARD': string
  'maxheal-*': string
  'MAXHEAL-*': string
  'maxhealward-*': string
  'MAXHEALWARD-*': string
  'damagetaken': string
  'damagetaken-*': string
  'healstaken': string
  'healstaken-*': string
  'powerdrain': string
  'powerdrain-*': string
  'powerheal': string
  'powerheal-*': string
  'kills': string
  'deaths': string
  'threatstr': string
  'threatdelta': string
  'Last10DPS': string
  'Last30DPS': string
  'Last60DPS': string
  'Job': string
  'ParryPct': string
  'BlockPct': string
  'IncToHit': string
  'OverHealPct': string
  'DirectHitPct': string
  'DirectHitCount': string
  'CritDirectHitCount': string
  'CritDirectHitPct': string
  'overHeal': string
  'damageShield': string
  'absorbHeal': string
}

export interface OverlayEncounter {
  'n': string
  't': string
  'title': string
  'duration': string
  'DURATION': string
  'damage': string
  'damage-m': string
  'damage-*': string
  'DAMAGE-k': string
  'DAMAGE-m': string
  'DAMAGE-b': string
  'DAMAGE-*': string
  'dps': string
  'dps-*': string
  'DPS': string
  'DPS-k': string
  'DPS-m': string
  'DPS-*': string
  'encdps': string
  'encdps-*': string
  'ENCDPS': string
  'ENCDPS-k': string
  'ENCDPS-m': string
  'ENCDPS-*': string
  'hits': string
  'crithits': string
  'crithit%': string
  'misses': string
  'hitfailed': string
  'swings': string
  'tohit': string
  'TOHIT': string
  'maxhit': string
  'MAXHIT': string
  'maxhit-*': string
  'MAXHIT-*': string
  'healed': string
  'enchps': string
  'enchps-*': string
  'ENCHPS': string
  'ENCHPS-k': string
  'ENCHPS-m': string
  'ENCHPS-*': string
  'heals': string
  'critheals': string
  'critheal%': string
  'cures': string
  'maxheal': string
  'MAXHEAL': string
  'maxhealward': string
  'MAXHEALWARD': string
  'maxheal-*': string
  'MAXHEAL-*': string
  'maxhealward-*': string
  'MAXHEALWARD-*': string
  'damagetaken': string
  'damagetaken-*': string
  'healstaken': string
  'healstaken-*': string
  'powerdrain': string
  'powerdrain-*': string
  'powerheal': string
  'powerheal-*': string
  'kills': string
  'deaths': string
  'CurrentZoneName': string
  'Last10DPS': string
  'Last30DPS': string
  'Last60DPS': string
}
