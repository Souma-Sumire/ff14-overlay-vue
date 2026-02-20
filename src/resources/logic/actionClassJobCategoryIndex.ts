import { BAKED_ACTION_META_LITE_BY_ID } from '@/resources/generated/bakedActionMetaLite'
import Util from '@/utils/util'

function resolveBattleJobEnums() {
  return Util.getBattleJobs()
    .filter(job => job !== 'NONE')
    .filter(job => Util.isCombatJob(job))
    .map(job => Util.jobToJobEnum(job))
}

function resolveJobsByClassJobTargetId(classJobTargetId: number, battleJobEnums: number[]) {
  return battleJobEnums.filter((jobEnum) => {
    return jobEnum === classJobTargetId
      || Util.baseJobEnumConverted(jobEnum) === classJobTargetId
      || Util.baseJobEnumConverted(classJobTargetId) === jobEnum
  })
}

const maps = (() => {
  const battleJobEnums = resolveBattleJobEnums()
  const jobsByCategory = new Map<number, Set<number>>()
  const categoriesByJob = new Map<number, Set<number>>()

  Object.values(BAKED_ACTION_META_LITE_BY_ID).forEach((meta) => {
    const classJobTargetId = Math.trunc(Number(meta.classJob)) || 0
    const classJobCategoryTargetId = Math.trunc(Number(meta.classJobCategory)) || 0
    const isRoleAction = !!meta.isRoleAction
    if (isRoleAction || classJobTargetId <= 0 || classJobCategoryTargetId <= 0)
      return

    const resolvedJobs = resolveJobsByClassJobTargetId(classJobTargetId, battleJobEnums)
    if (resolvedJobs.length === 0)
      return

    if (!jobsByCategory.has(classJobCategoryTargetId))
      jobsByCategory.set(classJobCategoryTargetId, new Set<number>())
    const targetJobs = jobsByCategory.get(classJobCategoryTargetId)!

    resolvedJobs.forEach((jobEnum) => {
      targetJobs.add(jobEnum)
      if (!categoriesByJob.has(jobEnum))
        categoriesByJob.set(jobEnum, new Set<number>())
      categoriesByJob.get(jobEnum)!.add(classJobCategoryTargetId)
    })
  })

  const jobsByCategorySorted = new Map<number, number[]>()
  jobsByCategory.forEach((jobs, categoryId) => {
    jobsByCategorySorted.set(categoryId, [...jobs].sort((a, b) => a - b))
  })

  return {
    jobsByCategory: jobsByCategorySorted,
    categoriesByJob,
  }
})()

export const ACTION_JOBS_BY_CLASS_JOB_CATEGORY = maps.jobsByCategory
export const CLASS_JOB_ACTION_CATEGORIES_BY_JOB = maps.categoriesByJob
