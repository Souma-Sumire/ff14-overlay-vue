export interface ResourceTracker {
  /** 重置所有角色的数据，通常在团灭或战斗切换时调用 */
  reset(): void
  /** 处理日志行，用于模拟量谱变化 */
  processLine(type: string, splitLine: string[]): void
  /** 获取指定角色的当前资源量（如层数、忠义值等） */
  getResource(characterId: string): number | undefined
  /** 
   * [可选] 判定特定技能是否可用。
   * 默认逻辑为 (resource >= cost)，如果有特殊 Buff（如秘策）免消耗逻辑，需在此实现。
   */
  isReady?(characterId: string, skillId: number, cost: number): boolean
  /**
   * [可选] 为技能图标提供额外的文字显示（如显示秘策的剩余 CD）。
   * @param allCooldowns 该角色当前所有追踪技能的 CD 历史记录
   */
  getExtraText?(characterId: string, skillId: number, timestamp: number, allCooldowns: Record<number, number[]>): string
}
