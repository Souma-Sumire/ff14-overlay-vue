import logDefinitions from '../../cactbot/resources/netlog_defs'

export interface ResourceTracker {
  reset(): void
  processLine(type: string, splitLine: string[]): void
  getResource(characterId: string): number | undefined
}

// SCH Tracker
const SCH_ACTION_IDS = {
  AETHERFLOW: 166,
  DISSIPATION: 3587,
  ENERGY_DRAIN: 167,
  INDOMITABILITY: 3583,
  SACRED_SOIL: 188,
  EXCOGITATION: 7434,
}

const SCH_STATUS_IDS = {
  RECITATION: 1896,
}

class AetherflowTracker implements ResourceTracker {
  // characterId -> current stacks (0-3)
  private stacks: Record<string, number> = {}
  // characterId -> has recitation buff
  private recitation: Record<string, boolean> = {}

  public reset() {
    this.stacks = {}
    this.recitation = {}
  }

  public getResource(characterId: string): number | undefined {
    return this.stacks[characterId] ?? 0
  }

  public processLine(type: string, splitLine: string[]) {
    switch (type) {
      case '21': // Ability
      case '22':
        {
          const sourceId = splitLine[logDefinitions.Ability.fields.sourceId]!
          const id = parseInt(splitLine[logDefinitions.Ability.fields.id]!, 16)

          // 获得以太超流: 以太超流(166) 或 转化(3587)
          if (id === SCH_ACTION_IDS.AETHERFLOW || id === SCH_ACTION_IDS.DISSIPATION) {
             this.stacks[sourceId] = 3
             return
          }

          // 消耗以太超流
          const isRecitationActive = this.recitation[sourceId]
          
          if (id === SCH_ACTION_IDS.INDOMITABILITY || id === SCH_ACTION_IDS.EXCOGITATION) {
            if (!isRecitationActive) {
               this.consumeStack(sourceId)
            }
          } else if (id === SCH_ACTION_IDS.ENERGY_DRAIN || id === SCH_ACTION_IDS.SACRED_SOIL) {
            this.consumeStack(sourceId)
          }
        }
        break
      
      case '26': // GainsEffect
        {
           const effectId = parseInt(splitLine[logDefinitions.GainsEffect.fields.effectId]!, 16)
           if (effectId === SCH_STATUS_IDS.RECITATION) {
             const targetId = splitLine[logDefinitions.GainsEffect.fields.targetId]!
             this.recitation[targetId] = true
           }
        }
        break

      case '30': // LosesEffect
        {
            const effectId = parseInt(splitLine[logDefinitions.LosesEffect.fields.effectId]!, 16)
            if (effectId === SCH_STATUS_IDS.RECITATION) {
              const targetId = splitLine[logDefinitions.LosesEffect.fields.targetId]!
              delete this.recitation[targetId]
            }
        }
        break

      case '25': // Death
        {
            const targetId = splitLine[logDefinitions.WasDefeated.fields.targetId]!
            this.stacks[targetId] = 0
        }
        break
    }
  }

  private consumeStack(characterId: string) {
    const current = this.stacks[characterId] || 0
    if (current > 0) {
      this.stacks[characterId] = current - 1
    }
  }
}

export class JobResourceManager {
  private trackers: Map<number, ResourceTracker> = new Map()
  
  constructor() {
     // 注册 SCH (28) 的 Tracker
     this.trackers.set(28, new AetherflowTracker())
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
