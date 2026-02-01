import type { ResourceTracker } from '@/types/JobResource'
import logDefinitions from '../../../cactbot/resources/netlog_defs'

export class DarkKnightTracker implements ResourceTracker {
  // characterId -> current mp
  private mp: Record<string, number> = {}

  public reset() {
    this.mp = {}
  }

  public getResource(characterId: string): number | undefined {
    return this.mp[characterId] ?? 10000
  }

  public processLine(type: string, splitLine: string[]) {
    switch (type) {
      case '21': // Ability
      case '22':
        {
          const sourceId = splitLine[logDefinitions.Ability.fields.sourceId]!
          if (!sourceId.startsWith('1'))
            return

          const currentMp = Number.parseInt(splitLine[logDefinitions.Ability.fields.currentMp]!)
          if (!Number.isNaN(currentMp)) {
            this.mp[sourceId] = currentMp
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
