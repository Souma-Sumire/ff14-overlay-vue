import { BAKED_ACTION_META_LITE_BY_ID } from '@/resources/generated/bakedActionMetaLite'
import { ROLE_ACTION_CATEGORY_BY_JOB } from '@/resources/generated/roleActionCategoryByJob'
import { getGlobalSkillMetaByActionId } from '@/resources/globalSkills'
import { ACTION_JOBS_BY_CLASS_JOB_CATEGORY } from '@/resources/logic/actionClassJobCategoryIndex'
import { markRoleActionId, resolveActionMinLevel } from '@/resources/logic/actionMinLevel'
import { getActionNameLite } from '@/resources/logic/actionNameLite'
import { idToSrc, parseDynamicValue } from '@/utils/dynamicValue'
import Util from '@/utils/util'
import { getIconSrcById, getIconSrcByPath } from '@/utils/xivapi'

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

export function uniqueInts(input: (number | string | undefined | null)[]) {
  return [...new Set(input.map(Number))].filter(v => Number.isFinite(v) && v > 0)
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
    const resolvedRoleJobs = uniqueInts(
      battleJobEnums.filter((jobEnum) => {
        const categories = ROLE_ACTION_CATEGORY_BY_JOB[jobEnum] ?? []
        return roleCategoryTargetIds.some(categoryId => categories.includes(categoryId))
      }),
    )
    if (resolvedRoleJobs.length === 0)
      return []
    return resolvedRoleJobs
  }

  if (classJobTargetId <= 0) {
    const jobsByCategory = ACTION_JOBS_BY_CLASS_JOB_CATEGORY.get(classJobCategoryTargetId)
    if (jobsByCategory && jobsByCategory.length > 0)
      return [...jobsByCategory]
    return []
  }

  const resolvedJobs = uniqueInts(
    battleJobEnums.filter((jobEnum) => {
      return jobEnum === classJobTargetId
        || Util.baseJobEnumConverted(jobEnum) === classJobTargetId
        || Util.baseJobEnumConverted(classJobTargetId) === jobEnum
    }),
  )
  if (resolvedJobs.length === 0)
    return []
  return resolvedJobs
}

export function resolveBakedActionMeta(actionId: number): ResolvedBakedActionMeta | undefined {
  const id = Math.trunc(actionId) || 0
  if (id <= 0)
    return undefined
  const baked = BAKED_ACTION_META_LITE_BY_ID[id]
  if (!baked)
    return undefined

  const isRoleAction = !!baked.isRoleAction
  const classJobTargetId = Number(baked.classJob) || 0
  const classJobCategoryTargetId = Number(baked.classJobCategory) || 0
  const actionCategoryTargetId = Number(baked.actionCategory) || 0
  const recast1000ms = (Number(baked.recast100ms) || 0) / 10
  const maxCharges = Number(baked.maxCharges) || 0
  const classJobLevel = resolveActionMinLevel(baked.classJobLevel || 1, {
    actionId: id,
    isRoleAction,
    fallback: 1,
  })
  const jobs = resolveActionJobsFromTargets(
    classJobTargetId,
    classJobCategoryTargetId,
    actionCategoryTargetId,
    isRoleAction,
  )

  return {
    id,
    name: String(baked.name ?? '').trim(),
    iconId: Number(baked.icon) || 0,
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
  const id = Math.trunc(actionId) || 0
  const normalizedLevel = Math.max(1, Math.trunc(level))
  const globalMeta = getGlobalSkillMetaByActionId(id)

  const baseRecast1000ms = options?.baseRecast1000ms || 0
  const baseDuration = options?.baseDuration || 0
  const fallbackMinLevel = options?.baseMinLevel || 1

  const resolvedId = Number(parseDynamicValue(globalMeta?.id ?? id, normalizedLevel)) || id
  const recast1000ms = Number(parseDynamicValue(globalMeta?.recast1000ms ?? baseRecast1000ms, normalizedLevel)) || baseRecast1000ms
  const duration = Number(parseDynamicValue(globalMeta?.duration ?? baseDuration, normalizedLevel)) || baseDuration

  const minLevel = resolveActionMinLevel(globalMeta?.minLevel ?? fallbackMinLevel, {
    actionId: id,
    isRoleAction: options?.isRoleAction,
    fallback: fallbackMinLevel,
  })

  const jobsFromGlobal = uniqueInts(globalMeta?.job ?? [])
  return {
    resolvedId,
    recast1000ms,
    duration,
    minLevel,
    jobsFromGlobal,
  }
}

export function resolveApiActionMeta(actionId: number, row: Record<string, unknown>): ResolvedApiActionMeta {
  const id = Number(row.ID) || actionId || 0
  const isRoleAction = !!row.IsRoleAction
  markRoleActionId(id, isRoleAction)
  const classJobTargetId = Number(row.ClassJobTargetID) || 0
  const classJobCategoryTargetId = Number(row.ClassJobCategoryTargetID) || 0
  const actionCategoryTargetId = Number(row.ActionCategoryTargetID) || 0
  const recast1000ms = (Number(row.Recast100ms) || 0) / 10
  const maxCharges = Number(row.MaxCharges) || 0
  const classJobLevel = resolveActionMinLevel(row.ClassJobLevel || 1, {
    actionId: id,
    isRoleAction,
    fallback: 1,
  })
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
  if (resolvedActionId === fallbackActionId) {
    return getActionNameLite(resolvedActionId)
      || (typeof apiName === 'string' && apiName.trim() ? apiName : '')
      || `#${resolvedActionId}`
  }
  return getActionNameLite(resolvedActionId)
    || getActionNameLite(fallbackActionId)
    || (typeof apiName === 'string' && apiName.trim() ? apiName : '')
    || `#${resolvedActionId}`
}

export function resolveActionIconSrc(actionId: number, options?: { apiIconPath?: string, highRes?: boolean }) {
  const baked = resolveBakedActionMeta(actionId)
  if (baked?.iconId && baked.iconId > 0)
    return getIconSrcById(baked.iconId, options?.highRes ?? true)
  const iconById = idToSrc(actionId)
  if (iconById)
    return iconById
  if (typeof options?.apiIconPath === 'string' && options.apiIconPath.trim()) {
    return getIconSrcByPath(options.apiIconPath, false, options?.highRes ?? false)
  }
  return ''
}
