import action2ClassJobLevelMapRaw from '@/resources/generated/action2ClassJobLevel.json'
import { BAKED_ACTION_UPGRADE_STEPS } from '@/resources/generated/bakedActionUpgradeSteps'

const action2ClassJobLevelMap = new Map<string, string>(
  Object.entries(action2ClassJobLevelMapRaw as Record<string, string>),
)

function actionId2ClassJobLevelRaw(id: number): string | undefined {
  return action2ClassJobLevelMap.get(String(Math.trunc(id)))
}

// 共享CD映射：仅用于把同CD技能归并到同一ID。
const compareSameGroup = {
  16484: 16486, // 回返彼岸花→回返纷乱雪月花
  16485: 16486, // 回返天下五剑→回返纷乱雪月花
  7496: 16481, // 必杀剑·红莲→必杀剑·闪影
  16003: 16192, /// 0色标准舞步结束→双色标准舞步结束
  16191: 16192, // 单色标准舞步→双色标准舞步结束
  16004: 16196, // 0色技巧舞步结束→四色技巧舞步结束
  16193: 16196, // 单色技巧舞步结束→四色技巧舞步结束
  16194: 16196, // 双色技巧舞步结束→四色技巧舞步结束
  16195: 16196, // 三色技巧舞步结束→四色技巧舞步结束
  3551: 25751, // 原初的直觉→原初的血气
  16464: 25751, // 原初的勇猛→原初的血气
  16510: 16508, // 能量抽取→能量吸收
  16499: 16498, // 毒菌冲击→钻头
  23287: 23290, // 如意大旋风→月下彼岸花
  18324: 18325, // 类星体→正义飞踢
  23272: 23285, // 天使的点心→马特拉魔术
  23280: 23285, // 龙之力→马特拉魔术
  23273: 23275, // 玄结界→斗灵弹
  11426: 11427, // 飞翎雨→地火喷发
  11428: 11429, // 山崩→轰雷
  34686: 34685, // 油性坦培拉涂层→坦培拉涂层
} as const

const compareSameMap = new Map<number, number>(Object.entries(compareSameGroup).map(([k, v]) => [Number(k), v]))
const compareSameSourceIdSet = new Set<number>(compareSameMap.keys())

export function compareSame(id: number) {
  return compareSameMap.get(id) || id
}

export function isCompareSameSourceId(id: number) {
  return compareSameSourceIdSet.has(id)
}

// 技能进化映射：由脚本从本地 CSV 自动生成。
export const ACTION_UPGRADE_STEPS: Record<number, number> = BAKED_ACTION_UPGRADE_STEPS

export function getUpgradeActionChain(actionId: number): number[] {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return []
  const start = Math.trunc(actionId)
  const chain: number[] = [start]
  const visited = new Set<number>([start])
  let current = start
  while (true) {
    const next = ACTION_UPGRADE_STEPS[current]
    if (next === undefined)
      break
    if (!Number.isFinite(next) || next <= 0)
      break
    const nextActionId = Math.trunc(next)
    if (visited.has(nextActionId))
      break
    chain.push(nextActionId)
    visited.add(nextActionId)
    current = nextActionId
  }
  return chain
}

const topTierUpgradeActionMap = (() => {
  const map = new Map<number, number>()
  Object.keys(ACTION_UPGRADE_STEPS).forEach((rawActionId) => {
    const lowerTierActionId = Number(rawActionId)
    if (!Number.isFinite(lowerTierActionId) || lowerTierActionId <= 0)
      return
    const chain = getUpgradeActionChain(lowerTierActionId)
    if (chain.length <= 1)
      return
    const topTierActionId = chain[chain.length - 1]!
    map.set(lowerTierActionId, topTierActionId)
  })
  return map
})()

export function normalizeUpgradeActionId(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return actionId
  const normalized = Math.trunc(actionId)
  return topTierUpgradeActionMap.get(normalized) ?? normalized
}

export function isLowerTierActionId(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return false
  return normalizeUpgradeActionId(actionId) !== actionId
}

const upgradeLowerByUpper = (() => {
  const map = new Map<number, number[]>()
  Object.entries(ACTION_UPGRADE_STEPS).forEach(([rawLower, rawUpper]) => {
    const lower = Number(rawLower)
    const upper = Number(rawUpper)
    if (!Number.isFinite(lower) || lower <= 0 || !Number.isFinite(upper) || upper <= 0)
      return
    if (!map.has(upper))
      map.set(upper, [])
    map.get(upper)!.push(lower)
  })
  return map
})()

const actionUpgradeLevelCache = new Map<number, number>()
const upgradeDepthToTopCache = new Map<number, number>()
const upgradeFamilyByTopCache = new Map<number, number[]>()
const levelResolvedUpgradeActionCache = new Map<string, number>()

function normalizeLevel(level: number) {
  if (!Number.isFinite(level))
    return 1
  return Math.max(1, Math.trunc(level))
}

export function getActionUpgradeMinLevel(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return 1
  const id = Math.trunc(actionId)
  const cached = actionUpgradeLevelCache.get(id)
  if (cached !== undefined)
    return cached

  const fromMap = Number(actionId2ClassJobLevelRaw(id))
  const resolved = Number.isFinite(fromMap) && fromMap > 0
    ? normalizeLevel(fromMap)
    : 1
  actionUpgradeLevelCache.set(id, resolved)
  return resolved
}

function getUpgradeDepthToTop(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return 0
  const id = Math.trunc(actionId)
  const cached = upgradeDepthToTopCache.get(id)
  if (cached !== undefined)
    return cached

  let depth = 0
  let current = id
  const visited = new Set<number>([current])
  while (true) {
    const next = ACTION_UPGRADE_STEPS[current]
    if (typeof next !== 'number' || !Number.isFinite(next) || next <= 0)
      break
    const nextId = Math.trunc(next)
    if (visited.has(nextId))
      break
    depth += 1
    visited.add(nextId)
    current = nextId
  }
  upgradeDepthToTopCache.set(id, depth)
  return depth
}

function getUpgradeFamilyByTop(topActionId: number) {
  const top = Math.trunc(topActionId)
  const cached = upgradeFamilyByTopCache.get(top)
  if (cached)
    return cached

  const visited = new Set<number>()
  const stack: number[] = [top]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (visited.has(current))
      continue
    visited.add(current)
    const lowers = upgradeLowerByUpper.get(current) ?? []
    lowers.forEach((lower) => {
      if (!visited.has(lower))
        stack.push(lower)
    })
  }
  const family = [...visited]
  upgradeFamilyByTopCache.set(top, family)
  return family
}

export function resolveUpgradeActionIdForLevel(actionId: number, level: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return actionId

  const startActionId = Math.trunc(actionId)
  const normalizedLevel = normalizeLevel(level)
  const cacheKey = `${startActionId}:${normalizedLevel}`
  const cached = levelResolvedUpgradeActionCache.get(cacheKey)
  if (cached !== undefined)
    return cached

  const topActionId = normalizeUpgradeActionId(startActionId)
  const family = getUpgradeFamilyByTop(topActionId)
  let bestActionId = topActionId
  let bestMinLevel = Number.NEGATIVE_INFINITY
  let bestDepth = Number.NEGATIVE_INFINITY

  family.forEach((candidateId) => {
    const minLevel = getActionUpgradeMinLevel(candidateId)
    if (minLevel > normalizedLevel)
      return
    const depth = getUpgradeDepthToTop(candidateId)
    if (
      minLevel > bestMinLevel
      || (minLevel === bestMinLevel && depth > bestDepth)
      || (minLevel === bestMinLevel && depth === bestDepth && candidateId === startActionId)
    ) {
      bestActionId = candidateId
      bestMinLevel = minLevel
      bestDepth = depth
    }
  })

  if (bestMinLevel === Number.NEGATIVE_INFINITY) {
    bestActionId = family.reduce((acc, candidateId) => {
      const candidateLevel = getActionUpgradeMinLevel(candidateId)
      const accLevel = getActionUpgradeMinLevel(acc)
      if (candidateLevel < accLevel)
        return candidateId
      if (candidateLevel === accLevel && getUpgradeDepthToTop(candidateId) > getUpgradeDepthToTop(acc))
        return candidateId
      return acc
    }, topActionId)
  }

  levelResolvedUpgradeActionCache.set(cacheKey, bestActionId)
  return bestActionId
}

