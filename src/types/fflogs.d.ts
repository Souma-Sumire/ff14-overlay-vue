export type FFIcon =
  | 'NONE'
  | 'Gladiator'
  | 'Pugilist'
  | 'Marauder'
  | 'Lancer'
  | 'Archer'
  | 'Conjurer'
  | 'Thaumaturge'
  | 'Carpenter'
  | 'Blacksmith'
  | 'Armorer'
  | 'Goldsmith'
  | 'Leatherworker'
  | 'Weaver'
  | 'Alchemist'
  | 'Culinarian'
  | 'Miner'
  | 'Botanist'
  | 'Fisher'
  | 'Paladin'
  | 'Monk'
  | 'Warrior'
  | 'Dragoon'
  | 'Bard'
  | 'WhiteMage'
  | 'BlackMage'
  | 'Arcanist'
  | 'Summoner'
  | 'Scholar'
  | 'Rogue'
  | 'Ninja'
  | 'Machinist'
  | 'DarkKnight'
  | 'Astrologian'
  | 'Samurai'
  | 'RedMage'
  | 'BlueMage'
  | 'Gunbreaker'
  | 'Dancer'
  | 'Reaper'
  | 'Sage'
  | 'Viper'
  | 'Pictomancer'

export interface Friendlies {
  guid: number
  icon: string
  id: number
  name: string
  server: string
  fights: [{ id: number }]
}
export type FFlogsType = 'begincast' | 'cast'
export type FFlogsView =
  | 'summary'
  | 'damage-done'
  | 'damage-taken'
  | 'healing'
  | 'casts'
  | 'summons'
  | 'buffs'
  | 'debuffs'
  | 'deaths'
  | 'threat'
  | 'resources'
  | 'interrupts'
  | 'dispels'

export type FFlogsStance = {
  time: number
  type: FFlogsType
  actionName: string
  actionId: number
  sourceIsFriendly: boolean
  url: string
  window?: Array<number>
  syncOnce?: boolean
}[]

export interface FFlogsQuery {
  code: string
  fightIndex: number
  start: number
  end: number
  friendlies: Friendlies[]
  abilityFilterEvents: FFlogsStance
  abilityFilterCandidate: FFlogsStance
  abilityFilterSelected: number[]
  abilityFilterEventsAfterFilterRawTimeline: string
  zoneID: number
  player?: Friendlies
  bossIDs: number[]
}

export interface FFlogsApiV1ReportEvents {
  ability: { name: string, guid: number, type: number, abilityIcon: string }
  fight: number
  sourceID: number
  sourceIsFriendly: boolean
  sourceResources: {
    absorb: number
    facing: number
    hitPoints: number
    maxHitPoints: number
    mp: number
    maxMP: number
    tp: number
    maxTP: number
    x: number
    y: number
  }
  targetId: number
  targetIsFriendly: boolean
  targetResources: {
    facing: number
    hitPoints: number
    maxHitPoints: number
    mp: number
    maxMP: number
    tp: number
    maxTP: number
    x: number
    y: number
  }
  timestamp: number
  type: FFlogsType
}
