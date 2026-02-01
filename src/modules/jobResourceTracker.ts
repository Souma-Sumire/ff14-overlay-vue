import type { ResourceTracker } from '@/types/JobResource'
import { ScholarTracker } from './jobs/scholar'
import { PaladinTracker } from './jobs/paladin'
import { SageTracker } from './jobs/sage'

export class JobResourceManager {
  private allTrackers: Map<number, new () => ResourceTracker> = new Map()
  private activeTrackers: Map<number, ResourceTracker> = new Map()
  
  constructor() {
     this.allTrackers.set(28, ScholarTracker)
     this.allTrackers.set(19, PaladinTracker)
     this.allTrackers.set(40, SageTracker)
  }

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

  public clear() {
    this.activeTrackers.clear()
  }

  public reset() {
    for (const tracker of this.activeTrackers.values()) {
      tracker.reset()
    }
  }

  public processLine(type: string, splitLine: string[]) {
    for (const tracker of this.activeTrackers.values()) {
      tracker.processLine(type, splitLine)
    }
  }

  public getResource(jobEnum: number, characterId: string): number | undefined {
    const tracker = this.activeTrackers.get(jobEnum)
    if (tracker) {
      return tracker.getResource(characterId)
    }
    return undefined
  }

  public isResourceReady(jobEnum: number, characterId: string, skillId: number, cost: number): boolean {
    const tracker = this.activeTrackers.get(jobEnum)
    if (tracker && tracker.isReady) {
      return tracker.isReady(characterId, skillId, cost)
    }
    const resource = this.getResource(jobEnum, characterId) ?? 0
    return resource >= cost
  }

  public getExtraText(jobEnum: number, characterId: string, skillId: number, timestamp: number, allCooldowns: Record<number, number[]>): string {
    const tracker = this.activeTrackers.get(jobEnum)
    if (tracker && tracker.getExtraText) {
      return tracker.getExtraText(characterId, skillId, timestamp, allCooldowns)
    }
    return ''
  }
}
