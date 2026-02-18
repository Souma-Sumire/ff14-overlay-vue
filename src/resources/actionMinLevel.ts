import { useStorage } from '@vueuse/core'

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
  if (Number(options?.isRoleAction ?? 0) > 0) {
    markRoleActionId(actionId, 1)
    return ROLE_ACTION_MIN_LEVEL
  }
  if (isRoleActionId(actionId))
    return ROLE_ACTION_MIN_LEVEL
  return normalizeMinLevelValue(classJobLevel, fallback)
}

