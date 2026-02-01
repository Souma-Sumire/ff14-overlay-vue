import logDefinitions from '../../../cactbot/resources/netlog_defs'
import type { ResourceTracker } from '@/types/JobResource'

const SGE_ACTION_IDS = {
  DRUOCHOLE: 24296, // 灵橡清汁
  KERACHOLE: 24298, // 坚角清汁
  IXOCHOLE: 24299, // 寄生清汁
  TAUROCHOLE: 24303, // 白牛清汁
  RHIZOMATA: 24309, // 根素
}

export class SageTracker implements ResourceTracker {
  // characterId -> current stacks (0-3)
  private stacks: Record<string, number> = {}
  // characterId -> last generation timestamp
  private lastGenTime: Record<string, number> = {}

  public reset() {
    this.stacks = {}
    this.lastGenTime = {}
  }

  public getResource(characterId: string): number | undefined {
    return this.stacks[characterId] ?? 0
  }

  public processLine(type: string, splitLine: string[]) {
    // 并不是每一行都有时间戳或者我们关注的来源
    // 我们主要在 Ability 的时候更新，因为资源读取通常也在 Ability 发生时
    if (type !== '21' && type !== '22' && type !== '25') return

    const timestampStr = splitLine[1]
    if (!timestampStr) return
    const timestamp = new Date(timestampStr).getTime()

    switch (type) {
      case '21': // Ability
      case '22':
        {
          const sourceId = splitLine[logDefinitions.Ability.fields.sourceId]!
          if (!sourceId.startsWith('1')) return // 只跟踪玩家

          this.updateStacks(sourceId, timestamp)

          const id = parseInt(splitLine[logDefinitions.Ability.fields.id]!, 16)

          // 消耗蛇胆
          if (
            id === SGE_ACTION_IDS.DRUOCHOLE ||
            id === SGE_ACTION_IDS.KERACHOLE ||
            id === SGE_ACTION_IDS.IXOCHOLE ||
            id === SGE_ACTION_IDS.TAUROCHOLE
          ) {
            this.consumeStack(sourceId)
          }
          // 获得一个蛇胆
          else if (id === SGE_ACTION_IDS.RHIZOMATA) {
            this.addStack(sourceId)
          }
        }
        break

      case '25': // Death
        {
          const targetId = splitLine[logDefinitions.WasDefeated.fields.targetId]!
          this.stacks[targetId] = 0
          delete this.lastGenTime[targetId]
        }
        break
    }
  }

  private updateStacks(characterId: string, now: number) {
    if (!this.lastGenTime[characterId]) {
      this.lastGenTime[characterId] = now
      this.stacks[characterId] = 0
      return
    }

    const elapsed = now - this.lastGenTime[characterId]
    const generations = Math.floor(elapsed / 20000)

    if (generations > 0) {
      const current = this.stacks[characterId] ?? 0
      this.stacks[characterId] = Math.min(3, current + generations)
      this.lastGenTime[characterId] += generations * 20000
    }
  }

  private consumeStack(characterId: string) {
    const current = this.stacks[characterId] || 0
    if (current > 0) {
      this.stacks[characterId] = current - 1
    }
  }

  private addStack(characterId: string) {
    const current = this.stacks[characterId] || 0
    this.stacks[characterId] = Math.min(3, current + 1)
  }
}
