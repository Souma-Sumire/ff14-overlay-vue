import type { Job } from 'cactbot/types/job'

export interface ITimeline {
  name: string
  condition: ITimelineCondition
  timeline: string
  codeFight: string
  create: string
}

export interface ITimelineCondition {
  zoneId: string // 0=true
  jobs: Job[] // JobEnum.NONE=true
}

export interface ITimelineLine {
  time: number
  action: string
  sync?: RegExp
  syncOnce?: boolean
  syncAlready?: boolean
  show: boolean
  windowBefore: number
  windowAfter: number
  jump?: number
  alertAlready: boolean
  tts?: string
}

export enum TimelineConfigEnum {
  显示范围 = 'displayDuration',
  变色时间 = 'discoloration',
  零后持续 = 'hold',
  战前准备 = 'preBattle',
  TTS提前量 = 'ttsAdvance',
}

export type TimelineConfigTranslate = Record<TimelineConfigEnum, string>
export type TimelineConfigValues = Record<TimelineConfigEnum, number>
export type ShowStyleTranslate = Record<ShowStyleConfigEnum, string>
export type ShowStyle = Record<ShowStyleConfigEnum, number>
export enum ShowStyleConfigEnum {
  总宽度 = '--timeline-width',
  未到来缩放 = '--normal-scale',
  即将到来缩放 = '--up-coming-scale',
  字体尺寸 = '--font-size',
  变色动画时间 = '--tras-duration',
  未到来不透明度 = '--opacity',
}
