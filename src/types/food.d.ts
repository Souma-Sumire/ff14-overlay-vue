export interface Food {
  expiredMillisecond: number
  durationSeconds: number
  name: string
  hq: boolean
  params: {
    'Params': string
    'Value': string
    'Max': string
    'Value{HQ}': string
    'Max{HQ}': string
  }[]
  level: number
}

export interface Medicine {
  name: string
  hq: boolean
  grade: string | undefined
  shortName: string
  type: string
}

export interface Players {
  id: string
  name: string
  food: Food | undefined
  medicine: Medicine[]
  jobName: string
}
