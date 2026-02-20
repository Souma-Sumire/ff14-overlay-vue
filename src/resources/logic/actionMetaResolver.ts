import { useStorage } from '@vueuse/core'
import { ROLE_ACTION_CACHE_VERSION } from '@/resources/cacheVersion'
import { BAKED_ACTION_META_LITE_BY_ID } from '@/resources/generated/bakedActionMetaLite'
import { BAKED_UPGRADE_CHAIN_MIN_LEVEL_BY_ACTION_ID } from '@/resources/generated/bakedUpgradeChainMinLevel'
import { ROLE_ACTION_CATEGORY_BY_JOB } from '@/resources/generated/roleActionCategoryByJob'
import { ACTION_UPGRADE_STEPS, normalizeUpgradeActionId } from '@/utils/compareSaveAction'
import { idToSrc, parseDynamicValue } from '@/utils/dynamicValue'
import Util from '@/utils/util'
import { getIconSrcById, getIconSrcByPath } from '@/utils/xivapi'

// --- Types ---
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

export interface GlobalSkillMeta {
  id: number
  recast1000ms: any
  duration: any
  minLevel: number
  job: number[]
  maxCharges?: any
}

// --- Internal Constants & State ---
const ROLE_ACTION_MIN_LEVEL = 1
const ROLE_ACTION_CACHE_STORAGE_KEY = 'action-role-action-id-cache'
const ROLE_ACTION_CACHE_VERSION_STORAGE_KEY = 'action-role-action-id-cache-version'

const roleActionCacheVersion = useStorage<string>(ROLE_ACTION_CACHE_VERSION_STORAGE_KEY, '')
const roleActionIdStorage = useStorage<Record<string, 1>>(ROLE_ACTION_CACHE_STORAGE_KEY, {})

if (roleActionCacheVersion.value !== ROLE_ACTION_CACHE_VERSION) {
  roleActionIdStorage.value = {}
  roleActionCacheVersion.value = ROLE_ACTION_CACHE_VERSION
}

const knownRoleActionIds = new Set<number>([
  ...Object.entries(BAKED_ACTION_META_LITE_BY_ID)
    .filter(([_, meta]) => (Number(meta.isRoleAction) || 0) > 0)
    .map(([id]) => Number(id) || 0)
    .filter(id => id > 0),
  ...Object.keys(roleActionIdStorage.value).map(Number).filter(v => v > 0),
])

// --- Internal Helpers ---
export function uniqueInts(input: (number | string | undefined | null)[]) {
  return [...new Set(input.map(Number))].filter(v => v > 0)
}

function persistKnownRoleActionIds() {
  roleActionIdStorage.value = Object.fromEntries([...knownRoleActionIds].map(id => [String(id), 1 as const]))
}

// --- Action Category & Jobs Mapping ---
const battleJobEnums = Util.getBattleJobs()
  .filter(job => job !== 'NONE' && Util.isCombatJob(job))
  .map(job => Util.jobToJobEnum(job))

const jobsByClassJobCategory = new Map<number, number[]>()
const categoriesByJob = new Map<number, number[]>()

Object.values(BAKED_ACTION_META_LITE_BY_ID).forEach((meta) => {
  const cjId = Number(meta.classJob) || 0
  const cjcId = Number(meta.classJobCategory) || 0
  if (meta.isRoleAction || cjId <= 0 || cjcId <= 0)
    return

  const resolvedJobs = battleJobEnums.filter(j => j === cjId || Util.baseJobEnumConverted(j) === cjId || Util.baseJobEnumConverted(cjId) === j)
  if (!resolvedJobs.length)
    return

  if (!jobsByClassJobCategory.has(cjcId))
    jobsByClassJobCategory.set(cjcId, [])
  const targetJobs = jobsByClassJobCategory.get(cjcId)!
  resolvedJobs.forEach((j) => {
    if (!targetJobs.includes(j))
      targetJobs.push(j)
    if (!categoriesByJob.has(j))
      categoriesByJob.set(j, [])
    const jobCats = categoriesByJob.get(j)!
    if (!jobCats.includes(cjcId))
      jobCats.push(cjcId)
  })
})

// --- Core Resolver Functions ---

export function resolveActionMinLevel(level: any, options?: { actionId?: number, isRoleAction?: any, fallback?: number }) {
  const fallback = Number(options?.fallback) || 1
  const actionId = Number(options?.actionId) || 0

  if ((Number(options?.isRoleAction) || 0) > 0 || knownRoleActionIds.has(actionId)) {
    if (actionId > 0 && !knownRoleActionIds.has(actionId)) {
      knownRoleActionIds.add(actionId)
      persistKnownRoleActionIds()
    }
    return ROLE_ACTION_MIN_LEVEL
  }

  const base = Number(level) || fallback
  if (actionId <= 0)
    return base

  const bakedFamily = Number(BAKED_UPGRADE_CHAIN_MIN_LEVEL_BY_ACTION_ID[actionId])
  if (bakedFamily > 0)
    return Math.min(base, bakedFamily)

  const bakedLite = Number(BAKED_ACTION_META_LITE_BY_ID[actionId]?.classJobLevel ?? 0)
  if (bakedLite > 0)
    return Math.min(base, bakedLite)

  return base
}

export function resolveActionJobsFromTargets(cj: number, cjc: number, ac: number, isRole: boolean) {
  if (isRole) {
    const cats = uniqueInts([cjc, ac])
    return battleJobEnums.filter(j => cats.some(c => (ROLE_ACTION_CATEGORY_BY_JOB[j] ?? []).includes(c)))
  }
  if (cj <= 0)
    return [...(jobsByClassJobCategory.get(cjc) ?? [])]
  return battleJobEnums.filter(j => j === cj || Util.baseJobEnumConverted(j) === cj || Util.baseJobEnumConverted(cj) === j)
}

export function resolveBakedActionMeta(actionId: number): ResolvedBakedActionMeta | undefined {
  const baked = BAKED_ACTION_META_LITE_BY_ID[actionId]
  if (!baked)
    return undefined

  const id = Number(actionId)
  const isRole = !!baked.isRoleAction
  const cj = Number(baked.classJob) || 0
  const cjc = Number(baked.classJobCategory) || 0
  const ac = Number(baked.actionCategory) || 0

  return {
    id,
    name: String(baked.name ?? '').trim(),
    iconId: Number(baked.icon) || 0,
    classJobTargetId: cj,
    classJobCategoryTargetId: cjc,
    actionCategoryTargetId: ac,
    recast1000ms: (Number(baked.recast100ms) || 0) / 10,
    maxCharges: Number(baked.maxCharges) || 1,
    classJobLevel: resolveActionMinLevel(baked.classJobLevel || 1, { actionId, isRoleAction: isRole }),
    isRoleAction: isRole,
    jobs: resolveActionJobsFromTargets(cj, cjc, ac, isRole),
  }
}

// --- Global Skills Soul ---
const globalSkillMetaMap = new Map<number, GlobalSkillMeta>()

export function initGlobalSkills(definitions: any[]) {
  const jobsBySkillId = new Map<number, number[]>()
  definitions.forEach((d) => {
    const id = Number(parseDynamicValue(d.id, 100)) || 0
    if (id <= 0)
      return
    const j = uniqueInts(d.job ?? [])
    if (j.length)
      jobsBySkillId.set(id, uniqueInts([...(jobsBySkillId.get(id) ?? []), ...j]))
  })

  definitions.forEach((d) => {
    const id = Number(parseDynamicValue(d.id, 100)) || 0
    if (id <= 0)
      return
    const inheritedJobs = jobsBySkillId.get(id) ?? []

    for (let level = 1; level <= 100; level++) {
      const aid = Number(parseDynamicValue(d.id, level)) || 0
      if (aid <= 0)
        continue

      const baked = BAKED_ACTION_META_LITE_BY_ID[aid]
      const fromMap = Number(baked?.classJobLevel ?? 0)
      const minL = resolveActionMinLevel(fromMap || d.minLevel || 1, { actionId: aid })

      const prev = globalSkillMetaMap.get(aid)
      globalSkillMetaMap.set(aid, {
        id,
        recast1000ms: d.recast1000ms ?? prev?.recast1000ms ?? 0,
        duration: d.duration ?? prev?.duration ?? 0,
        minLevel: prev ? Math.min(prev.minLevel, minL) : minL,
        job: uniqueInts([...(prev?.job ?? []), ...inheritedJobs]),
        maxCharges: d.maxCharges ?? prev?.maxCharges,
      })
    }
  })
}

export function getGlobalSkillDefinitionById(actionId: number) {
  return globalSkillMetaMap.get(actionId)
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
) {
  const global = getGlobalSkillDefinitionById(actionId)
  const rId = Number(parseDynamicValue(global?.id ?? actionId, level)) || actionId
  const rRecast = Number(parseDynamicValue(global?.recast1000ms ?? options?.baseRecast1000ms ?? 0, level)) || (options?.baseRecast1000ms ?? 0)
  const rDur = Number(parseDynamicValue(global?.duration ?? options?.baseDuration ?? 0, level)) || (options?.baseDuration ?? 0)
  const minL = resolveActionMinLevel(global?.minLevel ?? options?.baseMinLevel ?? 1, {
    actionId,
    isRoleAction: options?.isRoleAction,
    fallback: options?.baseMinLevel ?? 1,
  })
  return { resolvedId: rId, recast1000ms: rRecast, duration: rDur, minLevel: minL, jobsFromGlobal: global?.job ?? [] }
}

export function resolveApiActionMeta(actionId: number, row: any) {
  const id = Number(row.ID) || actionId || 0
  const isRole = !!row.IsRoleAction
  if (isRole)
    markRoleActionId(id, 1)
  const cj = Number(row.ClassJobTargetID) || 0
  const cjc = Number(row.ClassJobCategoryTargetID) || 0
  const ac = Number(row.ActionCategoryTargetID) || 0
  return {
    id,
    name: String(row.Name || ''),
    classJobTargetId: cj,
    classJobCategoryTargetId: cjc,
    actionCategoryTargetId: ac,
    recast1000ms: (Number(row.Recast100ms) || 0) / 10,
    maxCharges: Number(row.MaxCharges) || 1,
    classJobLevel: resolveActionMinLevel(row.ClassJobLevel || 1, { actionId: id, isRoleAction: isRole }),
    isRoleAction: isRole,
    jobs: resolveActionJobsFromTargets(cj, cjc, ac, isRole),
  }
}

export function markRoleActionId(actionId: number, isRoleAction: any) {
  const id = Number(actionId) || 0
  if (id <= 0 || (Number(isRoleAction) || 0) <= 0)
    return
  if (!knownRoleActionIds.has(id)) {
    knownRoleActionIds.add(id)
    persistKnownRoleActionIds()
  }
}

// --- Exports and Mappings ---
export const ACTION_JOBS_BY_CLASS_JOB_CATEGORY = jobsByClassJobCategory
export const CLASS_JOB_ACTION_CATEGORIES_BY_JOB = categoriesByJob

export function actionId2ClassJobLevel(id: number): string | undefined {
  if (id <= 0)
    return undefined
  const raw = Number(BAKED_ACTION_META_LITE_BY_ID[id]?.classJobLevel ?? 0)
  if (raw <= 0)
    return undefined
  return String(resolveActionMinLevel(raw, { actionId: id, fallback: 1 }))
}

let cachedActionList: Array<{ id: number, name: string }> | null = null
export function searchActionNamesLite(query: string, limit = 100): Array<{ id: number, name: string }> {
  if (!query)
    return []
  if (!cachedActionList) {
    cachedActionList = Object.entries(BAKED_ACTION_META_LITE_BY_ID).map(([id, row]) => {
      const nid = Number(id)
      const name = String(row?.name ?? '').trim()
      if (!name || !actionId2ClassJobLevel(nid))
        return null
      return { id: nid, name }
    }).filter((v): v is { id: number, name: string } => !!v)
  }
  const q = query.toLowerCase()
  const result: any[] = []
  for (const item of cachedActionList) {
    if (item.name.toLowerCase().includes(q) || String(item.id).includes(q)) {
      result.push(item)
      if (result.length >= limit)
        break
    }
  }
  return result
}

export function getActionNameLite(id: number): string | undefined {
  if (id <= 0)
    return undefined
  return BAKED_ACTION_META_LITE_BY_ID[id]?.name
}

// --- Display Helpers ---
export function resolveActionDisplayName(aid: number, fallback: number, apiName?: string) {
  const getName = (id: number) => BAKED_ACTION_META_LITE_BY_ID[id]?.name
  return getName(aid) || getName(fallback) || (apiName?.trim() || '') || `#${aid}`
}

export function resolveActionIconSrc(aid: number, options?: { apiIconPath?: string, highRes?: boolean }) {
  const iconId = Number(BAKED_ACTION_META_LITE_BY_ID[aid]?.icon) || 0
  if (iconId > 0)
    return getIconSrcById(iconId, options?.highRes ?? true)
  const src = idToSrc(aid)
  if (src)
    return src
  return options?.apiIconPath?.trim() ? getIconSrcByPath(options.apiIconPath, false, options?.highRes ?? false) : ''
}

// --- Upgrade Family Logic ---
const upgradeLowerByUpper = (() => {
  const map = new Map<number, number[]>()
  Object.entries(ACTION_UPGRADE_STEPS).forEach(([rawLower, rawUpper]) => {
    const lower = Number(rawLower)
    const upper = Number(rawUpper)
    if (lower > 0 && upper > 0) {
      if (!map.has(upper))
        map.set(upper, [])
      map.get(upper)!.push(lower)
    }
  })
  return map
})()

const upgradeFamilyCache = new Map<number, number[]>()
const upgradeDepthCache = new Map<number, number>()

function getUpgradeFamily(actionId: number) {
  const top = normalizeUpgradeActionId(actionId)
  if (top <= 0)
    return []
  if (upgradeFamilyCache.has(top))
    return upgradeFamilyCache.get(top)!
  const visited = new Set<number>()
  const stack = [top]
  while (stack.length) {
    const curr = stack.pop()!
    if (visited.has(curr))
      continue
    visited.add(curr)
    stack.push(...(upgradeLowerByUpper.get(curr) ?? []))
  }
  const res = [...visited]
  upgradeFamilyCache.set(top, res)
  return res
}

function getUpgradeDepth(actionId: number) {
  if (actionId <= 0)
    return 999
  if (upgradeDepthCache.has(actionId))
    return upgradeDepthCache.get(actionId)!
  let depth = 0
  let curr = actionId
  const visited = new Set([curr])
  while (true) {
    const next = Number(ACTION_UPGRADE_STEPS[curr]) || 0
    if (next <= 0 || visited.has(next))
      break
    depth++
    visited.add(next)
    curr = next
  }
  upgradeDepthCache.set(actionId, depth)
  return depth
}

export function resolveHighestSupportedActionInFamily(actionId: number, baseJob: number) {
  const family = getUpgradeFamily(actionId)
  let bestId = 0
  let bestLv = -1
  let bestDepth = 999
  for (const cid of family) {
    const baked = resolveBakedActionMeta(cid)
    if (!baked || (baked.isRoleAction ? !baked.jobs.includes(baseJob) : (baked.classJobTargetId > 0 && baked.classJobTargetId !== baseJob)))
      continue
    const lv = baked.classJobLevel
    const depth = getUpgradeDepth(cid)
    if (lv > bestLv || (lv === bestLv && depth < bestDepth) || (lv === bestLv && depth === bestDepth && cid === actionId)) {
      bestId = cid
      bestLv = lv
      bestDepth = depth
    }
  }
  return bestId || 0
}
