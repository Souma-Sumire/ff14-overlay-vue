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
import { TimelineConfigEnum } from '@/types/timeline'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import Regexes from '../../cactbot/resources/regexes'
import Util from '../utils/util'

class Timeline implements ITimeline {
  constructor(
    name: string,
    condition: ITimelineCondition,
    timeline: string,
    codeFight: string,
  ) {
    if (Util.iconToJobEnum(condition.jobs[0] as FFIcon)) {
      // 突然有一天数据格式不一致了 可能是fflogs改返回值了?
      condition.jobs[0] = Util.jobEnumToJob(
        Util.iconToJobEnum(condition.jobs[0] as FFIcon),
      )
    }
    this.name = name
    this.condition = condition
    this.timeline = timeline
    this.codeFight = codeFight
    this.create = new Date().toLocaleString()
  }

  name: string
  condition: ITimelineCondition
  timeline: string
  codeFight: string
  create: string
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
    normalizeJobConditions(timeline: ITimeline) {
      if (!timeline.condition.jobs) {
        timeline.condition.jobs = [(timeline.condition as any).job]
        Reflect.deleteProperty(timeline.condition, 'job')
      }
      timeline.condition.jobs.sort(
        (a, b) => this.jobList.indexOf(a) - this.jobList.indexOf(b),
      )
      if (
        timeline.condition.jobs[0]
        && Util.iconToJobEnum(timeline.condition.jobs[0] as FFIcon)
      ) {
        timeline.condition.jobs[0] = Util.jobEnumToJob(
          Util.iconToJobEnum(timeline.condition.jobs[0] as FFIcon),
        )
      }
    },

    newTimeline(
      title = 'Demo',
      condition: ITimelineCondition = { zoneId: '0', jobs: ['NONE'] },
      rawTimeline = '',
      codeFight = '用户创建',
    ): number {
      this.allTimelines.push(
        new Timeline(title, condition, rawTimeline, codeFight),
      )
      this.sortTimelines()
      ElMessage.success('新建时间轴成功')
      // 如果严谨点应该还要比较create 但重复的demo选错又能怎么样呢
      const result = this.allTimelines.findIndex(
        t =>
          t.timeline === rawTimeline
          && t.name === title
          && JSON.stringify(t.condition) === JSON.stringify(condition)
          && t.codeFight === codeFight,
      )
      return result
    },
    getTimeline(playerState: ITimelineCondition): ITimeline[] {
      return this.allTimelines.filter((t) => {
        return (
          (t.condition.zoneId === '0'
            || t.condition.zoneId === playerState.zoneId)
          && (t.condition.jobs.includes('NONE')
            || t.condition.jobs.includes(playerState.jobs[0]))
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
          this.normalizeJobConditions(timeline)
        })
        this.sortTimelines()
      }
      try {
        const ls = localStorage.getItem('timelines')
        if (ls) {
          Object.assign(this, JSON.parse(ls))
          this.allTimelines.forEach((timeline) => {
            this.normalizeJobConditions(timeline)
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
      this.allTimelines.forEach((timeline) => {
        this.normalizeJobConditions(timeline)
      })
      this.allTimelines.sort((a, b) => {
        const mapDiff = Number(a.condition.zoneId) - Number(b.condition.zoneId)
        if (mapDiff !== 0) {
          return mapDiff
        }
        const nameDiff = a.name.localeCompare(b.name)
        if (nameDiff !== 0) {
          return nameDiff
        }
        const jobDiff
          = Util.jobToJobEnum(a.condition.jobs[0])
            - Util.jobToJobEnum(b.condition.jobs[0])
        if (jobDiff !== 0) {
          return jobDiff
        }
        return a.create.localeCompare(b.create)
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
  `(?:[^#]*?\\s)?(?<netRegexType>${Object.keys(logDefinitions).join('|')
  })\\s*(?<netRegex>\\{.*\\})(?<args>\\s.*)?$`,
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
      // eslint-disable-next-line regexp/no-super-linear-backtracking
      /^\s*(?<time>[-:：\d.]+)\s+(?<action>(?:--|["'“”])[^"'\n]+?(?:--|["'“”])).*$/gm,
    ),
  ]
  for (let i = 0; i < matches.length; i++) {
    let sync: RegExp | undefined
    let onceSync: boolean = false
    const match = matches[i]
    const jump = match[0].match(/(?<=jump ?)[-:：\d.]+/)?.[0]
    const normalSync = match[0].match(/(?<=sync(?:\.once)? ?\/).+(?=\/)/)?.[0]
    const normalOnce = /sync\.once/.test(match[0])
    const windowBefore = match[0].match(/(?<=window ?)[-:：\d.]+/)?.[0]
    const windowAfter = match[0].match(
      /(?<=window ?[-:：\d.]+,)[-:：\d.]+/,
    )?.[0]
    const tts = match[0].match(/ tts ?["'“”](?<tts>[^"'“”]+)["'“”]/)?.groups?.tts
    const ttsSim = / tts(?: |$)/.test(match[0])
      ? Array.from(parseAction(match.groups?.action ?? ''))?.[0]?.groups?.name
      : undefined
    const cactbotSync = syncRegex.exec(match[0])?.groups
    const cactbotRegexType = cactbotSync?.netRegexType
    let params: any = {}
    try {
      params = JSON5.parse(cactbotSync?.netRegex ?? '{}')
    }
    catch (e) {
      ElMessage.error({ type: 'error', message: `“${match[0] ?? ''}”解析失败：${e}` })
      break
    }
    Reflect.deleteProperty(params, 'source')
    if (cactbotRegexType) {
      try {
        const key = regexStr[cactbotRegexType as keyof typeof regexStr] ?? cactbotRegexType.toLowerCase() as keyof typeof Regexes
        const regex = Regexes[key as keyof typeof Regexes] as (params: any) => RegExp
        const { once, ...paramsWithoutOnce } = params
        const result: RegExp = regex({ ...paramsWithoutOnce, capture: false })
        sync = result
        onceSync = once
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
      tts: tts || ttsSim,
    })
  }
  total.sort((a, b) => a.time - b.time)
  return total
}
