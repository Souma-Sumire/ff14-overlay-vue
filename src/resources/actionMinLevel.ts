import { useStorage } from '@vueuse/core'
import action2ClassJobLevelMapRaw from '@/resources/action2ClassJobLevel.json'
import { ACTION_UPGRADE_LEVEL_OVERRIDES, ACTION_UPGRADE_STEPS } from '@/utils/compareSaveAction'

const ROLE_ACTION_MIN_LEVEL = 1
const ROLE_ACTION_CACHE_VERSION = '20260218-v1'
const ROLE_ACTION_CACHE_STORAGE_KEY = 'action-role-action-id-cache'
const ROLE_ACTION_CACHE_VERSION_STORAGE_KEY = 'action-role-action-id-cache-version'

const roleActionCacheVersion = useStorage<string>(ROLE_ACTION_CACHE_VERSION_STORAGE_KEY, '')
const roleActionIdStorage = useStorage<Record<string, 1>>(ROLE_ACTION_CACHE_STORAGE_KEY, {})

if (roleActionCacheVersion.value !== ROLE_ACTION_CACHE_VERSION) {
  roleActionIdStorage.value = {}
  roleActionCacheVersion.value = ROLE_ACTION_CACHE_VERSION
}

const knownRoleActionIds = new Set<number>(
  Object.keys(roleActionIdStorage.value)
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && v > 0)
    .map(v => Math.trunc(v)),
)

const action2ClassJobLevelMap = new Map<string, string>(
  Object.entries(action2ClassJobLevelMapRaw as Record<string, string>),
)

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

const upgradeFamilyByActionCache = new Map<number, number[]>()

function persistKnownRoleActionIds() {
  roleActionIdStorage.value = Object.fromEntries(
    [...knownRoleActionIds]
      .sort((a, b) => a - b)
      .map(id => [String(id), 1 as const]),
  )
}

function normalizeMinLevelValue(value: unknown, fallback = 1) {
  const fallbackLevel = Number.isFinite(Number(fallback)) ? Math.max(1, Math.trunc(Number(fallback))) : 1
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return fallbackLevel
  return Math.max(1, Math.trunc(numeric))
}

function resolveKnownMinLevelByActionId(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return undefined
  const id = Math.trunc(actionId)

  const overridden = Number(ACTION_UPGRADE_LEVEL_OVERRIDES[id])
  if (Number.isFinite(overridden) && overridden > 0)
    return normalizeMinLevelValue(overridden, 1)

  if (knownRoleActionIds.has(id))
    return ROLE_ACTION_MIN_LEVEL

  const fromMap = Number(action2ClassJobLevelMap.get(String(id)))
  if (Number.isFinite(fromMap) && fromMap > 0)
    return normalizeMinLevelValue(fromMap, 1)

  return undefined
}

function getUpgradeFamilyActionIds(actionId: number) {
  const id = Math.trunc(actionId)
  const cached = upgradeFamilyByActionCache.get(id)
  if (cached)
    return cached

  const visited = new Set<number>()
  const stack: number[] = [id]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (visited.has(current))
      continue
    visited.add(current)

    const upper = ACTION_UPGRADE_STEPS[current]
    if (typeof upper === 'number' && Number.isFinite(upper) && upper > 0)
      stack.push(Math.trunc(upper))

    const lowers = upgradeLowerByUpper.get(current) ?? []
    lowers.forEach((lower) => {
      if (!visited.has(lower))
        stack.push(lower)
    })
  }

  const family = [...visited]
  family.forEach(memberId => upgradeFamilyByActionCache.set(memberId, family))
  return family
}

export function markRoleActionId(actionId: number, isRoleAction: unknown) {
  const id = Number(actionId)
  if (!Number.isFinite(id) || id <= 0)
    return
  if (!(Number(isRoleAction) > 0))
    return
  const normalized = Math.trunc(id)
  if (knownRoleActionIds.has(normalized))
    return
  knownRoleActionIds.add(normalized)
  persistKnownRoleActionIds()
}

export function isRoleActionId(actionId: number) {
  const id = Number(actionId)
  if (!Number.isFinite(id) || id <= 0)
    return false
  return knownRoleActionIds.has(Math.trunc(id))
}

export function resolveActionMinLevel(
  classJobLevel: unknown,
  options?: {
    actionId?: number
    isRoleAction?: unknown
    fallback?: number
  },
) {
  const fallback = normalizeMinLevelValue(options?.fallback ?? 1, 1)
  const actionId = Number(options?.actionId ?? 0)
  const normalizedActionId = Number.isFinite(actionId) && actionId > 0 ? Math.trunc(actionId) : 0

  if (Number(options?.isRoleAction ?? 0) > 0) {
    markRoleActionId(normalizedActionId, 1)
    return ROLE_ACTION_MIN_LEVEL
  }
  if (isRoleActionId(normalizedActionId))
    return ROLE_ACTION_MIN_LEVEL

  const baseLevel = normalizeMinLevelValue(classJobLevel, fallback)
  if (normalizedActionId <= 0)
    return baseLevel

  const family = getUpgradeFamilyActionIds(normalizedActionId)
  let minLevel = baseLevel
  family.forEach((memberId) => {
    const knownLevel = resolveKnownMinLevelByActionId(memberId)
    if (knownLevel !== undefined)
      minLevel = Math.min(minLevel, knownLevel)
  })
  return minLevel
}
