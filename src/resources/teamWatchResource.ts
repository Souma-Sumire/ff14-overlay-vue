import type { DynamicValue } from '@/types/dynamicValue'
import type { KeigennSkill } from '@/types/keigennRecord2'
import type { TeamWatchActionMetaRaw, TeamWatchStorageData } from '@/types/teamWatchTypes'
import { getActionChinese } from '@/resources/actionChinese'
import { keigennSkills } from '@/resources/keigennSkillResource'
import { chineseToIcon } from '@/utils/chineseToIcon'
import {
  compareSame,
  isLowerTierActionId,
  normalizeUpgradeActionId,
} from '@/utils/compareSaveAction'
import { idToSrc, parseDynamicValue } from '@/utils/dynamicValue'
import { getIconSrcById } from '@/utils/xivapi'
import { DEFAULT_JOB_SORT_ORDER } from './jobSortOrder'

// TeamWatch 存档版本号（用于本地数据迁移判断）。
export const TEAM_WATCH_STORAGE_VERSION = 5
// TeamWatch v5 本地存储键名。
export const TEAM_WATCH_STORAGE_NAMESPACE = 'TeamWatch5'
// TeamWatch 旧版本本地存储键名（用于无感迁移）。
export const TEAM_WATCH_STORAGE_NAMESPACE_LEGACY = 'TeamWatch4'

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
// 构建技能索引时使用的最高测试等级。
const TEAM_WATCH_MAX_TEST_LEVEL = 100

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

// 解析某个技能在指定等级下的真实技能 ID。
function getSkillIdOnLevel(skill: KeigennSkill, level: number) {
  try {
    const id = parseDynamicValue(skill.id, level)
    if (!Number.isFinite(id) || id <= 0)
      return 0
    return Math.trunc(id)
  }
  catch {
    return 0
  }
}

// 基于 keigenn 技能定义构建 TeamWatch 原始元数据。
function buildMetaFromKeigenn(skill: KeigennSkill, actionId: number): TeamWatchActionMetaRaw {
  const level100ActionId = getSkillIdOnLevel(skill, TEAM_WATCH_MAX_TEST_LEVEL) || actionId
  const name = getActionChinese(level100ActionId) || getActionChinese(actionId) || `#${actionId}`
  const iconId = skill.overrideIconId ?? level100ActionId
  const iconByName = chineseToIcon(name)
  const iconSrc = idToSrc(iconId) || (iconByName ? getIconSrcById(iconByName, true) : '')

  return {
    id: skill.id,
    name,
    iconSrc,
    recast1000ms: skill.recast1000ms,
    duration: skill.duration ?? 0,
    maxCharges: skill.maxCharges ?? 0,
    classJobLevel: skill.minLevel,
  }
}

// 预构建 keigenn 技能索引（actionId -> TeamWatchActionMetaRaw）。
const teamWatchKeigennMetaIndex = (() => {
  const index = new Map<number, TeamWatchActionMetaRaw>()
  keigennSkills.forEach((skill) => {
    for (let level = 1; level <= TEAM_WATCH_MAX_TEST_LEVEL; level += 1) {
      const resolvedId = getSkillIdOnLevel(skill, level)
      if (resolvedId <= 0 || index.has(resolvedId))
        continue
      index.set(resolvedId, buildMetaFromKeigenn(skill, resolvedId))
    }
  })
  return index
})()

interface TeamWatchKeigennDefinedFlags {
  hasId: boolean
  hasRecast1000ms: boolean
  hasClassJobLevel: boolean
  hasDuration: boolean
  hasMaxCharges: boolean
  hasOverrideIcon: boolean
}

// 标记每个 actionId 在 keigenn 中是否显式声明过可选字段。
const teamWatchKeigennDefinedFlagsIndex = (() => {
  const index = new Map<number, TeamWatchKeigennDefinedFlags>()
  keigennSkills.forEach((skill) => {
    const hasId = Object.prototype.hasOwnProperty.call(skill, 'id')
    const hasRecast1000ms = Object.prototype.hasOwnProperty.call(skill, 'recast1000ms')
    const hasClassJobLevel = Object.prototype.hasOwnProperty.call(skill, 'minLevel')
    const hasDuration = skill.duration !== undefined
    const hasMaxCharges = skill.maxCharges !== undefined
    const hasOverrideIcon = skill.overrideIconId !== undefined
    if (!hasId && !hasRecast1000ms && !hasClassJobLevel && !hasDuration && !hasMaxCharges && !hasOverrideIcon)
      return

    for (let level = 1; level <= TEAM_WATCH_MAX_TEST_LEVEL; level += 1) {
      const resolvedId = getSkillIdOnLevel(skill, level)
      if (resolvedId <= 0)
        continue
      const previous = index.get(resolvedId) ?? {
        hasId: false,
        hasRecast1000ms: false,
        hasClassJobLevel: false,
        hasDuration: false,
        hasMaxCharges: false,
        hasOverrideIcon: false,
      }
      index.set(resolvedId, {
        hasId: previous.hasId || hasId,
        hasRecast1000ms: previous.hasRecast1000ms || hasRecast1000ms,
        hasClassJobLevel: previous.hasClassJobLevel || hasClassJobLevel,
        hasDuration: previous.hasDuration || hasDuration,
        hasMaxCharges: previous.hasMaxCharges || hasMaxCharges,
        hasOverrideIcon: previous.hasOverrideIcon || hasOverrideIcon,
      })
    }
  })
  return index
})()

// 判断技能是否为某条进化链中的下位技能。
export function isTeamWatchLowerTierActionId(actionId: number) {
  return isLowerTierActionId(actionId)
}

// 按技能 ID 获取 keigenn 元数据（含兼容 ID 回退）。
export function getTeamWatchMetaFromKeigenn(actionId: number): TeamWatchActionMetaRaw | undefined {
  const direct = teamWatchKeigennMetaIndex.get(actionId)
  if (direct)
    return { ...direct }
  const upgraded = normalizeUpgradeActionId(actionId)
  const upgradedMeta = teamWatchKeigennMetaIndex.get(upgraded)
  if (upgradedMeta)
    return { ...upgradedMeta }
  const normalized = compareSame(actionId)
  const normalizedMeta = teamWatchKeigennMetaIndex.get(normalized)
  if (normalizedMeta)
    return { ...normalizedMeta }
  return undefined
}

// 构建技能元数据兜底值（优先 keigenn，其次最小占位信息）。
export function buildTeamWatchFallbackMeta(actionId: number): TeamWatchActionMetaRaw {
  const keigennMeta = getTeamWatchMetaFromKeigenn(actionId)
  if (keigennMeta)
    return keigennMeta

  return {
    id: actionId,
    name: `#${actionId}`,
    iconSrc: '',
    recast1000ms: 0,
    duration: 0,
    maxCharges: 0,
    classJobLevel: 1,
  }
}

function getKeigennDefinedFlags(actionId: number): TeamWatchKeigennDefinedFlags {
  const upgradedActionId = normalizeUpgradeActionId(actionId)
  const normalizedActionId = compareSame(actionId)
  const merged: TeamWatchKeigennDefinedFlags = {
    hasId: false,
    hasRecast1000ms: false,
    hasClassJobLevel: false,
    hasDuration: false,
    hasMaxCharges: false,
    hasOverrideIcon: false,
  }
  ;[actionId, upgradedActionId, normalizedActionId].forEach((id) => {
    const flags = teamWatchKeigennDefinedFlagsIndex.get(id)
    if (!flags)
      return
    merged.hasId = merged.hasId || flags.hasId
    merged.hasRecast1000ms = merged.hasRecast1000ms || flags.hasRecast1000ms
    merged.hasClassJobLevel = merged.hasClassJobLevel || flags.hasClassJobLevel
    merged.hasDuration = merged.hasDuration || flags.hasDuration
    merged.hasMaxCharges = merged.hasMaxCharges || flags.hasMaxCharges
    merged.hasOverrideIcon = merged.hasOverrideIcon || flags.hasOverrideIcon
  })
  return merged
}

// 将任意元数据与 keigenn 元数据合并（仅显式声明字段才覆盖）。
export function mergeTeamWatchMetaWithKeigenn(actionId: number, raw: TeamWatchActionMetaRaw) {
  const preferred = getTeamWatchMetaFromKeigenn(actionId)
  if (!preferred)
    return { ...raw }
  const definedFlags = getKeigennDefinedFlags(actionId)

  return {
    ...raw,
    id: definedFlags.hasId ? preferred.id : raw.id,
    recast1000ms: definedFlags.hasRecast1000ms ? preferred.recast1000ms : raw.recast1000ms,
    duration: definedFlags.hasDuration ? preferred.duration : raw.duration,
    maxCharges: definedFlags.hasMaxCharges ? preferred.maxCharges : raw.maxCharges,
    classJobLevel: definedFlags.hasClassJobLevel ? preferred.classJobLevel : raw.classJobLevel,
    iconSrc: definedFlags.hasOverrideIcon ? (preferred.iconSrc || raw.iconSrc) : raw.iconSrc,
    name: raw.name,
  }
}

// 规范化 TeamWatchActionMetaRaw。
export function normalizeTeamWatchActionMetaRaw(actionId: number, value: unknown): TeamWatchActionMetaRaw {
  const fallback = buildTeamWatchFallbackMeta(actionId)
  if (!value || typeof value !== 'object')
    return fallback

  const raw = value as Record<string, unknown>
  const normalized: TeamWatchActionMetaRaw = {
    id: normalizeDynamicValue(raw.id, fallback.id),
    name: (typeof raw.name === 'string' && raw.name.trim()) ? raw.name.trim() : fallback.name,
    iconSrc: (typeof raw.iconSrc === 'string' && raw.iconSrc.trim()) ? raw.iconSrc.trim() : fallback.iconSrc,
    recast1000ms: normalizeDynamicValue(raw.recast1000ms, fallback.recast1000ms),
    duration: normalizeDynamicValue(raw.duration, fallback.duration),
    maxCharges: normalizeDynamicValue(raw.maxCharges, fallback.maxCharges),
    classJobLevel: normalizeClassJobLevel(raw.classJobLevel, fallback.classJobLevel),
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

// 解析并规范化存档字符串。
function parseStorageData(raw: string, preserveActionMeta: boolean, allowLegacyJobMap = false) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object')
      return null

    if (
      Object.prototype.hasOwnProperty.call(parsed, 'watchJobsActionsIDUser')
      || Object.prototype.hasOwnProperty.call(parsed, 'sortRuleUser')
      || Object.prototype.hasOwnProperty.call(parsed, 'actionMetaUser')
    ) {
      const normalized = parsed as Partial<TeamWatchStorageData>
      return {
        storageVersion: TEAM_WATCH_STORAGE_VERSION,
        watchJobsActionsIDUser: normalizeWatchJobsActionsIDUser(normalized.watchJobsActionsIDUser),
        sortRuleUser: normalizeSortRuleUser(normalized.sortRuleUser),
        actionMetaUser: preserveActionMeta
          ? normalizeActionMetaUser(normalized.actionMetaUser)
          : normalizeActionMetaUser(undefined),
      }
    }

    if (!allowLegacyJobMap)
      return null

    // TeamWatch4 legacy shape: { [jobId]: number[] }
    return {
      storageVersion: TEAM_WATCH_STORAGE_VERSION,
      watchJobsActionsIDUser: normalizeWatchJobsActionsIDUser(parsed),
      sortRuleUser: normalizeSortRuleUser(undefined),
      actionMetaUser: normalizeActionMetaUser(undefined),
    }
  }
  catch {
    return null
  }
}

// 读取 TeamWatch 存档（含 TeamWatch4 -> TeamWatch5 自动迁移）。
export function loadTeamWatchStorageData(): TeamWatchStorageData {
  const v5Raw = localStorage.getItem(TEAM_WATCH_STORAGE_NAMESPACE)
  if (v5Raw) {
    const parsed = parseStorageData(v5Raw, true)
    if (parsed)
      return parsed
    return {
      storageVersion: TEAM_WATCH_STORAGE_VERSION,
      watchJobsActionsIDUser: normalizeWatchJobsActionsIDUser(undefined),
      sortRuleUser: normalizeSortRuleUser(undefined),
      actionMetaUser: normalizeActionMetaUser(undefined),
    }
  }

  // Seamless migration from TeamWatch4:
  // keep only job sort/order and slot action IDs; rebuild all meta via v5 logic.
  const legacyRaw = localStorage.getItem(TEAM_WATCH_STORAGE_NAMESPACE_LEGACY)
  if (legacyRaw) {
    const migrated = parseStorageData(legacyRaw, false, true)
    if (migrated) {
      localStorage.setItem(TEAM_WATCH_STORAGE_NAMESPACE, JSON.stringify(migrated))
      return migrated
    }
  }

  return {
    storageVersion: TEAM_WATCH_STORAGE_VERSION,
    watchJobsActionsIDUser: normalizeWatchJobsActionsIDUser(undefined),
    sortRuleUser: normalizeSortRuleUser(undefined),
    actionMetaUser: normalizeActionMetaUser(undefined),
  }
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
  current.storageVersion = TEAM_WATCH_STORAGE_VERSION
  localStorage.setItem(TEAM_WATCH_STORAGE_NAMESPACE, JSON.stringify(current))
}
