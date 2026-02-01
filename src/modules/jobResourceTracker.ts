import type { ResourceTracker } from '@/types/JobResource'
import { ScholarTracker } from './jobs/scholar'
import { PaladinTracker } from './jobs/paladin'
import { SageTracker } from './jobs/sage'

export class JobResourceManager {
  private trackers: Map<number, ResourceTracker> = new Map()
  
  constructor() {
     // 注册 SCH (28) 的 Tracker
     this.trackers.set(28, new ScholarTracker())
     // 注册 PLD (19) 的 Tracker
     this.trackers.set(19, new PaladinTracker())
     // 注册 SGE (40) 的 Tracker
     this.trackers.set(40, new SageTracker())
  }

  public reset() {
    for (const tracker of this.trackers.values()) {
      tracker.reset()
    }
  }

  public processLine(type: string, splitLine: string[]) {
    for (const tracker of this.trackers.values()) {
      tracker.processLine(type, splitLine)
    }
  }

  public getResource(jobEnum: number, characterId: string): number | undefined {
    const tracker = this.trackers.get(jobEnum)
    if (tracker) {
      return tracker.getResource(characterId)
    }
    return undefined
  }
}
