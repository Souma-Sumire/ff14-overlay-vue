export interface FflogsjsonReport {
  lang: string
  fights: Fight[]
  friendlies: Friendly[]
  enemies: Enemy[]
  enemyPets: unknown[]
  phases: unknown[]
  logVersion: number
  gameVersion: number
  title: string
  owner: string
  start: number
  end: number
  zone: number
}
export interface Fight {
  id: number
  boss: number
  start_time: number
  end_time: number
  name: string
  zoneID: number
  zoneName: string
  zoneCounter: number
  size?: number
  difficulty?: number
  kill?: boolean
  partial?: number
  inProgress?: boolean
  standardComposition?: boolean
  hasEcho?: boolean
  bossPercentage?: number
  fightPercentage?: number
  lastPhaseAsAbsoluteIndex?: number
  lastPhaseForPercentageDisplay?: number
  maps?: {
    mapID: number
    mapName: string
    mapFile: string
  }[]
  originalBoss?: number
}
export interface Friendly {
  name: string
  id: number
  guid: number
  type: string
  server?: string
  icon: string
  fights: Fight[]
}
export interface Enemy {
  name: string
  id: number
  guid: number
  type: string
  icon: string
  fights: Fight[]
}
export interface FflogsjsonCast {
  events: CastEvent[]
  count: number
  auraAbilities: AuraAbilities[]
  nextPageTimestamp?: number
}
export interface AuraAbilities {
  name: string
  guid: number
  type: number
  abilityIcon: string
}
export interface CastEvent {
  timestamp: number
  type: string
  sourceID: number
  sourceIsFriendly: boolean
  targetID?: number
  targetIsFriendly: boolean
  ability: Ability
  fight: number
  duration?: number
  target?: Target
  sourceResources?: SourceResources
  targetResources?: SourceResources
}

export interface SourceResources {
  hitPoints: number
  maxHitPoints: number
  mp: number
  maxMP: number
  tp: number
  maxTP: number
  x: number
  y: number
  facing: number
  absorb: number
}

export interface Target {
  name: string
  id: number
  guid: number
  type: string
  icon: string
}

export interface Ability {
  name: string
  guid: number
  type: number
  abilityIcon: string
}
export interface FflogsjsonDamageTaken {
  events: TakenEvent[]
  count: number
  auraAbilities: Ability[]
  nextPageTimestamp?: number
}
export interface TakenEvent {
  timestamp: number
  type: string
  sourceID: number
  sourceIsFriendly: boolean
  targetID: number
  targetIsFriendly: boolean
  ability: Ability
  fight: number
  buffs?: string
  hitType: number
  amount: number
  multiplier?: number
  packetID?: number
  sourceResources?: SourceResources
  targetResources: TargetResources
  absorbed?: number
  sourceInstance?: number
  unmitigatedAmount?: number
  mitigated?: number
  blocked?: number
  unpaired?: boolean
}
interface TargetResources {
  hitPoints: number
  maxHitPoints: number
  mp: number
  maxMP: number
  tp: number
  maxTP: number
  x: number
  y: number
  facing: number
  absorb: number
}
export enum AbilityDamageType {
  特殊 = 32,
  DOT = 64,
  物理 = 128,
  魔法 = 1024,
}
