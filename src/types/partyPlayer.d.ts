interface Player {
  id: string
  name: string
  inParty: boolean
  job: number
  level: number
}

interface PlayerRuntime extends Player {
  rp?: string
}

type Role = 'tank' | 'healer' | 'dps'

export { type Player, type PlayerRuntime, type Role }
