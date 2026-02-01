import type { ResourceTracker } from '@/types/JobResource'
import { ScholarTracker } from './jobs/scholar'
import { PaladinTracker } from './jobs/paladin'
import { SageTracker } from './jobs/sage'
import { DarkKnightTracker } from './jobs/darkKnight'
import { PictomancerTracker } from './jobs/pictomancer'

/**
 * 职业资源管理器
 * 负责统一管理不同职业的量谱模拟器 (Tracker)，并提供统一的资源查询 API
 */
export class JobResourceManager {
  private allTrackers: Map<number, new () => ResourceTracker> = new Map()
  private activeTrackers: Map<number, ResourceTracker> = new Map()
  
  constructor() {
     this.allTrackers.set(28, ScholarTracker)
     this.allTrackers.set(19, PaladinTracker)
     this.allTrackers.set(40, SageTracker)
     this.allTrackers.set(32, DarkKnightTracker)
     this.allTrackers.set(42, PictomancerTracker)
  }

  /** 根据当前队伍职业动态开启 Tracker */
  public updateParty(jobEnums: Iterable<number>) {
    const jobSet = new Set(jobEnums)
    
    // 仅添加新出现的职业 Tracker，不移除已存在的（防止战斗中因小队变动导致数据丢失）
    for (const job of jobSet) {
      const TrackerClass = this.allTrackers.get(job)
      if (TrackerClass && !this.activeTrackers.has(job)) {
        this.activeTrackers.set(job, new TrackerClass())
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
