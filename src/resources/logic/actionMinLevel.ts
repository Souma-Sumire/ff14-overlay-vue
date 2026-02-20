import { useStorage } from '@vueuse/core'
import { ROLE_ACTION_CACHE_VERSION } from '@/resources/cacheVersion'
import { BAKED_ACTION_META_LITE_BY_ID } from '@/resources/generated/bakedActionMetaLite'
import { BAKED_UPGRADE_CHAIN_MIN_LEVEL_BY_ACTION_ID } from '@/resources/generated/bakedUpgradeChainMinLevel'

const ROLE_ACTION_MIN_LEVEL = 1
const ROLE_ACTION_CACHE_STORAGE_KEY = 'action-role-action-id-cache'
const ROLE_ACTION_CACHE_VERSION_STORAGE_KEY = 'action-role-action-id-cache-version'

const roleActionCacheVersion = useStorage<string>(ROLE_ACTION_CACHE_VERSION_STORAGE_KEY, '')
const roleActionIdStorage = useStorage<Record<string, 1>>(ROLE_ACTION_CACHE_STORAGE_KEY, {})

if (roleActionCacheVersion.value !== ROLE_ACTION_CACHE_VERSION) {
  roleActionIdStorage.value = {}
  roleActionCacheVersion.value = ROLE_ACTION_CACHE_VERSION
}

function collectBakedRoleActionIds() {
  return Object.entries(BAKED_ACTION_META_LITE_BY_ID)
    .filter(([_, meta]) => (Number(meta.isRoleAction) || 0) > 0)
    .map(([rawId]) => Math.trunc(Number(rawId)) || 0)
    .filter(id => id > 0)
}

const knownRoleActionIds = new Set<number>([
  ...collectBakedRoleActionIds(),
  ...Object.keys(roleActionIdStorage.value).map(Number).filter(v => Number.isFinite(v) && v > 0).map(Math.trunc),
])

function persistKnownRoleActionIds() {
  roleActionIdStorage.value = Object.fromEntries(
    [...knownRoleActionIds]
      .sort((a, b) => a - b)
      .map(id => [String(id), 1 as const]),
  )
}

function resolveKnownMinLevelByActionId(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return undefined
  const id = actionId

  if (knownRoleActionIds.has(id))
    return ROLE_ACTION_MIN_LEVEL

  const fromMap = Number(BAKED_ACTION_META_LITE_BY_ID[id]?.classJobLevel ?? 0)
  if (Number.isFinite(fromMap) && fromMap > 0)
    return fromMap

  return undefined
}

export function markRoleActionId(actionId: number, isRoleAction: unknown) {
  const id = Number(actionId) || 0
  if (id <= 0 || (Number(isRoleAction) || 0) <= 0)
    return
  if (!knownRoleActionIds.has(id)) {
    knownRoleActionIds.add(id)
    persistKnownRoleActionIds()
  }
}

export function isRoleActionId(actionId: number) {
  const id = Number(actionId)
  if (!Number.isFinite(id) || id <= 0)
    return false
  return knownRoleActionIds.has(id)
}

export function resolveActionMinLevel(
  classJobLevel: unknown,
  options?: {
    actionId?: number
    isRoleAction?: unknown
    fallback?: number
  },
) {
  const fallbackValue = Number(options?.fallback) || 1
  const actionId = Number(options?.actionId) || 0

  if ((Number(options?.isRoleAction) || 0) > 0) {
    markRoleActionId(actionId, 1)
    return ROLE_ACTION_MIN_LEVEL
  }
  if (isRoleActionId(actionId))
    return ROLE_ACTION_MIN_LEVEL

  const baseLevel = Number(classJobLevel) || fallbackValue
  if (actionId <= 0)
    return baseLevel

  const bakedFamilyMinLevel = Number(BAKED_UPGRADE_CHAIN_MIN_LEVEL_BY_ACTION_ID[actionId])
  if (Number.isFinite(bakedFamilyMinLevel) && bakedFamilyMinLevel > 0)
    return Math.min(baseLevel, Math.max(1, Math.trunc(bakedFamilyMinLevel)))

  const knownLevel = resolveKnownMinLevelByActionId(actionId)
  if (knownLevel !== undefined)
    return Math.min(baseLevel, knownLevel)
  return baseLevel
}
