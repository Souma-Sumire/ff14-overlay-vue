import type { PostNamazuCall } from '../../cactbot/types/event'

export interface WayMarkInfo {
  X: number
  Y: number
  Z: number
  Active: boolean
  ID?: number
}
export type WayMarkKeys =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'One'
  | 'Two'
  | 'Three'
  | 'Four'

export type WayMarkJSON = Partial<{ [key in WayMarkKeys]?: WayMarkInfo }>
export type PPJSON = WayMarkJSON & { Name?: string, MapID?: number }

export type QueueArr = {
  c: Exclude<PostNamazuCall, 'DoQueueActions'> | 'qid' | 'stop'
  p: string
  d?: number
}[]

export type Slot =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
