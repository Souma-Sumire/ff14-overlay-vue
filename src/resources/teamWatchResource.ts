import type { DynamicValue } from '@/types/dynamicValue'
import type { TeamWatchActionMetaRaw, TeamWatchStorageData } from '@/types/teamWatchTypes'
import { hasBakedActionMeta, resolveBakedActionMeta } from '@/resources/logic/actionMetaResolver'
import { resolveActionMinLevel } from '@/resources/logic/actionMinLevel'
import { getActionNameLite } from '@/resources/logic/actionNameLite'
import {
  ACTION_UPGRADE_STEPS,
  isLowerTierActionId,
  normalizeUpgradeActionId,
} from '@/utils/compareSaveAction'
import { idToSrc, parseDynamicValue } from '@/utils/dynamicValue'
import Util from '@/utils/util'
import { DEFAULT_JOB_SORT_ORDER } from './jobSortOrder'

// TeamWatch v5 本地存储键名。
export const TEAM_WATCH_STORAGE_NAMESPACE = 'TeamWatch5'
// TeamWatch v4 本地存储键名（仅用于迁移）。
const TEAM_WATCH_STORAGE_NAMESPACE_LEGACY = 'TeamWatch4'

// 每个职业默认技能槽数量。
export const TEAM_WATCH_SLOT_COUNT = 5
// 空槽位模板。
export const TEAM_WATCH_EMPTY_ACTIONS = [0, 0, 0, 0, 0] as const

// 各职业默认监控技能槽位（按槽位顺序）。
export const TEAM_WATCH_WATCH_ACTIONS_DEFAULT: Record<number, number[]> = {
  0: [0, 0, 0, 0, 0],
  1: [7535, 0, 17, 7531, 0],
  2: [7549, 65, 7541, 7542, 0],
  3: [7535, 0, 44, 7531, 0],
  4: [7549, 0, 7541, 7542, 85],
  5: [0, 0, 7541, 0, 101],
  6: [0, 0, 0, 7561, 0],
  7: [7560, 157, 0, 0, 0],
  8: [0, 0, 0, 0, 0],
  9: [0, 0, 0, 0, 0],
  10: [0, 0, 0, 0, 0],
  11: [0, 0, 0, 0, 0],
  12: [0, 0, 0, 0, 0],
  13: [0, 0, 0, 0, 0],
  14: [0, 0, 0, 0, 0],
  15: [0, 0, 0, 0, 0],
  16: [0, 0, 0, 0, 0],
  17: [0, 0, 0, 0, 0],
  18: [0, 0, 0, 0, 0],
  19: [7535, 7385, 36920, 7531, 25746],
  20: [7549, 0, 7542, 7546, 65],
  21: [7535, 7388, 36923, 7531, 25751],
  22: [7549, 0, 7542, 7546, 0],
  23: [7405, 7408, 0, 0, 0],
  24: [7561, 25862, 16536, 7433, 16534],
  25: [7560, 157, 0, 0, 0],
  26: [7560, 0, 0, 7561, 0],
  27: [7560, 25799, 0, 0, 0],
  28: [7561, 37014, 25868, 16542, 188],
  29: [7549, 2241, 7541, 7542, 0],
  30: [7549, 0, 7542, 7546, 2241],
  31: [16889, 2887, 0, 0, 0],
  32: [7535, 16471, 36927, 7531, 7393],
  33: [7561, 25874, 16559, 7439, 3614],
  34: [7549, 0, 7542, 7546, 7498],
  35: [7560, 25857, 0, 0, 0],
  36: [7560, 18305, 18317, 7561, 11415],
  37: [7535, 16160, 36935, 7531, 25758],
  38: [16012, 16014, 16015, 0, 0],
  39: [7549, 0, 7542, 7546, 24404],
  40: [7561, 37035, 24311, 24310, 24298],
  41: [7549, 0, 7542, 7546, 0],
  42: [7560, 34685, 0, 0, 0],
}

// DynamicValue 校验时使用的抽样等级。
const TEAM_WATCH_DYNAMIC_SAMPLE_LEVELS = [1, 50, 80, 90, 100] as const

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

const upgradeFamilyByTopCache = new Map<number, number[]>()
const upgradeDepthToTopCache = new Map<number, number>()

// 将未知输入转换为整数数组，并按最小值过滤（默认 >=0）。
function toIntArray(value: unknown, min = 0): number[] {
  if (!Array.isArray(value))
    return []
  return value
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && v >= min)
    .map(v => Math.trunc(v))
}

// 深拷贝 actionMetaUser（避免响应式对象被直接复用）。
export function cloneTeamWatchActionMetaMap(input: Record<number, TeamWatchActionMetaRaw>) {
  const result: Record<number, TeamWatchActionMetaRaw> = {}
  Object.entries(input).forEach(([key, value]) => {
    result[Number(key)] = { ...value }
  })
  return result
}

// 规范化 DynamicValue（number/string），非法时回退。
function normalizeDynamicValue(value: unknown, fallback: DynamicValue): DynamicValue {
  if (typeof value === 'number' && Number.isFinite(value))
    return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed)
      return trimmed
  }
  return fallback
}

function normalizeActionId(value: unknown, fallback: number): number {
  const fallbackId = Number.isFinite(fallback) ? Math.max(0, Math.trunc(fallback)) : 0
  const numeric = Number(value)
  if (Number.isFinite(numeric))
    return Math.max(0, Math.trunc(numeric))
  return fallbackId
}

function normalizeActionCategory(value: unknown, fallback: number): number {
  const fallbackCategory = Number.isFinite(fallback) ? Math.max(0, Math.trunc(fallback)) : 0
  const numeric = Number(value)
  if (Number.isFinite(numeric))
    return Math.max(0, Math.trunc(numeric))
  return fallbackCategory
}

// 规范化学习等级，始终返回 >= 1 的整数。
function normalizeClassJobLevel(value: unknown, fallback: number): number {
  const fallbackLevel = Number.isFinite(fallback) ? Math.max(1, Math.trunc(fallback)) : 1
  const numeric = Number(value)
  if (Number.isFinite(numeric))
    return Math.max(1, Math.trunc(numeric))
  return fallbackLevel
}

// 解析 DynamicValue 到指定等级下的数值，失败时回退。
export function resolveTeamWatchDynamicValue(value: DynamicValue, level: number, fallback: number) {
  try {
    const parsed = parseDynamicValue(value, level)
    if (!Number.isFinite(parsed))
      return fallback
    return parsed
  }
  catch {
    return fallback
  }
}

// 校验 DynamicValue 在多个等级下是否可稳定解析。
export function validateTeamWatchDynamicValue(value: DynamicValue, label: string) {
  for (const level of TEAM_WATCH_DYNAMIC_SAMPLE_LEVELS) {
    try {
      const parsed = parseDynamicValue(value, level)
      if (!Number.isFinite(parsed)) {
        return `${label} 在 ${level} 级返回了无效数值`
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return `${label} 在 ${level} 级校验失败: ${message}`
    }
  }
  return ''
}

// 判断技能是否为某条进化链中的下位技能。
export function isTeamWatchLowerTierActionId(actionId: number) {
  return isLowerTierActionId(actionId)
}

// 构建技能元数据兜底值（仅基于 actionId 的本地信息）。
export function buildTeamWatchFallbackMeta(actionId: number): TeamWatchActionMetaRaw {
  const baked = resolveBakedActionMeta(actionId)
  return {
    id: actionId,
    name: getActionNameLite(actionId) || baked?.name || `#${actionId}`,
    iconSrc: idToSrc(actionId),
    actionCategory: Number(baked?.actionCategoryTargetId ?? 0),
    recast1000ms: Number(baked?.recast1000ms ?? 0),
    duration: 0,
    maxCharges: Number(baked?.maxCharges ?? 0),
    classJobLevel: Number(baked?.classJobLevel ?? 1),
  }
}

export function hasBakedTeamWatchMeta(actionId: number) {
  return hasBakedActionMeta(actionId, { requireActionCategory: true })
}

function getUpgradeFamily(actionId: number) {
  const normalized = Number.isFinite(Number(actionId)) ? Math.trunc(Number(actionId)) : 0
  if (normalized <= 0)
    return []
  const top = normalizeUpgradeActionId(normalized)
  const cached = upgradeFamilyByTopCache.get(top)
  if (cached)
    return cached

  const visited = new Set<number>()
  const stack = [top]
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

function getUpgradeDepthToTop(actionId: number) {
  const normalized = Number.isFinite(Number(actionId)) ? Math.trunc(Number(actionId)) : 0
  if (normalized <= 0)
    return Number.MAX_SAFE_INTEGER
  const cached = upgradeDepthToTopCache.get(normalized)
  if (cached !== undefined)
    return cached

  let depth = 0
  let current = normalized
  const visited = new Set<number>([current])
  while (true) {
    const nextRaw = ACTION_UPGRADE_STEPS[current]
    if (typeof nextRaw !== 'number' || !Number.isFinite(nextRaw) || nextRaw <= 0)
      break
    const nextId = Math.trunc(nextRaw)
    if (visited.has(nextId))
      break
    depth += 1
    visited.add(nextId)
    current = nextId
  }

  upgradeDepthToTopCache.set(normalized, depth)
  return depth
}

function isActionSupportedByBaseJob(actionId: number, baseJob: number) {
  if (actionId <= 0)
    return true
  const baked = resolveBakedActionMeta(actionId)
  if (!baked)
    return true
  if (baked.isRoleAction)
    return baked.jobs.includes(baseJob)
  if (baked.classJobTargetId > 0)
    return baked.classJobTargetId === baseJob
  // For base-job inheritance, non-role actions with only classJobCategory are ambiguous
  // (category may include both base+advanced jobs). Treat them as unsupported.
  return false
}

function resolveHighestSupportedActionInFamily(actionId: number, baseJob: number) {
  const family = getUpgradeFamily(actionId)
  let bestActionId = 0
  let bestMinLevel = Number.NEGATIVE_INFINITY
  let bestDepth = Number.MAX_SAFE_INTEGER

  family.forEach((candidateId) => {
    if (!isActionSupportedByBaseJob(candidateId, baseJob))
      return

    const baked = resolveBakedActionMeta(candidateId)
    const minLevel = baked?.classJobLevel ?? 1
    const depth = getUpgradeDepthToTop(candidateId)

    if (
      minLevel > bestMinLevel
      || (minLevel === bestMinLevel && depth < bestDepth)
      || (minLevel === bestMinLevel && depth === bestDepth && candidateId === actionId)
    ) {
      bestActionId = candidateId
      bestMinLevel = minLevel
      bestDepth = depth
    }
  })

  return bestActionId
}

// 基础职业继承进阶职业技能时，过滤掉基础职业无法学习的技能。
export function buildInheritedBaseJobActions(baseJob: number, sourceActions: unknown): number[] {
  const normalizeSlotActionsKeepShape = (input: unknown) => {
    if (!Array.isArray(input))
      return [0]
    const normalized = input.map((value) => {
      const numeric = Number(value)
      if (!Number.isFinite(numeric) || numeric < 0)
        return 0
      return Math.trunc(numeric)
    })
    return normalized.length > 0 ? normalized : [0]
  }

  const normalizedBaseJob = Number.isFinite(Number(baseJob)) ? Math.trunc(Number(baseJob)) : 0
  if (normalizedBaseJob <= 0)
    return [0]
  if (Util.baseJobEnumConverted(normalizedBaseJob) === normalizedBaseJob)
    return normalizeSlotActionsKeepShape(sourceActions)

  return normalizeSlotActionsKeepShape(sourceActions).map((actionId) => {
    if (actionId <= 0)
      return 0
    return resolveHighestSupportedActionInFamily(actionId, normalizedBaseJob) || 0
  })
}

// 规范化 TeamWatchActionMetaRaw。
export function normalizeTeamWatchActionMetaRaw(actionId: number, value: unknown): TeamWatchActionMetaRaw {
  const fallback = buildTeamWatchFallbackMeta(actionId)
  if (!value || typeof value !== 'object')
    return fallback

  const raw = value as Record<string, unknown>
  const normalized: TeamWatchActionMetaRaw = {
    id: normalizeActionId(raw.id, fallback.id),
    name: (typeof raw.name === 'string' && raw.name.trim()) ? raw.name.trim() : fallback.name,
    iconSrc: (typeof raw.iconSrc === 'string' && raw.iconSrc.trim()) ? raw.iconSrc.trim() : fallback.iconSrc,
    actionCategory: normalizeActionCategory(raw.actionCategory, fallback.actionCategory),
    recast1000ms: normalizeDynamicValue(raw.recast1000ms, fallback.recast1000ms),
    duration: normalizeDynamicValue(raw.duration, fallback.duration),
    maxCharges: normalizeDynamicValue(raw.maxCharges, fallback.maxCharges),
    classJobLevel: resolveActionMinLevel(
      normalizeClassJobLevel(raw.classJobLevel, fallback.classJobLevel),
      {
        actionId: actionId > 0 ? actionId : fallback.id,
        fallback: fallback.classJobLevel,
      },
    ),
  }
  return normalized
}

// 规范化职业 -> 槽位技能 ID 映射，并补齐默认职业与默认槽位。
function normalizeWatchJobsActionsIDUser(value: unknown): Record<number, number[]> {
  const extraJobs = value && typeof value === 'object'
    ? Object.keys(value as Record<string, unknown>).map(v => Number(v))
    : []
  const jobs = Array.from(new Set([
    ...DEFAULT_JOB_SORT_ORDER,
    ...toIntArray(extraJobs, 1),
  ]))
  const base: Record<number, number[]> = {}
  jobs.forEach((job) => {
    base[job] = [...(TEAM_WATCH_WATCH_ACTIONS_DEFAULT[job] ?? TEAM_WATCH_EMPTY_ACTIONS)]
  })

  if (!value || typeof value !== 'object')
    return base

  for (const [rawJob, rawActions] of Object.entries(value as Record<string, unknown>)) {
    const job = Number(rawJob)
    if (!Number.isFinite(job))
      continue
    base[job] = toIntArray(rawActions)
  }

  return base
}

// 规范化职业排序：保留输入顺序，同时补齐缺失职业。
function normalizeSortRuleUser(value: unknown): number[] {
  const hasInput = Array.isArray(value)
  const normalized = hasInput ? toIntArray(value) : [...DEFAULT_JOB_SORT_ORDER]
  const jobs = Array.from(new Set([
    ...DEFAULT_JOB_SORT_ORDER,
    ...normalized.filter(v => v > 0),
  ]))
  const unique = Array.from(new Set(normalized))
  const missing = jobs.filter(job => !unique.includes(job))
  return [...unique, ...missing]
}

// 规范化用户自定义技能元数据映射。
function normalizeActionMetaUser(value: unknown): Record<number, TeamWatchActionMetaRaw> {
  if (!value || typeof value !== 'object')
    return {}

  const next: Record<number, TeamWatchActionMetaRaw> = {}
  Object.entries(value as Record<string, unknown>).forEach(([rawId, rawMeta]) => {
    const actionId = Number(rawId)
    if (!Number.isFinite(actionId) || actionId <= 0)
      return
    next[actionId] = normalizeTeamWatchActionMetaRaw(actionId, rawMeta)
  })
  return next
}

function buildStorageData(input?: {
  watchJobsActionsIDUser?: unknown
  sortRuleUser?: unknown
  actionMetaUser?: unknown
}): TeamWatchStorageData {
  return {
    watchJobsActionsIDUser: normalizeWatchJobsActionsIDUser(input?.watchJobsActionsIDUser),
    sortRuleUser: normalizeSortRuleUser(input?.sortRuleUser),
    actionMetaUser: normalizeActionMetaUser(input?.actionMetaUser),
  }
}

function parseStorageData(raw: string, requireActionMetaUser: boolean): TeamWatchStorageData | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object')
      return null

    if (!parsed.watchJobsActionsIDUser || typeof parsed.watchJobsActionsIDUser !== 'object')
      return null
    if (!Array.isArray(parsed.sortRuleUser))
      return null
    if (requireActionMetaUser && (!parsed.actionMetaUser || typeof parsed.actionMetaUser !== 'object'))
      return null

    return buildStorageData({
      watchJobsActionsIDUser: parsed.watchJobsActionsIDUser,
      sortRuleUser: parsed.sortRuleUser,
      actionMetaUser: requireActionMetaUser ? parsed.actionMetaUser : undefined,
    })
  }
  catch {
    return null
  }
}

// 读取 TeamWatch 存档（含 TeamWatch4 -> TeamWatch5 自动迁移）。
export function loadTeamWatchStorageData(): TeamWatchStorageData {
  // 读取顺序：
  // 1. 有 TeamWatch4 则迁移到 TeamWatch5，并删除 TeamWatch4
  // 2. 没有 TeamWatch4 读 TeamWatch5
  // 3. 都没有则默认配置
  const legacyRaw = localStorage.getItem(TEAM_WATCH_STORAGE_NAMESPACE_LEGACY)
  if (legacyRaw !== null) {
    const migrated = parseStorageData(legacyRaw, false)
    if (migrated) {
      localStorage.setItem(TEAM_WATCH_STORAGE_NAMESPACE, JSON.stringify(migrated))
      localStorage.removeItem(TEAM_WATCH_STORAGE_NAMESPACE_LEGACY)
      return migrated
    }
    return buildStorageData()
  }

  const currentRaw = localStorage.getItem(TEAM_WATCH_STORAGE_NAMESPACE)
  if (currentRaw) {
    const parsed = parseStorageData(currentRaw, true)
    if (parsed)
      return parsed
  }

  return buildStorageData()
}

// 写入 TeamWatch 存档（仅更新本模块字段并标准化）。
export function saveTeamWatchStorageData(data: TeamWatchStorageData) {
  const currentRaw = localStorage.getItem(TEAM_WATCH_STORAGE_NAMESPACE)
  let current: Record<string, unknown> = {}
  if (currentRaw) {
    try {
      current = JSON.parse(currentRaw) as Record<string, unknown>
    }
    catch {
      current = {}
    }
  }

  current.watchJobsActionsIDUser = normalizeWatchJobsActionsIDUser(data.watchJobsActionsIDUser)
  current.sortRuleUser = normalizeSortRuleUser(data.sortRuleUser)
  current.actionMetaUser = normalizeActionMetaUser(data.actionMetaUser)
  localStorage.setItem(TEAM_WATCH_STORAGE_NAMESPACE, JSON.stringify(current))
}
