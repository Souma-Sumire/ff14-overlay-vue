export interface Food {
  expiredMillisecond: number
  durationSeconds: number
  name: string
  hq: boolean
  params: {
    Params: string
    Value: string
    Max: string
    'Value{HQ}': string
    'Max{HQ}': string
  }[]
  level: number
}

export interface Players {
  id: string
  name: string
  food: Food | undefined
  jobName: string
}
