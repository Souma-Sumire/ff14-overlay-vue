import type { DynamicValue } from '@/types/dynamicValue'
import { actionId2ClassJobLevel } from '@/resources/logic/action2ClassJobLevel'
import { resolveBakedActionMeta } from '@/resources/logic/actionMetaResolver'
import { parseDynamicValue } from '@/utils/dynamicValue'

export interface GlobalSkillDefinition {
  id: number
  recast1000ms: DynamicValue
  job: number[]
  minLevel: number
  duration: DynamicValue
  maxCharges: DynamicValue
}

export const GLOBAL_SKILL_MAX_LEVEL = 100

type RawGlobalSkillDefinition = Partial<GlobalSkillDefinition> & { id: number }

const rawGlobalSkillDefinitions: RawGlobalSkillDefinition[] = [
  { id: 30, recast1000ms: 420, duration: 10 },
  { id: 43, recast1000ms: 240, duration: 10 },
  { id: 3638, recast1000ms: 300, duration: 10 },
  { id: 16152, recast1000ms: 360, duration: 10 },
  { id: 140, recast1000ms: 180, duration: 0 },
  { id: 25862, recast1000ms: 180, duration: 15 },
  { id: 25868, recast1000ms: 120, duration: 20 },
  { id: 25874, recast1000ms: 180, duration: 15 },
  { id: 7549, recast1000ms: 90, duration: '(lv) => lv>=98 ? 15 : 10' },
  { id: 7560, recast1000ms: 90, duration: '(lv) => lv>=98 ? 15 : 10' },
  { id: 7535, recast1000ms: 60, duration: '(lv) => lv>=98 ? 15 : 10' },
  { id: 3540, recast1000ms: 90, duration: 30 },
  { id: 7385, recast1000ms: 120, duration: 5 },
  { id: 7388, recast1000ms: 90, duration: 15 },
  { id: 16471, recast1000ms: 90, duration: 15 },
  { id: 16160, recast1000ms: 90, duration: 15 },
  { id: 7433, recast1000ms: 60, duration: 10 },
  { id: 16536, recast1000ms: 120, duration: 20 },
  { id: 7405, recast1000ms: '(lv) => lv>=88 ? 90 : 120', duration: 15 },
  { id: 16889, recast1000ms: '(lv) => lv>=88 ? 90 : 120', duration: 15 },
  { id: 2887, recast1000ms: 120, duration: 10 },
  { id: 16012, recast1000ms: '(lv) => lv>=88 ? 90 : 120', duration: 15 },
  { id: 25857, recast1000ms: 120, duration: 10 },
  { id: 118, recast1000ms: 120, duration: 20 },
  { id: 25785, recast1000ms: 110, duration: 20 },
  { id: 36957, recast1000ms: 120, duration: 20 },
  { id: 24405, recast1000ms: 120, duration: 20 },
  { id: 3557, recast1000ms: 120, duration: 20 },
  { id: 7396, recast1000ms: 120, duration: 20 },
  { id: 25801, recast1000ms: 120, duration: 20 },
  { id: 34675, recast1000ms: 120, duration: 20 },
  { id: 7436, recast1000ms: 120, duration: 20 },
  { id: 7520, recast1000ms: 120, duration: 20 },
  { id: 16196, recast1000ms: 120, duration: 20 },
  { id: 16011, recast1000ms: 120, duration: 20 },
  { id: 16552, recast1000ms: 120, duration: 20 },
  { id: 7531, recast1000ms: 90, duration: 20 },
  { id: 7561, recast1000ms: '(lv) => lv>=94 ? 40 : 60' },
  { id: 7542, recast1000ms: 90, duration: 20 },
  { id: 7541, recast1000ms: 120 },
  { id: 7548, recast1000ms: 120, duration: 6 },
  { id: 7559, recast1000ms: '120', duration: 6 },
  { id: 17, recast1000ms: 120, duration: 15 },
  { id: 36920, recast1000ms: 120, duration: 15 },
  { id: 22, recast1000ms: 90, duration: 10 },
  { id: 25746, recast1000ms: 5, duration: 8 },
  { id: 7382, recast1000ms: 10, duration: 8 },
  { id: 44, recast1000ms: 120, duration: 15 },
  { id: 36923, recast1000ms: 120, duration: 15 },
  { id: 40, recast1000ms: 90, duration: 10 },
  { id: 3552, recast1000ms: 60 },
  { id: 25751, recast1000ms: 25, duration: 8 },
  { id: 16464, recast1000ms: 25, duration: 8 },
  { id: 36927, recast1000ms: 120, duration: 15 },
  { id: 3634, recast1000ms: 60, duration: 10 },
  { id: 7393, recast1000ms: 15, duration: 7 },
  { id: 25754, recast1000ms: 60, duration: 7, maxCharges: 2 },
  { id: 36935, recast1000ms: 120, duration: 15 },
  { id: 16140, recast1000ms: 90, duration: 10 },
  { id: 25758, recast1000ms: 25, duration: 8 },
  { id: 16151, recast1000ms: 60, maxCharges: '(lv) => lv>=84 ? 2 : 1' },
  { id: 3570, recast1000ms: 60, maxCharges: '(lv) => lv>=98 ? 2 : 1' },
  { id: 7432, recast1000ms: 30, maxCharges: '(lv) => lv>=98 ? 2 : 1' },
  { id: 25861, recast1000ms: 60, duration: 8 },
  { id: 16542, recast1000ms: 90 },
  { id: 3585, recast1000ms: 90 },
  { id: 16538, recast1000ms: 120, duration: 20 },
  { id: 188, recast1000ms: 30, duration: 18 },
  { id: 3583, recast1000ms: 30 },
  { id: 7434, recast1000ms: 45 },
  { id: 16545, recast1000ms: 120 },
  { id: 25867, recast1000ms: 60 },
  { id: 37014, recast1000ms: 180 },
  { id: 3614, recast1000ms: 40, maxCharges: '(lv) => lv>=78 ? (lv>=98 ? 3 : 2) : 1' },
  { id: 3613, recast1000ms: 60, duration: 10 },
  { id: 16553, recast1000ms: 60, duration: 15 },
  { id: 7439, recast1000ms: 60, duration: 10 },
  { id: 16556, recast1000ms: 30, maxCharges: '(lv) => lv>=88 ? 2 : 1' },
  { id: 16557, recast1000ms: 60 },
  { id: 16559, recast1000ms: 120 },
  { id: 25873, recast1000ms: 60 },
  { id: 24298, recast1000ms: 30, duration: 15 },
  { id: 24299, recast1000ms: 30 },
  { id: 24303, recast1000ms: 45 },
  { id: 24305, recast1000ms: 120 },
  { id: 24311, recast1000ms: 120 },
  { id: 24310, recast1000ms: 120, duration: 20 },
  { id: 24300, recast1000ms: '(lv) => lv>=88 ? 90 : 120' },
  { id: 24318, recast1000ms: 120 },
  { id: 37035, recast1000ms: 180 },
  { id: 7394, recast1000ms: 120 },
  { id: 7394, recast1000ms: 120 },
  { id: 65, recast1000ms: 90 },
  { id: 2241, recast1000ms: 120 },
  { id: 36962, recast1000ms: 15, duration: 4 },
  { id: 24404, recast1000ms: 30 },
  { id: 7408, recast1000ms: 120 },
  { id: 16015, recast1000ms: 60 },
  { id: 16014, recast1000ms: 120 },
  { id: 157, recast1000ms: 120 },
  { id: 155, recast1000ms: 10 },
  { id: 25799, recast1000ms: 60, maxCharges: '(lv) => lv>=88 ? 2 : 1' },
  { id: 34685, recast1000ms: 120 },
]

function resolveActionId(value: number | string, level: number): number {
  try {
    const resolved = Number(parseDynamicValue(value, level))
    return Number.isFinite(resolved) && resolved > 0 ? Math.trunc(resolved) : 0
  }
  catch {
    return 0
  }
}

const globalSkillDefinitions: GlobalSkillDefinition[] = rawGlobalSkillDefinitions.map((definition) => {
  const resolvedId = resolveActionId(definition.id, GLOBAL_SKILL_MAX_LEVEL)
  const normalizedId = resolvedId > 0 ? resolvedId : 0
  const resolvedMinLevel = resolveMinLevelForActionId(normalizedId, definition.minLevel)

  let jobs = uniqueJobs(definition.job)
  let recast = definition.recast1000ms
  let maxCharges = definition.maxCharges

  if (normalizedId > 0 && (jobs.length === 0 || recast === undefined || maxCharges === undefined)) {
    const baked = resolveBakedActionMeta(normalizedId)
    if (baked) {
      if (jobs.length === 0)
        jobs = baked.jobs
      if (recast === undefined)
        recast = baked.recast1000ms
      if (maxCharges === undefined && baked.maxCharges > 0)
        maxCharges = baked.maxCharges
    }
  }

  return {
    id: normalizedId,
    recast1000ms: recast ?? 0,
    duration: definition.duration ?? 0,
    minLevel: resolvedMinLevel,
    job: jobs,
    maxCharges: maxCharges ?? 0,
  }
})

const globalSkillDefinitionMap = (() => {
  const map = new Map<number, GlobalSkillDefinition>()
  globalSkillDefinitions.forEach((definition) => {
    if (!map.has(definition.id))
      map.set(definition.id, definition)
  })
  return map
})()

export interface GlobalSkillMeta {
  id: number
  recast1000ms: DynamicValue
  duration: DynamicValue
  minLevel: number
  job: number[]
  maxCharges?: DynamicValue
}

function uniqueJobs(jobs: number[] | undefined): number[] {
  if (!Array.isArray(jobs))
    return []
  return [...new Set(jobs.map(Number).filter(v => Number.isFinite(v) && v > 0).map(Math.trunc))]
}

function resolveMinLevelForActionId(actionId: number, fallback?: number): number {
  const fromMap = Number(actionId2ClassJobLevel(actionId))
  if (Number.isFinite(fromMap) && fromMap > 0)
    return Math.trunc(fromMap)
  if (Number.isFinite(fallback) && Number(fallback) > 0)
    return Math.trunc(Number(fallback))
  return 1
}

function mergeMinLevel(previous: number, current: number): number {
  return Math.max(1, Math.min(previous, current))
}

const globalSkillMetaMap = (() => {
  const map = new Map<number, GlobalSkillMeta>()
  const normalizedJobsBySkillId = new Map<number, number[]>()

  rawGlobalSkillDefinitions.forEach((definition) => {
    const normalizedId = resolveActionId(definition.id, GLOBAL_SKILL_MAX_LEVEL)
    if (normalizedId <= 0)
      return
    const normalizedJobs = uniqueJobs(definition.job)
    if (normalizedJobs.length > 0) {
      const previous = normalizedJobsBySkillId.get(normalizedId) ?? []
      normalizedJobsBySkillId.set(normalizedId, uniqueJobs([...previous, ...normalizedJobs]))
    }
  })

  rawGlobalSkillDefinitions.forEach((definition) => {
    const normalizedId = resolveActionId(definition.id, GLOBAL_SKILL_MAX_LEVEL)
    if (normalizedId <= 0)
      return
    const inheritedJobs = normalizedJobsBySkillId.get(normalizedId) ?? []

    for (let level = 1; level <= GLOBAL_SKILL_MAX_LEVEL; level += 1) {
      const actionId = resolveActionId(definition.id, level)
      if (actionId <= 0)
        continue
      const resolvedMinLevel = resolveMinLevelForActionId(actionId, definition.minLevel)

      const previous = map.get(actionId)
      if (!previous) {
        map.set(actionId, {
          id: normalizedId,
          recast1000ms: definition.recast1000ms ?? 0,
          duration: definition.duration ?? 0,
          minLevel: resolvedMinLevel,
          job: inheritedJobs,
          maxCharges: definition.maxCharges,
        })
        continue
      }

      map.set(actionId, {
        id: normalizedId,
        recast1000ms: previous.recast1000ms ?? definition.recast1000ms ?? 0,
        duration: previous.duration ?? 0,
        minLevel: mergeMinLevel(previous.minLevel, resolvedMinLevel),
        job: uniqueJobs([...previous.job, ...inheritedJobs]),
        maxCharges: previous.maxCharges ?? definition.maxCharges,
      })
    }
  })

  return map
})()

export function getGlobalSkillDefinitionById(id: number): GlobalSkillDefinition | undefined {
  if (!Number.isFinite(id) || id <= 0)
    return undefined
  const normalized = Math.trunc(id)
  const found = globalSkillDefinitionMap.get(normalized)
  return found ? { ...found, job: [...found.job] } : undefined
}

export function getGlobalSkillMetaByActionId(actionId: number): GlobalSkillMeta | undefined {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return undefined
  const normalized = Math.trunc(actionId)
  const found = globalSkillMetaMap.get(normalized)
  return found ? { ...found, job: [...found.job] } : undefined
}

export { globalSkillDefinitions }
