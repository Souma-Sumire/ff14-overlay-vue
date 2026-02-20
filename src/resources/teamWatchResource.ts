import type { TeamWatchActionMetaRaw, TeamWatchStorageData } from '@/types/teamWatchTypes'
import { resolveActionDisplayName, resolveActionMinLevel, resolveHighestSupportedActionInFamily, uniqueInts } from '@/resources/logic/actionMetaResolver'
import { idToSrc } from '@/utils/dynamicValue'
import Util from '@/utils/util'
import { DEFAULT_JOB_SORT_ORDER } from './jobSortOrder'

export const TEAM_WATCH_STORAGE_NAMESPACE = 'TeamWatch5'
const TEAM_WATCH_STORAGE_NAMESPACE_LEGACY = 'TeamWatch4'
export const TEAM_WATCH_SLOT_COUNT = 5
export const TEAM_WATCH_EMPTY_ACTIONS = [0, 0, 0, 0, 0] as const

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

export function cloneTeamWatchActionMetaMap(input: Record<number, TeamWatchActionMetaRaw>) {
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [Number(k) || 0, { ...v }]),
  )
}

export function buildInheritedBaseJobActions(baseJob: number, sourceActions: unknown): number[] {
  const normalize = (input: any) => (Array.isArray(input) ? input : [0]).map(v => Number(v) || 0)
  const bj = Number(baseJob) || 0
  if (bj <= 0 || Util.baseJobEnumConverted(bj) === bj)
    return normalize(sourceActions)
  return normalize(sourceActions).map(aid => (aid > 0 ? resolveHighestSupportedActionInFamily(aid, bj) : 0))
}

export function normalizeTeamWatchActionMetaRaw(aid: number, value: any): TeamWatchActionMetaRaw {
  const raw = value || {}
  const id = Number(raw.id) || aid || 0
  return {
    id,
    name: String(raw.name || resolveActionDisplayName(id, id)).trim(),
    iconSrc: String(raw.iconSrc || idToSrc(id)).trim(),
    actionCategory: Number(raw.actionCategory) || 0,
    recast1000ms: raw.recast1000ms ?? 0,
    duration: raw.duration ?? 0,
    maxCharges: raw.maxCharges ?? 1,
    classJobLevel: resolveActionMinLevel(raw.classJobLevel ?? 1, { actionId: id, fallback: 1 }),
  }
}

function normalizeWatchJobs(value: any): Record<number, number[]> {
  const extra = value ? Object.keys(value).map(Number) : []
  const jobs = uniqueInts([...DEFAULT_JOB_SORT_ORDER, ...extra])
  const base: any = {}
  jobs.forEach((j) => {
    base[j] = [...(TEAM_WATCH_WATCH_ACTIONS_DEFAULT[j] ?? TEAM_WATCH_EMPTY_ACTIONS)]
  })
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([j, acts]) => {
      const jn = Number(j)
      if (jn > 0)
        base[jn] = (Array.isArray(acts) ? acts : []).map(v => Number(v) || 0)
    })
  }
  return base
}

function normalizeSortRule(value: any): number[] {
  const norm = uniqueInts(Array.isArray(value) ? value : [...DEFAULT_JOB_SORT_ORDER])
  const all = uniqueInts([...DEFAULT_JOB_SORT_ORDER, ...norm])
  return [...new Set([...norm, ...all])]
}

function normalizeActionMeta(value: any): Record<number, TeamWatchActionMetaRaw> {
  const res: any = {}
  if (value) {
    Object.entries(value).forEach(([id, m]) => {
      const n = Number(id)
      if (n > 0)
        res[n] = normalizeTeamWatchActionMetaRaw(n, m)
    })
  }
  return res
}

function buildData(input?: any): TeamWatchStorageData {
  return {
    watchJobsActionsIDUser: normalizeWatchJobs(input?.watchJobsActionsIDUser),
    sortRuleUser: normalizeSortRule(input?.sortRuleUser),
    actionMetaUser: normalizeActionMeta(input?.actionMetaUser),
  }
}

export function loadTeamWatchStorageData(): TeamWatchStorageData {
  const legacy = localStorage.getItem(TEAM_WATCH_STORAGE_NAMESPACE_LEGACY)
  if (legacy) {
    try {
      const data = buildData(JSON.parse(legacy))
      localStorage.setItem(TEAM_WATCH_STORAGE_NAMESPACE, JSON.stringify(data))
      localStorage.removeItem(TEAM_WATCH_STORAGE_NAMESPACE_LEGACY)
      return data
    }
    catch { /* ignore */ }
  }
  try {
    const current = localStorage.getItem(TEAM_WATCH_STORAGE_NAMESPACE)
    if (current)
      return buildData(JSON.parse(current))
  }
  catch { /* ignore */ }
  return buildData()
}

export function saveTeamWatchStorageData(data: TeamWatchStorageData) {
  let current: any = {}
  try {
    current = JSON.parse(localStorage.getItem(TEAM_WATCH_STORAGE_NAMESPACE) || '{}')
  }
  catch { /* ignore */ }
  localStorage.setItem(TEAM_WATCH_STORAGE_NAMESPACE, JSON.stringify({
    ...current,
    watchJobsActionsIDUser: normalizeWatchJobs(data.watchJobsActionsIDUser),
    sortRuleUser: normalizeSortRule(data.sortRuleUser),
    actionMetaUser: normalizeActionMeta(data.actionMetaUser),
  }))
}
