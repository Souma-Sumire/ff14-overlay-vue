import logDefinitions from '../../../cactbot/resources/netlog_defs'
import { BaseTracker } from './baseTracker'

const PCT_ACTION_IDS = {
  TEMPERA_COAT: 34685, // 坦培拉涂层
  TEMPERA_GRASSA: 34686, // 油性坦培拉涂层
}

const PCT_STATUS_IDS = {
  TEMPERA_COAT: 3686, // 坦培拉涂层 (状态)
  TEMPERA_GRASSA: 3687, // 油性坦培拉涂层 (状态)
}

interface ActiveShield {
  type: 'coat' | 'grassa'
  expiresAt: number // 预计自然结束的时间戳
}

/**
 * 绘灵法师资源追踪器
 * 主要逻辑：监控坦培拉涂层护盾是否因吸收伤害而提前破碎，并缩短其复唱时间。
 */
export class PictomancerTracker extends BaseTracker {
  // characterId -> 活跃护盾信息
  private activeShields: Record<string, ActiveShield> = {}
  // 记录刚刚消失的涂层，用于判定是破碎还是转化为油性。
  // characterId -> 消失时的日志时间戳
  private pendingTransitions: Record<string, number> = {}

  protected cleanupRedundantPlayers() {
    // 清理不再追踪的 ID
    for (const id in this.activeShields) {
      if (!this.playerIds.has(id)) {
        delete this.activeShields[id]
      }
    }
    for (const id in this.pendingTransitions) {
      if (!this.playerIds.has(id)) {
        delete this.pendingTransitions[id]
      }
    }
  }

  public reset() {
    this.activeShields = {}
    this.pendingTransitions = {}
  }

  public getResource(_characterId: string): number | undefined {
    return undefined
  }

  // 检查是否有等待判定的涂层已经超过了 300ms 观察期
  private checkPending(currentTimestamp: number, cooldownTracker: Record<string, Record<number, number[]>>) {
    for (const [charId, lostAt] of Object.entries(this.pendingTransitions)) {
      if (currentTimestamp - lostAt >= 300) {
        // 观察期内没有观察到转化为油性，判定为破碎
        this.reduceCooldown(charId, 60000, cooldownTracker)
        delete this.pendingTransitions[charId]
      }
    }
  }

  public processLine(type: string, splitLine: string[], cooldownTracker: Record<string, Record<number, number[]>> = {}) {
    const timestampStr = splitLine[logDefinitions.GainsEffect?.fields?.timestamp ?? 1]
    const timestamp = timestampStr ? new Date(timestampStr).getTime() : 0
    if (timestamp <= 0)
      return

    // 检查一遍观察期
    this.checkPending(timestamp, cooldownTracker)

    switch (type) {
      case '26': // GainsEffect (获得状态)
        {
          const targetId = splitLine[logDefinitions.GainsEffect.fields.targetId]!
          if (!this.playerIds.has(targetId))
            return
          const effectId = Number.parseInt(splitLine[logDefinitions.GainsEffect.fields.effectId]!, 16)
          const durationStr = splitLine[logDefinitions.GainsEffect.fields.duration]
          const duration = durationStr ? Number.parseFloat(durationStr) : 0

          if (effectId === PCT_STATUS_IDS.TEMPERA_COAT) {
            // 获得普通涂层
            this.activeShields[targetId] = { type: 'coat', expiresAt: timestamp + duration * 1000 }
          }
          else if (effectId === PCT_STATUS_IDS.TEMPERA_GRASSA) {
            // 获得油性涂层 (由普通涂层转化而来)
            this.activeShields[targetId] = { type: 'grassa', expiresAt: timestamp + duration * 1000 }
            // 成功转化为油性，清空待定标记，防止触发普通破碎
            delete this.pendingTransitions[targetId]
          }
        }
        break

      case '30': // LosesEffect (状态消失)
        {
          const targetId = splitLine[logDefinitions.LosesEffect.fields.targetId]!
          if (!this.playerIds.has(targetId))
            return
          const effectId = Number.parseInt(splitLine[logDefinitions.LosesEffect.fields.effectId]!, 16)

          if (effectId === PCT_STATUS_IDS.TEMPERA_COAT) {
            const shield = this.activeShields[targetId]
            if (shield?.type === 'coat') {
              // 判定是否早于 500ms 结束
              if (shield.expiresAt - timestamp > 500) {
                // 进入 300ms 观察期，看后续是否有获得油性的日志
                this.pendingTransitions[targetId] = timestamp
              }
              delete this.activeShields[targetId]
            }
          }
          else if (effectId === PCT_STATUS_IDS.TEMPERA_GRASSA) {
            const shield = this.activeShields[targetId]
            if (shield?.type === 'grassa') {
              // 油性涂层无法转化，提前消失直接判定为破碎。减 30s。
              if (shield.expiresAt - timestamp > 500) {
                this.reduceCooldown(targetId, 30000, cooldownTracker)
              }
              delete this.activeShields[targetId]
            }
          }
        }
        break
    }
  }

  /**
   * 缩短指定角色的坦培拉涂层技能 CD
   * @param characterId
   * @param amountMs 缩减的毫秒数 (普通涂层为 60000, 油性为 30000)
   * @param cooldownTracker
   */
  private reduceCooldown(characterId: string, amountMs: number, cooldownTracker: Record<string, Record<number, number[]>>) {
    const jobCooldowns = cooldownTracker[characterId]
    if (jobCooldowns) {
      const history = jobCooldowns[PCT_ACTION_IDS.TEMPERA_COAT]
      if (history && history.length > 0) {
        // 通过回溯最后一次技能施放的时间戳来“伪造”CD 进度
        const lastIdx = history.length - 1
        history[lastIdx] = (history[lastIdx] ?? 0) - amountMs
      }
    }
  }
}
