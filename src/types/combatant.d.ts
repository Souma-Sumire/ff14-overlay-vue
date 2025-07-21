export interface CombatantState {
  OwnerID: number
  Type: number
  MonsterType: number
  Status: number
  AggressionStatus: number
  IsTargetable: boolean
  Name: string
  Radius: number
  BNpcID: number
  CurrentMP: number
  IsCasting1: number
  BNpcNameID: number
  TransformationId: number
  WeaponId: number
  TargetID: number
  ModelStatus: number
  ID: number
  Job: number
  CurrentHP: number
  MaxHP: number
  PosX: number
  PosY: number
  PosZ: number
  Heading: number
  Distance: null
  EffectiveDistance: null
  Effects: CombatantStateEffect[]
  MaxMP: number
  Level: number
  WorldID: number
  CurrentWorldID: number
  NPCTargetID: number
  CurrentGP: number
  MaxGP: number
  CurrentCP: number
  MaxCP: number
  PCTargetID: number
  IsCasting2: number
  CastBuffID: number
  CastTargetID: number
  CastGroundTargetX: number
  CastGroundTargetY: number
  CastGroundTargetZ: number
  CastDurationCurrent: number
  CastDurationMax: number
  PartyType: number
  WorldName: string
}

export interface CombatantStateEffect {
  BuffID: number
  Stack: number
  Timer: number
  ActorID: number
  isOwner: boolean
}
