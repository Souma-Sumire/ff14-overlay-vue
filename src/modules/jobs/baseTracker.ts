import type { ResourceTracker } from '@/types/JobResource'

export abstract class BaseTracker implements ResourceTracker {
  protected playerIds: Set<string> = new Set()

  public updateTrackedPlayers(playerIds: string[]): void {
    this.playerIds = new Set(playerIds)
    this.cleanupRedundantPlayers()
  }

  /**
   * 子类实现此方法以清理不再追踪的玩家 ID 的缓存数据
   */
  protected abstract cleanupRedundantPlayers(): void

  public abstract reset(): void
  public abstract processLine(type: string, splitLine: string[], cooldownTracker?: Record<string, Record<number, number[]>>): void
  public abstract getResource(characterId: string): number | undefined
  public isReady?(characterId: string, skillId: number, cost: number): boolean
  public getExtraText?(characterId: string, skillId: number, timestamp: number, allCooldowns: Record<number, number[]>): string
}
