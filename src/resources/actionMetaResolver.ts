import { resolveActionMinLevel } from '@/resources/actionMinLevel'
import { BAKED_ACTION_META_LITE_BY_ID } from '@/resources/bakedActionMetaLite'
import { getGlobalSkillMetaByActionId } from '@/resources/globalSkills'
import { ROLE_ACTION_CATEGORY_BY_JOB } from '@/resources/roleActionCategoryByJob'
import { getActionChinese } from '@/resources/actionChinese'
import { idToSrc } from '@/utils/dynamicValue'
import { parseDynamicValue } from '@/utils/dynamicValue'
import Util from '@/utils/util'
import { getIconSrcByPath } from '@/utils/xivapi'

export interface ResolvedBakedActionMeta {
  id: number
  name: string
  iconId: number
  classJobTargetId: number
  classJobCategoryTargetId: number
  actionCategoryTargetId: number
  recast1000ms: number
  maxCharges: number
  classJobLevel: number
  isRoleAction: boolean
  jobs: number[]
}

export interface ResolvedApiActionMeta {
  id: number
  name: string
  classJobTargetId: number
  classJobCategoryTargetId: number
  actionCategoryTargetId: number
  recast1000ms: number
  maxCharges: number
  classJobLevel: number
  isRoleAction: boolean
  jobs: number[]
}

export interface ResolvedActionLevelMeta {
  resolvedId: number
  recast1000ms: number
  duration: number
  minLevel: number
  jobsFromGlobal: number[]
}

function normalizeInt(value: unknown, fallback = 0, min = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return Math.max(min, Math.trunc(fallback))
  return Math.max(min, Math.trunc(numeric))
}

function uniqueInts(input: number[]) {
  return [...new Set(input.filter(v => Number.isFinite(v) && v > 0).map(v => Math.trunc(v)))]
}

function resolveDynamicNumber(value: unknown, level: number, fallback = 0) {
  try {
    const resolved = parseDynamicValue(value as any, level)
    if (!Number.isFinite(resolved))
      return fallback
    return Number(resolved)
  }
  catch {
    return fallback
  }
}

export function resolveActionJobsFromTargets(
  classJobTargetId: number,
  classJobCategoryTargetId: number,
  actionCategoryTargetId: number,
  isRoleAction: boolean,
) {
  const battleJobEnums = Util.getBattleJobs()
    .filter(job => job !== 'NONE')
    .filter(job => Util.isCombatJob(job))
    .map(job => Util.jobToJobEnum(job))

  if (isRoleAction) {
    const roleCategoryTargetIds = uniqueInts([classJobCategoryTargetId, actionCategoryTargetId])
    if (!roleCategoryTargetIds.length)
      return []
    return uniqueInts(
      battleJobEnums.filter((jobEnum) => {
        const categories = ROLE_ACTION_CATEGORY_BY_JOB[jobEnum] ?? []
        return roleCategoryTargetIds.some(categoryId => categories.includes(categoryId))
      }),
    )
  }

  if (classJobTargetId <= 0)
    return []

  return uniqueInts(
    battleJobEnums.filter((jobEnum) => {
      return jobEnum === classJobTargetId
        || Util.baseJobEnumConverted(jobEnum) === classJobTargetId
        || Util.baseJobEnumConverted(classJobTargetId) === jobEnum
    }),
  )
}

export function resolveBakedActionMeta(actionId: number): ResolvedBakedActionMeta | undefined {
  const id = normalizeInt(actionId, 0, 1)
  if (id <= 0)
    return undefined
  const baked = BAKED_ACTION_META_LITE_BY_ID[id]
  if (!baked)
    return undefined

  const isRoleAction = Number(baked.isRoleAction ?? 0) > 0
  const classJobTargetId = normalizeInt(baked.classJob, 0, 0)
  const classJobCategoryTargetId = normalizeInt(baked.classJobCategory, 0, 0)
  const actionCategoryTargetId = normalizeInt(baked.actionCategory, 0, 0)
  const recast1000ms = normalizeInt(Number(baked.recast100ms ?? 0) / 10, 0, 0)
  const maxCharges = normalizeInt(baked.maxCharges, 0, 0)
  const classJobLevel = resolveActionMinLevel(
    normalizeInt(baked.classJobLevel, 1, 1),
    {
      actionId: id,
      isRoleAction,
      fallback: 1,
    },
  )
  const jobs = resolveActionJobsFromTargets(
    classJobTargetId,
    classJobCategoryTargetId,
    actionCategoryTargetId,
    isRoleAction,
  )

  return {
    id,
    name: String(baked.name ?? '').trim(),
    iconId: normalizeInt(baked.icon, 0, 0),
    classJobTargetId,
    classJobCategoryTargetId,
    actionCategoryTargetId,
    recast1000ms,
    maxCharges,
    classJobLevel,
    isRoleAction,
    jobs,
  }
}

export function hasBakedActionMeta(actionId: number, options?: { requireActionCategory?: boolean }) {
  const resolved = resolveBakedActionMeta(actionId)
  if (!resolved)
    return false
  if (options?.requireActionCategory)
    return resolved.actionCategoryTargetId > 0
  return true
}

export function resolveActionMetaByLevel(
  actionId: number,
  level: number,
  options?: {
    baseRecast1000ms?: number
    baseDuration?: number
    baseMinLevel?: number
    isRoleAction?: boolean
  },
): ResolvedActionLevelMeta {
  const id = normalizeInt(actionId, 0, 1)
  const normalizedLevel = normalizeInt(level, 1, 1)
  const globalMeta = getGlobalSkillMetaByActionId(id)

  const resolvedId = normalizeInt(
    resolveDynamicNumber(globalMeta?.id ?? id, normalizedLevel, id),
    id,
    1,
  )
  const baseRecast1000ms = normalizeInt(options?.baseRecast1000ms, 0, 0)
  const recast1000ms = normalizeInt(
    resolveDynamicNumber(globalMeta?.recast1000ms ?? baseRecast1000ms, normalizedLevel, baseRecast1000ms),
    baseRecast1000ms,
    0,
  )
  const baseDuration = normalizeInt(options?.baseDuration, 0, 0)
  const duration = normalizeInt(
    resolveDynamicNumber(globalMeta?.duration ?? baseDuration, normalizedLevel, baseDuration),
    baseDuration,
    0,
  )

  const fallbackMinLevel = normalizeInt(options?.baseMinLevel, 1, 1)
  const minLevel = resolveActionMinLevel(
    globalMeta?.minLevel ?? fallbackMinLevel,
    {
      actionId: id,
      isRoleAction: options?.isRoleAction,
      fallback: fallbackMinLevel,
    },
  )

  const jobsFromGlobal = uniqueInts(globalMeta?.job ?? [])
  return {
    resolvedId,
    recast1000ms,
    duration,
    minLevel,
    jobsFromGlobal,
  }
}

export function shouldFetchResolvedActionMeta(
  input: {
    actionCategoryTargetId?: number
    jobs?: number[]
  },
  options?: {
    requireActionCategory?: boolean
    requireJobs?: boolean
  },
) {
  const requireActionCategory = options?.requireActionCategory ?? true
  const requireJobs = options?.requireJobs ?? false

  if (requireActionCategory) {
    const actionCategoryTargetId = normalizeInt(input.actionCategoryTargetId, 0, 0)
    if (actionCategoryTargetId <= 0)
      return true
  }

  if (requireJobs) {
    const jobs = uniqueInts((input.jobs ?? []).map(v => Number(v)))
    if (!jobs.length)
      return true
  }

  return false
}

export function resolveApiActionMeta(actionId: number, row: Record<string, unknown>): ResolvedApiActionMeta {
  const id = normalizeInt(Number(row.ID ?? actionId), actionId, 1)
  const isRoleAction = Number(row.IsRoleAction ?? 0) > 0
  const classJobTargetId = normalizeInt(row.ClassJobTargetID, 0, 0)
  const classJobCategoryTargetId = normalizeInt(row.ClassJobCategoryTargetID, 0, 0)
  const actionCategoryTargetId = normalizeInt(row.ActionCategoryTargetID, 0, 0)
  const recast1000ms = normalizeInt(Number(row.Recast100ms ?? 0) / 10, 0, 0)
  const maxCharges = normalizeInt(row.MaxCharges, 0, 0)
  const classJobLevel = resolveActionMinLevel(
    normalizeInt(row.ClassJobLevel, 1, 1),
    {
      actionId: id,
      isRoleAction,
      fallback: 1,
    },
  )
  const jobs = resolveActionJobsFromTargets(
    classJobTargetId,
    classJobCategoryTargetId,
    actionCategoryTargetId,
    isRoleAction,
  )

  return {
    id,
    name: typeof row.Name === 'string' ? row.Name : '',
    classJobTargetId,
    classJobCategoryTargetId,
    actionCategoryTargetId,
    recast1000ms,
    maxCharges,
    classJobLevel,
    isRoleAction,
    jobs,
  }
}

export function resolveActionDisplayName(resolvedActionId: number, fallbackActionId: number, apiName?: string) {
  return getActionChinese(resolvedActionId)
    || getActionChinese(fallbackActionId)
    || (typeof apiName === 'string' && apiName.trim() ? apiName : '')
    || `#${resolvedActionId}`
}

export function resolveActionIconSrc(actionId: number, options?: { apiIconPath?: string, highRes?: boolean }) {
  const iconById = idToSrc(actionId)
  if (iconById)
    return iconById
  if (typeof options?.apiIconPath === 'string' && options.apiIconPath.trim()) {
    return getIconSrcByPath(options.apiIconPath, false, options?.highRes ?? false)
  }
  return ''
}
