import type { ResourceTracker } from '@/types/JobResource'
import { DarkKnightTracker } from './jobs/darkKnight'
import { PaladinTracker } from './jobs/paladin'
import { PictomancerTracker } from './jobs/pictomancer'
import { SageTracker } from './jobs/sage'
import { ScholarTracker } from './jobs/scholar'

interface JobResourceTrackerDefinition {
  job: number
  tracker: new () => ResourceTracker
  resourceCostName?: string
}

const JOB_RESOURCE_TRACKER_DEFINITIONS: JobResourceTrackerDefinition[] = [
  { job: 28, tracker: ScholarTracker, resourceCostName: '以太超流' }, // SCH
  { job: 19, tracker: PaladinTracker, resourceCostName: '忠义量谱' }, // PLD
  { job: 40, tracker: SageTracker, resourceCostName: '蛇胆' }, // SGE
  { job: 32, tracker: DarkKnightTracker, resourceCostName: '魔力(MP)' }, // DRK
  { job: 42, tracker: PictomancerTracker }, // PCT
]

export const JOB_RESOURCE_TRACKER_SUPPORTED_JOBS = new Set<number>(
  JOB_RESOURCE_TRACKER_DEFINITIONS.map(item => item.job),
)

export const JOB_RESOURCE_COST_NAME_BY_JOB: Record<number, string> = Object.fromEntries(
  JOB_RESOURCE_TRACKER_DEFINITIONS
    .filter((item): item is JobResourceTrackerDefinition & { resourceCostName: string } => !!item.resourceCostName)
    .map(item => [item.job, item.resourceCostName]),
) as Record<number, string>

export function hasJobResourceTracker(job: number) {
  return JOB_RESOURCE_TRACKER_SUPPORTED_JOBS.has(job)
}

export function hasJobResourceCostTracker(job: number) {
  return job in JOB_RESOURCE_COST_NAME_BY_JOB
}

export function getJobResourceCostName(job: number) {
  return JOB_RESOURCE_COST_NAME_BY_JOB[job] ?? ''
}

/**
 * 职业资源管理器
 * 负责统一管理不同职业的量谱模拟器 (Tracker)，并提供统一的资源查询 API
 */
export class JobResourceManager {
  private allTrackers: Map<number, new () => ResourceTracker> = new Map()
  private activeTrackers: Map<number, ResourceTracker> = new Map()

  constructor() {
    JOB_RESOURCE_TRACKER_DEFINITIONS.forEach(({ job, tracker }) => {
      this.allTrackers.set(job, tracker)
    })
  }

  /** 根据当前队伍职业动态开启 Tracker */
  public updateParty(partyInfo: Map<number, string[]>) {
    // 仅添加新出现的职业 Tracker，不移除已存在的（防止战斗中因小队变动导致数据丢失）
    for (const [job, ids] of partyInfo.entries()) {
      const TrackerClass = this.allTrackers.get(job)
      if (TrackerClass) {
        if (!this.activeTrackers.has(job)) {
          this.activeTrackers.set(job, new TrackerClass())
        }
        const tracker = this.activeTrackers.get(job)!
        tracker.updateTrackedPlayers(ids)
      }
    }
  }

  /** 完全清空所有 Tracker 实例（通常在战斗结束或页面切换时） */
  public clear() {
    this.activeTrackers.clear()
  }

  /** 重置所有活跃 Tracker 的数据状态（不销毁实例） */
  public reset() {
    for (const tracker of this.activeTrackers.values()) {
      tracker.reset()
    }
  }

  /** 将日志行分发给所有活跃的 Tracker */
  public processLine(type: string, splitLine: string[], cooldownTracker?: Record<string, Record<number, number[]>>) {
    for (const tracker of this.activeTrackers.values()) {
      tracker.processLine(type, splitLine, cooldownTracker)
    }
  }

  /** 获取指定职业角色的资源数值 */
  public getResource(jobEnum: number, characterId: string): number | undefined {
    const tracker = this.activeTrackers.get(jobEnum)
    if (tracker) {
      return tracker.getResource(characterId)
    }
    return undefined
  }

  /**
   * 判定资源是否满足技能要求
   * 优先使用 Tracker 的自定义逻辑，否则回退到通用的消耗判定
   */
  public isResourceReady(jobEnum: number, characterId: string, skillId: number, cost: number): boolean {
    const tracker = this.activeTrackers.get(jobEnum)
    if (tracker && tracker.isReady) {
      return tracker.isReady(characterId, skillId, cost)
    }
    const resource = this.getResource(jobEnum, characterId) ?? 0
    return resource >= cost
  }

  /** 获取技能图标上需要显示的额外文本 */
  public getExtraText(jobEnum: number, characterId: string, skillId: number, timestamp: number, allCooldowns: Record<number, number[]>): string {
    const tracker = this.activeTrackers.get(jobEnum)
    if (tracker && tracker.getExtraText) {
      return tracker.getExtraText(characterId, skillId, timestamp, allCooldowns)
    }
    return ''
  }
}
