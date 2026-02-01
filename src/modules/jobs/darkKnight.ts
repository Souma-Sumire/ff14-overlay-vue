import logDefinitions from '../../../cactbot/resources/netlog_defs'
import { BaseTracker } from './baseTracker'

export class DarkKnightTracker extends BaseTracker {
  // characterId -> current mp
  private mp: Record<string, number> = {}

  protected cleanupRedundantPlayers() {
    for (const id in this.mp) {
      if (!this.playerIds.has(id)) {
        delete this.mp[id]
      }
    }
  }

  public reset() {
    this.mp = {}
  }

  public getResource(characterId: string): number | undefined {
    return this.mp[characterId] ?? 10000
  }

  public processLine(type: string, splitLine: string[], _cooldownTracker: Record<string, Record<number, number[]>> = {}) {
    switch (type) {
      case '21': // Ability
      case '22':
        {
          const sourceId = splitLine[logDefinitions.Ability.fields.sourceId]!
          if (!this.playerIds.has(sourceId))
            return

          const currentMp = Number.parseInt(splitLine[logDefinitions.Ability.fields.currentMp]!)
          if (!Number.isNaN(currentMp)) {
            this.mp[sourceId] = currentMp
          }
        }
        break

      case '24': // DoT
        {
          const sourceId = splitLine[logDefinitions.NetworkDoT.fields.sourceId]!
          if (this.playerIds.has(sourceId)) {
            const sourceMp = Number.parseInt(splitLine[logDefinitions.NetworkDoT.fields.sourceCurrentMp]!)
            if (!Number.isNaN(sourceMp)) {
              this.mp[sourceId] = sourceMp
            }
          }

          const targetId = splitLine[logDefinitions.NetworkDoT.fields.id]!
          if (this.playerIds.has(targetId)) {
            const targetMp = Number.parseInt(splitLine[logDefinitions.NetworkDoT.fields.currentMp]!)
            if (!Number.isNaN(targetMp)) {
              this.mp[targetId] = targetMp
            }
          }
        }
        break

      case '25': // Death
        {
          const targetId = splitLine[logDefinitions.WasDefeated.fields.targetId]!
          this.mp[targetId] = 0
        }
        break
    }
  }
}
