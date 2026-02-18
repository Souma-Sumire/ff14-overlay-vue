import type { TeamWatchActionMeta } from '@/types/teamWatchTypes'
import Util from '@/utils/util'
import { clamp, toHexId } from '@/store/teamWatchStoreHelpers'

export interface TeamWatchRuntime {
  key: string
  ownerId: string
  ownerJob: number
  trackedActionId: number
  maxCharges: number
  chargesNow: number
  recast1000ms: number
  recastEndAt: number | null
  chargeReadyAt: number[]
  activeAt: number
}

export function ensureCooldownHistory(
  cooldownTracker: Record<string, Record<number, number[]>>,
  ownerId: string,
  trackedActionId: number,
): number[] {
  const normalizedOwnerId = toHexId(ownerId)
  if (!cooldownTracker[normalizedOwnerId])
    cooldownTracker[normalizedOwnerId] = {}
  if (!cooldownTracker[normalizedOwnerId]![trackedActionId])
    cooldownTracker[normalizedOwnerId]![trackedActionId] = []
  return cooldownTracker[normalizedOwnerId]![trackedActionId]!
}

export function ensureRuntime(
  runtimeByKey: Record<string, TeamWatchRuntime>,
  runtimeKey: string,
  ownerId: string,
  ownerJob: number,
  trackedActionId: number,
  meta: TeamWatchActionMeta,
): TeamWatchRuntime {
  const existing = runtimeByKey[runtimeKey]
  if (!existing) {
    runtimeByKey[runtimeKey] = {
      key: runtimeKey,
      ownerId: toHexId(ownerId),
      ownerJob: Util.baseJobEnumConverted(ownerJob),
      trackedActionId,
      maxCharges: Math.max(0, meta.maxCharges),
      chargesNow: Math.max(0, meta.maxCharges),
      recast1000ms: Math.max(0, meta.recast1000ms),
      recastEndAt: null,
      chargeReadyAt: [],
      activeAt: 0,
    }
    return runtimeByKey[runtimeKey]
  }

  existing.ownerJob = Util.baseJobEnumConverted(ownerJob)
  existing.maxCharges = Math.max(0, meta.maxCharges)
  existing.recast1000ms = Math.max(0, meta.recast1000ms)
  if (existing.maxCharges <= 0) {
    existing.chargeReadyAt = []
    existing.chargesNow = 0
  }
  else {
    existing.chargesNow = clamp(
      existing.maxCharges - existing.chargeReadyAt.length,
      0,
      existing.maxCharges,
    )
  }
  return existing
}

export function appendSkillHistory(
  cooldownTracker: Record<string, Record<number, number[]>>,
  runtime: TeamWatchRuntime,
  timestamp: number,
): void {
  if (runtime.trackedActionId <= 0)
    return
  const history = ensureCooldownHistory(cooldownTracker, runtime.ownerId, runtime.trackedActionId)
  history.push(timestamp)
  const cap = Math.max(1, runtime.maxCharges || 1)
  if (history.length > cap)
    history.splice(0, history.length - cap)
}

export function useRuntime(
  runtimeByKey: Record<string, TeamWatchRuntime>,
  cooldownTracker: Record<string, Record<number, number[]>>,
  runtimeKey: string,
  now: number,
): boolean {
  const runtime = runtimeByKey[runtimeKey]
  if (!runtime || runtime.trackedActionId <= 0 || runtime.recast1000ms <= 0)
    return false

  runtime.activeAt = now

  if (runtime.maxCharges > 0) {
    if (runtime.chargesNow <= 0)
      return false
    runtime.chargesNow -= 1
    runtime.chargeReadyAt.push(now + runtime.recast1000ms * 1000)
    runtime.chargeReadyAt.sort((a, b) => a - b)
    appendSkillHistory(cooldownTracker, runtime, now)
    return true
  }

  runtime.recastEndAt = now + runtime.recast1000ms * 1000
  appendSkillHistory(cooldownTracker, runtime, now)
  return true
}

export function clearRuntimeCooldownStates(
  runtimeByKey: Record<string, TeamWatchRuntime>,
  cooldownTracker: Record<string, Record<number, number[]>>,
): void {
  Object.values(runtimeByKey).forEach((runtime) => {
    runtime.recastEndAt = null
    runtime.chargeReadyAt = []
    runtime.chargesNow = runtime.maxCharges > 0 ? runtime.maxCharges : 0
    runtime.activeAt = 0
  })

  for (const ownerId of Object.keys(cooldownTracker)) {
    const ownerMap = cooldownTracker[ownerId]
    if (!ownerMap)
      continue
    for (const actionId of Object.keys(ownerMap)) {
      const history = ownerMap[Number(actionId)]
      if (history)
        history.length = 0
    }
  }
}

export function updateRuntimeCollection(
  runtimeByKey: Record<string, TeamWatchRuntime>,
  cooldownTracker: Record<string, Record<number, number[]>>,
  now: number,
): void {
  Object.values(runtimeByKey).forEach((runtime) => {
    if (runtime.maxCharges > 0) {
      if (runtime.chargeReadyAt.length > 0) {
        runtime.chargeReadyAt = runtime.chargeReadyAt.filter(readyAt => readyAt > now)
        runtime.chargesNow = clamp(
          runtime.maxCharges - runtime.chargeReadyAt.length,
          0,
          runtime.maxCharges,
        )
      }
      return
    }

    const history = cooldownTracker[runtime.ownerId]?.[runtime.trackedActionId]
    if (history && history.length > 0 && runtime.recast1000ms > 0) {
      const lastCastAt = history[history.length - 1] ?? 0
      if (Number.isFinite(lastCastAt) && lastCastAt > 0) {
        const syncedEndAt = lastCastAt + runtime.recast1000ms * 1000
        if (runtime.recastEndAt === null || syncedEndAt < runtime.recastEndAt)
          runtime.recastEndAt = syncedEndAt
      }
    }

    if (runtime.recastEndAt && runtime.recastEndAt <= now)
      runtime.recastEndAt = null
  })
}
