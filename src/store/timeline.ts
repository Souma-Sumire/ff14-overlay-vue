import type { Job } from '../../cactbot/types/job'
import type { FFIcon } from '@/types/fflogs'
import type {
  ITimeline,
  ITimelineCondition,
  ITimelineLine,
  ShowStyle,
  ShowStyleTranslate,
  TimelineConfigTranslate,
  TimelineConfigValues,
} from '@/types/timeline'
import { ElMessage } from 'element-plus'
import JSON5 from 'json5'
import { defineStore } from 'pinia'
import { bossPhase } from '@/resources/bossPhase'
import { TimelineConfigEnum } from '@/types/timeline'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import Regexes from '../../cactbot/resources/regexes'
import Util from '../utils/util'

class Timeline implements ITimeline {
  constructor(
    name: string,
    condition: ITimelineCondition,
    timeline: string,
    source: string,
  ) {
    if (Util.iconToJobEnum(condition.jobs[0] as FFIcon)) {
      condition.jobs[0] = Util.jobEnumToJob(
        Util.iconToJobEnum(condition.jobs[0] as FFIcon),
      )
    }
    this.name = name
    this.condition = condition
    this.timeline = timeline
    this.source = source
    this.createdAt = new Date().toLocaleString()
  }

  name: string
  condition: ITimelineCondition
  timeline: string
  source: string
  createdAt: string
}

const configTranslate: TimelineConfigTranslate = {
  [TimelineConfigEnum.显示范围]: '显示范围（秒）',
  [TimelineConfigEnum.变色时间]: '提前变色（秒）',
  [TimelineConfigEnum.零后持续]: '后续保持（秒）',
  [TimelineConfigEnum.战前准备]: '倒计时量（秒）',
  [TimelineConfigEnum.TTS提前量]: 'TTS预备（秒）',
  // [TimelineConfigEnum.刷新频率]: "刷新率（毫秒）",
}

const configValues: TimelineConfigValues = {
  [TimelineConfigEnum.显示范围]: 120,
  [TimelineConfigEnum.变色时间]: 2.75,
  [TimelineConfigEnum.零后持续]: 0.5,
  [TimelineConfigEnum.战前准备]: 30,
  [TimelineConfigEnum.TTS提前量]: 1,
  // [TimelineConfigEnum.刷新频率]: 100,
}

const showStyleTranslate: ShowStyleTranslate = {
  '--timeline-width': '时间轴宽度',
  '--font-size': '字体大小',
  '--normal-scale': '等待缩放',
  '--up-coming-scale': '来临缩放',
  '--opacity': '等待不透明度',
  '--tras-duration': '动画时间',
}

const showStyle: ShowStyle = {
  '--timeline-width': 200,
  '--font-size': 16,
  '--opacity': 0.5,
  '--normal-scale': 0.66,
  '--up-coming-scale': 1,
  '--tras-duration': 1,
}

export const useTimelineStore = defineStore('timeline', {
  state: () => {
    return {
      allTimelines: [] as ITimeline[],
      configValues,
      configTranslate,
      settings: { api: '' },
      filters: {} as Record<string, number[]>,
      showStyle,
      showStyleTranslate,
      jobList: [...Util.getBattleJobs3(), 'NONE'] as Job[],
    }
  },
  getters: {},
  actions: {
    // 兼容以前的job字段，10年后删除
    normalizeTimeline(timeline: any) {
      if (timeline.condition.job && !timeline.condition.jobs) {
        timeline.condition.jobs = [timeline.condition.job]
        Reflect.deleteProperty(timeline.condition, 'job')
      }
      if (timeline.condition.zoneId && !timeline.condition.zoneID) {
        timeline.condition.zoneID = timeline.condition.zoneId
        Reflect.deleteProperty(timeline.condition, 'zoneId')
      }
      if (timeline.codeFight && !timeline.source) {
        timeline.source = timeline.codeFight
        Reflect.deleteProperty(timeline, 'codeFight')
      }
      if (timeline.create && !timeline.createdAt) {
        timeline.createdAt = timeline.create
        Reflect.deleteProperty(timeline, 'create')
      }
      if (
        timeline.condition.jobs?.[0]
        && Util.iconToJobEnum(timeline.condition.jobs[0] as FFIcon)
      ) {
        timeline.condition.jobs[0] = Util.jobEnumToJob(
          Util.iconToJobEnum(timeline.condition.jobs[0] as FFIcon),
        )
      }
      if (timeline.condition.jobs) {
        timeline.condition.jobs.sort(
          (a: Job, b: Job) => this.jobList.indexOf(a) - this.jobList.indexOf(b),
        )
      }
    },

    newTimeline(
      title = 'Demo',
      condition: ITimelineCondition = { zoneID: '0', jobs: ['NONE'], phase: undefined },
      rawTimeline = '',
      source = '用户创建',
    ): number {
      this.allTimelines.push(
        new Timeline(title, condition, rawTimeline, source),
      )
      this.sortTimelines()
      ElMessage.success('新建时间轴成功')
      const result = this.allTimelines.findIndex(
        t =>
          t.timeline === rawTimeline
          && t.name === title
          && JSON.stringify(t.condition) === JSON.stringify(condition)
          && t.source === source,
      )
      return result
    },
    getTimeline(playerState: ITimelineCondition): ITimeline[] {
      return this.allTimelines.filter((t) => {
        return (
          (Number(t.condition.zoneID) === 0
            || Number(t.condition.zoneID) === Number(playerState.zoneID))
          && (t.condition.jobs.includes('NONE')
            || t.condition.jobs.includes(playerState.jobs[0]!))
          && (t.condition.phase === undefined
            || (t.condition.phase === playerState.phase && bossPhase[playerState.zoneID]))
        )
      })
    },
    saveTimelineSettings() {
      try {
        localStorage.setItem(
          'timelines',
          JSON.stringify({
            allTimelines: this.allTimelines,
            configValues: this.configValues,
            settings: this.settings,
            showStyle: this.showStyle,
            filters: this.filters,
          }),
        )
      }
      catch (e) {
        console.error('Failed to save timeline settings:', e)
        ElMessage.error('保存时间轴设置失败')
      }
    },
    loadTimelineSettings() {
      const ls = localStorage.getItem('timelines')
      if (ls) {
        Object.assign(this, JSON.parse(ls))
        this.allTimelines.forEach((timeline) => {
          this.normalizeTimeline(timeline)
        })
        this.sortTimelines()
      }
      try {
        const ls = localStorage.getItem('timelines')
        if (ls) {
          Object.assign(this, JSON.parse(ls))
          this.allTimelines.forEach((timeline) => {
            this.normalizeTimeline(timeline)
          })
          this.sortTimelines()
        }
      }
      catch (e) {
        console.error('Failed to load timeline settings:', e)
        ElMessage.error('加载时间轴设置失败')
      }
    },
    sortTimelines() {
      for (const timeline of this.allTimelines) {
        this.normalizeTimeline(timeline)
      }
      this.allTimelines.sort((a, b) => {
        // 1. 地图ID
        const mapDiff = Number(a.condition.zoneID) - Number(b.condition.zoneID)
        if (mapDiff !== 0)
          return mapDiff

        // 2. 阶段 (无 < 门神 < 本体)
        const phaseWeight = { undefined: 0, door: 1, final: 2 }
        const aPhase = phaseWeight[a.condition.phase as keyof typeof phaseWeight] ?? 0
        const bPhase = phaseWeight[b.condition.phase as keyof typeof phaseWeight] ?? 0
        if (aPhase !== bPhase)
          return aPhase - bPhase

        // 3. 职业
        const jobDiff
          = Util.jobToJobEnum(a.condition.jobs[0]!)
            - Util.jobToJobEnum(b.condition.jobs[0]!)
        if (jobDiff !== 0)
          return jobDiff

        // 4. 名称
        return a.name.localeCompare(b.name)
      })
    },
    updateFilters(target: string, value: number[]) {
      this.filters[target] = value
    },
  },
})

function parseTime(time: string): number {
  const timeFormatType = time.match(
    /^(?<negative>-)?(?<mm>\d+):(?<ss>\d+(?:\.\d*)?)$/,
  )
  if (timeFormatType) {
    const minutes = Number(timeFormatType.groups?.mm || '0')
    const seconds = Number(timeFormatType.groups?.ss || '0')
    const sign = timeFormatType.groups?.negative ? -1 : 1
    return sign * (minutes * 60 + seconds)
  }
  return Number.parseFloat(time)
}

export function parseAction(text: string) {
  return text.matchAll(/<(?<name>[^<>]*?)!?>(?<repeat>~)?/g)
}

const syncRegex = new RegExp(
  `(?:[^#]*?\\s)?(?<netRegexType>${Object.keys(logDefinitions).join(
    '|',
  )})\\s*(?<netRegex>\\{.*\\})(?<args>\\s.*)?$`,
)

const regexStr = {
  ActorControl: 'network6d',
  StartsUsing: 'startsUsing',
  Ability: 'ability',
  InCombat: 'inCombat',
}

export async function parseTimeline(
  rawTimeline: string,
): Promise<ITimelineLine[]> {
  const total: ITimelineLine[] = []
  const matches = [
    ...rawTimeline.matchAll(
      /^\s*(?<time>[-:：\d.]+)\s+(?<action>["'“”][^"'“”]*["'“”]).*$/gm,
    ),
  ]
  for (let i = 0; i < matches.length; i++) {
    let sync: RegExp | undefined
    let onceSync: boolean = false
    const match = matches[i]!
    const jump = match[0].match(/(?<=jump ?)[-:：\d.]+/)?.[0]
    const normalSync = match[0].match(/(?<=sync(?:\.once)? ?\/).+(?=\/)/)?.[0]
    const normalOnce = /sync\.once/.test(match[0])
    const windowBefore = match[0].match(/(?<=window ?)[-:：\d.]+/)?.[0]
    const windowAfter = match[0].match(
      /(?<=window ?[-:：\d.]+,)[-:：\d.]+/,
    )?.[0]
    const tts = match[0].match(/ tts ?["'“”](?<tts>[^"'“”]+)["'“”]/)?.groups?.tts
    const ttsSim = / tts(?: |$)/.test(match[0])
      ? Array.from(parseAction(match.groups?.action ?? ''))
          .map(item => item?.groups?.name)
          .filter(Boolean)
          .join(', ')
      : undefined
    const cactbotSync = syncRegex.exec(match[0])?.groups
    const cactbotRegexType = cactbotSync?.netRegexType
    let params = {} as any
    try {
      params = JSON5.parse(cactbotSync?.netRegex ?? '{}')
    }
    catch (e) {
      ElMessage.error({
        type: 'error',
        message: `“${match[0] ?? ''}”解析失败：${e}`,
      })
      break
    }
    Reflect.deleteProperty(params, 'source')
    if (cactbotRegexType) {
      try {
        const key
          = regexStr[cactbotRegexType as keyof typeof regexStr]
            ?? (cactbotRegexType.toLowerCase() as keyof typeof Regexes)
        onceSync = / once/.test(match[0]) || params.once
        Reflect.deleteProperty(params, 'once')
        const regex = Regexes[key as keyof typeof Regexes] as (
          params: unknown,
        ) => RegExp
        sync = regex({ ...params, capture: false })
      }
      catch (e) {
        console.error(`Failed to parse ${cactbotRegexType} regex:`, e)
      }
    }
    else {
      sync = normalSync ? new RegExp(normalSync) : undefined
      onceSync = normalOnce
    }

    total.push({
      time: parseTime(match.groups?.time ?? '0'),
      action: match.groups?.action || '',
      alertAlready: false,
      sync,
      syncOnce: onceSync,
      syncAlready: false,
      show: !sync,
      windowBefore: Number.parseFloat(windowBefore || windowAfter || '2.5'),
      windowAfter: Number.parseFloat(windowAfter || windowBefore || '2.5'),
      jump: jump ? Number.parseFloat(jump) : undefined,
      tts: sync ? undefined : tts || ttsSim,
    })
  }
  total.sort((a, b) => a.time - b.time)
  return total
}
