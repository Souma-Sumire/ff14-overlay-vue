/**
 * 计算充能技能的状态
 * @param history 技能使用的历史时间戳（毫秒）
 * @param timestamp 当前时间戳（毫秒）
 * @param maxCharges 最大充能数
 * @param recastMs 复唱时间（毫秒）
 * @returns { charges: number, recastLeft: number } charges 为当前可用充能数，recastLeft 为距离下次充能完成的剩余毫秒数。
 */
export function calculateCharges(
  history: number[],
  timestamp: number,
  maxCharges: number,
  recastMs: number,
) {
  if (maxCharges <= 1) {
    const lastUse = history.length > 0 ? history[history.length - 1]! : -Infinity
    const recastLeft = Math.max(0, lastUse + recastMs - timestamp)
    return {
      charges: recastLeft > 0 ? 0 : 1,
      recastLeft,
    }
  }

  // 计算每个槽位的冷却结束时间
  // 逻辑参考自 keigennRecord2.vue
  const freeAt = Array.from({ length: maxCharges }, () => 0)
  // 我们只关心最近的 maxCharges 次使用，因为早于此的使用产生的 CD 肯定已经转好了
  const relevantHistory = history.slice(-maxCharges)

  for (let i = 0; i < relevantHistory.length; i++) {
    const usedAt = relevantHistory[i]!
    const prevFreeAt = i > 0 ? freeAt[i - 1]! : 0
    // 充能恢复是排队的：要么在上一次恢复后开始，要么在按下技能时开始
    freeAt[i] = Math.max(usedAt, prevFreeAt) + recastMs
  }

  let chargesReady = maxCharges - relevantHistory.length
  let recastLeft = 0

  for (let i = 0; i < relevantHistory.length; i++) {
    if (timestamp >= freeAt[i]!) {
      chargesReady++
    }
    else {
      recastLeft = Math.max(0, freeAt[i]! - timestamp)
      break
    }
  }

  return {
    charges: chargesReady,
    recastLeft,
  }
}
