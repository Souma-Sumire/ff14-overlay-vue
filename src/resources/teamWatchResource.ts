import type { DynamicValue } from '@/types/dynamicValue'
import type { TeamWatchActionMetaRaw, TeamWatchStorageData } from '@/types/teamWatchTypes'
import { resolveActionDisplayName, resolveActionMinLevel, resolveBakedActionMeta, uniqueInts } from '@/resources/logic/actionMetaResolver'
import { ACTION_UPGRADE_STEPS, normalizeUpgradeActionId } from '@/utils/compareSaveAction'
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

// 深拷贝 actionMetaUser（避免响应式对象被直接复用）。
export function cloneTeamWatchActionMetaMap(input: Record<number, TeamWatchActionMetaRaw>) {
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [Math.trunc(Number(k)) || 0, { ...v }]))
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
      return (Number.isFinite(numeric) && numeric >= 0) ? numeric : 0
    })
    return normalized.length > 0 ? normalized : [0]
  }

  const normalizedBaseJob = Number(baseJob) || 0
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
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const id = Number(raw.id) || actionId || 0
  const name = (typeof raw.name === 'string' && raw.name.trim()) ? raw.name.trim() : resolveActionDisplayName(id, id)
  const iconSrc = (typeof raw.iconSrc === 'string' && raw.iconSrc.trim()) ? raw.iconSrc.trim() : idToSrc(id)

  return {
    id,
    name,
    iconSrc,
    actionCategory: Number(raw.actionCategory) || 0,
    recast1000ms: (typeof raw.recast1000ms === 'string' && raw.recast1000ms.trim()) ? raw.recast1000ms.trim() : (Number.isFinite(raw.recast1000ms) ? raw.recast1000ms as any : 0),
    duration: (typeof raw.duration === 'string' && raw.duration.trim()) ? raw.duration.trim() : (Number.isFinite(raw.duration) ? raw.duration as any : 0),
    maxCharges: (typeof raw.maxCharges === 'string' && raw.maxCharges.trim()) ? raw.maxCharges.trim() : (Number.isFinite(raw.maxCharges) ? raw.maxCharges as any : 0),
    classJobLevel: resolveActionMinLevel(raw.classJobLevel ?? 1, {
      actionId: id,
      fallback: 1,
    }),
  }
}

function normalizeWatchJobsActionsIDUser(value: unknown): Record<number, number[]> {
  const extraJobs = value && typeof value === 'object' ? Object.keys(value as Record<string, unknown>).map(v => Number(v) || 0) : []
  const jobs = uniqueInts([...DEFAULT_JOB_SORT_ORDER, ...extraJobs])
  const base: Record<number, number[]> = {}
  jobs.forEach((job) => {
    base[job] = [...(TEAM_WATCH_WATCH_ACTIONS_DEFAULT[job] ?? TEAM_WATCH_EMPTY_ACTIONS)]
  })

  if (!value || typeof value !== 'object')
    return base

  const normalizeActions = (input: any) => {
    if (!Array.isArray(input))
      return []
    return input.map(v => Number(v) || 0).filter(v => Number.isFinite(v) && v >= 0)
  }

  for (const [rawJob, rawActions] of Object.entries(value as Record<string, unknown>)) {
    const job = Number(rawJob) || 0
    if (job > 0)
      base[job] = normalizeActions(rawActions)
  }
  return base
}

function normalizeSortRuleUser(value: unknown): number[] {
  const normalized = uniqueInts(Array.isArray(value) ? value : [...DEFAULT_JOB_SORT_ORDER])
  const jobs = uniqueInts([...DEFAULT_JOB_SORT_ORDER, ...normalized])
  const unique = [...new Set(normalized)]
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
