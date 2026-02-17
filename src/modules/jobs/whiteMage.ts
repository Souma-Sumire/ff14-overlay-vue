import logDefinitions from '../../../cactbot/resources/netlog_defs'
import { BaseTracker } from './baseTracker'

const WHM_ACTION_IDS = {
  AFFLATUS_SOLACE: 16531, // 安慰之心
  AFFLATUS_RAPTURE: 16534, // 狂喜之心
}

/**
 * 白魔法师资源追踪器（治疗百合）
 * - 初始 3 层，最大 3 层
 * - 进入战斗后每 20s 回复 1 层
 * - 安慰之心 / 狂喜之心 消耗 1 层
 */
export class WhiteMageTracker extends BaseTracker {
  // characterId -> current lilies (0-3)
  private lilies: Record<string, number> = {}
  // characterId -> whether currently in combat
  private inCombat: Record<string, boolean> = {}
  // characterId -> last lily generation timestamp
  private lastGenTime: Record<string, number> = {}

  protected cleanupRedundantPlayers() {
    for (const id in this.lilies) {
      if (!this.playerIds.has(id)) {
        delete this.lilies[id]
      }
    }
    for (const id in this.inCombat) {
      if (!this.playerIds.has(id)) {
        delete this.inCombat[id]
      }
    }
    for (const id in this.lastGenTime) {
      if (!this.playerIds.has(id)) {
        delete this.lastGenTime[id]
      }
    }
  }

  public reset() {
    this.lilies = {}
    this.inCombat = {}
    this.lastGenTime = {}
  }

  public getResource(characterId: string): number | undefined {
    return this.lilies[characterId] ?? 3
  }

  public fill() {
    for (const id of this.playerIds) {
      this.lilies[id] = 3
    }
  }

  public processLine(type: string, splitLine: string[]) {
    const timestamp = this.parseTimestamp(splitLine)
    if (timestamp !== null)
      this.updateLilies(timestamp)

    switch (type) {
      case '260': // InCombat
        {
          const isCombat
            = splitLine[logDefinitions.InCombat.fields.inACTCombat] === '1'
              || splitLine[logDefinitions.InCombat.fields.inGameCombat] === '1'

          for (const id of this.playerIds) {
            if (isCombat) {
              if (!this.inCombat[id]) {
                this.inCombat[id] = true
                if (timestamp !== null)
                  this.lastGenTime[id] = timestamp
              }
            }
            else if (this.inCombat[id]) {
              this.inCombat[id] = false
              delete this.lastGenTime[id]
            }
          }
        }
        break

      case '21': // Ability
      case '22':
        {
          const sourceId = splitLine[logDefinitions.Ability.fields.sourceId]!
          if (!this.playerIds.has(sourceId))
            return

          if (!this.inCombat[sourceId]) {
            this.inCombat[sourceId] = true
            if (timestamp !== null)
              this.lastGenTime[sourceId] = timestamp
          }

          const id = Number.parseInt(splitLine[logDefinitions.Ability.fields.id]!, 16)
          if (id === WHM_ACTION_IDS.AFFLATUS_SOLACE || id === WHM_ACTION_IDS.AFFLATUS_RAPTURE) {
            this.consumeLily(sourceId)
          }
        }
        break

      case '25': // Death
        {
          const targetId = splitLine[logDefinitions.WasDefeated.fields.targetId]!
          if (this.playerIds.has(targetId)) {
            this.lilies[targetId] = 0
            this.inCombat[targetId] = false
            delete this.lastGenTime[targetId]
          }
        }
        break
    }
  }

  private updateLilies(now: number) {
    for (const id of this.playerIds) {
      if (!this.inCombat[id])
        continue

      const last = this.lastGenTime[id]
      if (!last) {
        this.lastGenTime[id] = now
        continue
      }

      const generations = Math.floor((now - last) / 20000)
      if (generations <= 0)
        continue

      const current = this.getResource(id) ?? 3
      this.lilies[id] = Math.min(3, current + generations)
      this.lastGenTime[id] = last + generations * 20000
    }
  }

  private consumeLily(characterId: string) {
    const current = this.getResource(characterId) ?? 3
    this.lilies[characterId] = Math.max(0, current - 1)
  }

  private parseTimestamp(splitLine: string[]) {
    const timestampStr = splitLine[1]
    if (!timestampStr)
      return null

    const timestamp = new Date(timestampStr).getTime()
    if (!Number.isFinite(timestamp) || timestamp <= 0)
      return null

    return timestamp
  }
}
