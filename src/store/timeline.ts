import type { FFIcon } from '@/types/fflogs'
import type { Job } from '../../cactbot/types/job'
import {
  type ITimeline,
  type ITimelineCondition,
  type ITimelineLine,
  type ShowStyle,
  type ShowStyleTranslate,
  TimelineConfigEnum,
  type TimelineConfigTranslate,
  type TimelineConfigValues,
} from '@/types/timeline'
import { ElMessage } from 'element-plus'
import { defineStore } from 'pinia'
import Util from '../utils/util'
import '@sweetalert2/theme-bootstrap-4/bootstrap-4.scss'

class Timeline implements ITimeline {
  constructor(
    name: string,
    condition: ITimelineCondition,
    timeline: string,
    codeFight: string,
  ) {
    if (Util.iconToJobEnum(condition.jobs[0] as FFIcon)) {
      // 突然有一天数据格式不一致了 可能是fflogs改返回值了?
      condition.jobs[0] = Util.jobEnumToJob(Util.iconToJobEnum(condition.jobs[0] as FFIcon))
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
      // reg: reg,
      // timelineLegalRegular: new RegExp(reg, "gm"),
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
    newTimeline(
      title = 'Demo',
      condition: ITimelineCondition = { zoneId: '0', jobs: ['NONE'] },
      rawTimeline = `# 注释的内容不会被解析
# "<技能名>"会被解析为图片 紧接着一个波浪线可快捷重复技能名
-20 "<中间学派>~刷盾"
0 "战斗开始" tts "冲呀"
# 当sync在window的范围内被满足时将进行时间同步
30 "一运" sync / 14:4.{7}:[^:]*:AAAA:/ window 2.5,2.5
# 当存在jump时会进跳转至jump时间
50 "变异化型:蛇" sync / 14:4.{7}:[^:]*:BBBB:/ window 2.5,2.5 jump 1000
50 "变异化型:兽" sync / 14:4.{7}:[^:]*:CCCC:/ window 2.5,2.5 jump 2000
1000 "蛇轴"
2000 "兽轴"
`,
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
          && (t.condition.jobs.includes('NONE') || t.condition.jobs.includes(playerState.jobs[0]))
        )
      })
    },
    saveTimelineSettings() {
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
    },
    loadTimelineSettings() {
      const ls = localStorage.getItem('timelines')
      if (ls) {
        Object.assign(this, JSON.parse(ls))
        this.sortTimelines()
      }

      for (const v of this.allTimelines) {
        if (v.condition.jobs === undefined) {
          v.condition.jobs = [(v.condition as any).job]
        }
        v.condition.jobs.sort((a, b) => this.jobList.indexOf(a) - this.jobList.indexOf(b))
        if (Util.iconToJobEnum(v.condition.jobs[0] as FFIcon)) {
          v.condition.jobs[0] = Util.jobEnumToJob(
            Util.iconToJobEnum(v.condition.jobs[0] as FFIcon),
          )
        }
      }
    },
    sortTimelines() {
      for (const v of this.allTimelines) {
        if (v.condition.jobs === undefined) {
          v.condition.jobs = [(v.condition as any).job]
        }
        v.condition.jobs.sort((a, b) => this.jobList.indexOf(a) - this.jobList.indexOf(b))
        Reflect.deleteProperty(v.condition, 'job')
      }
      this.allTimelines.sort((a, b) => {
        const mapDiff = Number(a.condition.zoneId) - Number(b.condition.zoneId)
        if (mapDiff !== 0) {
          return mapDiff
        }
        const nameDiff = a.name.localeCompare(b.name)
        if (nameDiff !== 0) {
          return nameDiff
        }
        const jobDiff = Util.jobToJobEnum(a.condition.jobs[0])
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
    /^(?<negative>-)?(?<mm>[^:：]+):(?<ss>[^:：]+)$/,
  )
  if (timeFormatType) {
    return (
      Number.parseFloat(timeFormatType.groups?.mm ?? '0') * 60
      + Number.parseFloat(timeFormatType.groups?.ss ?? '0')
      * (timeFormatType.groups?.negative ? -1 : 1)
    )
  }
  return Number.parseFloat(time)
}
export function parseAction(text: string) {
  return text.matchAll(/<(?<name>[^<>]*?)!?>(?<repeat>~)?/g)
}

export async function parseTimeline(
  rawTimeline: string,
): Promise<ITimelineLine[]> {
  const total: ITimelineLine[] = []
  const matchs = [
    ...rawTimeline.matchAll(
      // eslint-disable-next-line regexp/no-super-linear-backtracking
      /^\s*(?<time>[-:：\d.]+)\s+(?<action>(?:--|["'“”])[^"'\n]+?(?:--|["'“”])).*$/gm,
    ),
  ]
  for (let i = 0; i < matchs.length; i++) {
    const match = matchs[i]
    const jump = match[0].match(/(?<=jump ?)[-:：\d.]+/)?.[0]
    const sync = match[0].match(/(?<=sync(?:\.once)? ?\/).+(?=\/)/)?.[0]
    const syncOnce = /sync\.once/.test(match[0])
    const windowBefore = match[0].match(/(?<=window ?)[-:：\d.]+/)?.[0]
    const windowAfter = match[0].match(
      /(?<=window ?[-:：\d.]+,)[-:：\d.]+/,
    )?.[0]
    const tts = match[0].match(/ tts ?["'“”](?<tts>[^"'“”]+)["'“”]/)?.groups?.tts
    const ttsSim = / tts(?: |$)/.test(match[0])
      ? Array.from(parseAction(match.groups?.action ?? ''))?.[0]?.groups?.name
      : undefined

    total.push({
      time: parseTime(match.groups?.time ?? '0'),
      action: match.groups?.action || '',
      alertAlready: false,
      sync: sync ? new RegExp(sync) : undefined,
      syncOnce,
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
