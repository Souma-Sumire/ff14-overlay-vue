import logDefinitions from '../../../cactbot/resources/netlog_defs'
import { BaseTracker } from './baseTracker'

const SCH_ACTION_IDS = {
  AETHERFLOW: 166, // 以太超流
  DISSIPATION: 3587, // 转化
  ENERGY_DRAIN: 167, // 能量吸收
  INDOMITABILITY: 3583, // 不屈不挠之策
  SACRED_SOIL: 188, // 野战治疗阵
  EXCOGITATION: 7434, // 深谋远虑之策
  RECITATION: 16542, // 秘策
}

const SCH_STATUS_IDS = {
  RECITATION: 1896, // 秘策
}

export class ScholarTracker extends BaseTracker {
  // characterId -> current stacks (0-3)
  private stacks: Record<string, number> = {}
  // characterId -> has recitation buff
  private recitation: Record<string, boolean> = {}
  // characterId -> last usage of Recitation
  private lastRecitationUsed: Record<string, number> = {}

  protected cleanupRedundantPlayers() {
    for (const id in this.stacks) {
      if (!this.playerIds.has(id)) {
        delete this.stacks[id]
        delete this.recitation[id]
        delete this.lastRecitationUsed[id]
      }
    }
  }

  public reset() {
    this.stacks = {}
    this.recitation = {}
    this.lastRecitationUsed = {}
  }

  public getResource(characterId: string): number | undefined {
    return this.stacks[characterId] ?? 0
  }

  public isReady(characterId: string, skillId: number, cost: number): boolean {
    // 如果有秘策，且技能是不屈(3583)或深谋(7434)，则无视消耗
    if (this.recitation[characterId] && (skillId === SCH_ACTION_IDS.INDOMITABILITY || skillId === SCH_ACTION_IDS.EXCOGITATION)) {
      return true
    }
    return (this.stacks[characterId] ?? 0) >= cost
  }

  public getExtraText(characterId: string, skillId: number, timestamp: number, _allCooldowns: Record<number, number[]>): string {
    // 仅针对不屈(3583)和深谋(7434)显示秘策(16542)的冷却
    if (skillId === SCH_ACTION_IDS.INDOMITABILITY || skillId === SCH_ACTION_IDS.EXCOGITATION) {
      const lastUsed = this.lastRecitationUsed[characterId] ?? 0
      if (lastUsed > 0) {
        const recRecastMs = 90000
        const recFreeAt = lastUsed + recRecastMs
        if (timestamp < recFreeAt) {
          return Math.ceil((recFreeAt - timestamp) / 1000).toString()
        }
      }
    }
    return ''
  }

  public processLine(type: string, splitLine: string[]) {
    switch (type) {
      case '21': // Ability
      case '22':
        {
          const sourceId = splitLine[logDefinitions.Ability.fields.sourceId]!
          if (!this.playerIds.has(sourceId))
            return

          const id = Number.parseInt(splitLine[logDefinitions.Ability.fields.id]!, 16)
          const timestamp = new Date(splitLine[logDefinitions.Ability.fields.timestamp]!).getTime()

          if (id === SCH_ACTION_IDS.RECITATION) {
            this.lastRecitationUsed[sourceId] = timestamp
          }

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
          }
          else if (id === SCH_ACTION_IDS.ENERGY_DRAIN || id === SCH_ACTION_IDS.SACRED_SOIL) {
            this.consumeStack(sourceId)
          }
        }
        break

      case '26': // GainsEffect
        {
          const targetId = splitLine[logDefinitions.GainsEffect.fields.targetId]!
          if (!this.playerIds.has(targetId))
            return
          const effectId = Number.parseInt(splitLine[logDefinitions.GainsEffect.fields.effectId]!, 16)
          if (effectId === SCH_STATUS_IDS.RECITATION) {
            this.recitation[targetId] = true
          }
        }
        break

      case '30': // LosesEffect
        {
          const targetId = splitLine[logDefinitions.LosesEffect.fields.targetId]!
          if (!this.playerIds.has(targetId))
            return
          const effectId = Number.parseInt(splitLine[logDefinitions.LosesEffect.fields.effectId]!, 16)
          if (effectId === SCH_STATUS_IDS.RECITATION) {
            delete this.recitation[targetId]
          }
        }
        break

      case '25': // Death
        {
          const targetId = splitLine[logDefinitions.WasDefeated.fields.targetId]!
          if (this.playerIds.has(targetId)) {
            this.stacks[targetId] = 0
          }
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
