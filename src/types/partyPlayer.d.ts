export interface Player {
  id: string
  name: string
  inParty: boolean
  job: number
}

export interface PlayerRuntime extends Player {
  rp?: string
}
