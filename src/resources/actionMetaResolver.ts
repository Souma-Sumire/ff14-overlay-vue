import { resolveActionMinLevel } from '@/resources/actionMinLevel'
import { BAKED_ACTION_META_LITE_BY_ID } from '@/resources/bakedActionMetaLite'
import { ROLE_ACTION_CATEGORY_BY_JOB } from '@/resources/roleActionCategoryByJob'
import Util from '@/utils/util'

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

function normalizeInt(value: unknown, fallback = 0, min = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return Math.max(min, Math.trunc(fallback))
  return Math.max(min, Math.trunc(numeric))
}

function uniqueInts(input: number[]) {
  return [...new Set(input.filter(v => Number.isFinite(v) && v > 0).map(v => Math.trunc(v)))]
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
