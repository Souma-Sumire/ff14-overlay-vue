import type { ResourceTracker } from '@/types/JobResource'
import logDefinitions from '../../../cactbot/resources/netlog_defs'

const PLD_ACTION_IDS = {
  ATTACK: 7, // 攻击
  SHELLTRON: 3542, // 盾阵
  HOLY_SHELLTRON: 25746, // 圣盾阵
  INTERVENTION: 7382, // 干预
  COVER: 27, // 保护
}

export class PaladinTracker implements ResourceTracker {
  // characterId -> current oath (0-100)
  private gauge: Record<string, number> = {}

  public reset() {
    this.gauge = {}
  }

  public getResource(characterId: string): number | undefined {
    return this.gauge[characterId] ?? 100
  }

  public processLine(type: string, splitLine: string[]) {
    switch (type) {
      case '21': // Ability
      case '22':
        {
          const sourceId = splitLine[logDefinitions.Ability.fields.sourceId]!
          const id = Number.parseInt(splitLine[logDefinitions.Ability.fields.id]!, 16)

          if (id === PLD_ACTION_IDS.ATTACK) {
            this.addGauge(sourceId, 5)
          }
          else if (
            id === PLD_ACTION_IDS.SHELLTRON
            || id === PLD_ACTION_IDS.HOLY_SHELLTRON
            || id === PLD_ACTION_IDS.INTERVENTION
            || id === PLD_ACTION_IDS.COVER
          ) {
            this.consumeGauge(sourceId, 50)
          }
        }
        break

      case '25': // Death
        {
          const targetId = splitLine[logDefinitions.WasDefeated.fields.targetId]!
          this.gauge[targetId] = 0
        }
        break
    }
  }

  private consumeGauge(characterId: string, amount: number) {
    const current = this.getResource(characterId)!
    this.gauge[characterId] = Math.max(0, current - amount)
  }

  private addGauge(characterId: string, amount: number) {
    const current = this.getResource(characterId)!
    this.gauge[characterId] = Math.min(100, current + amount)
  }
}
