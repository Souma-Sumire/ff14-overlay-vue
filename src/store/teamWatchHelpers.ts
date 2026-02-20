import type { JobResourceManager } from '@/modules/jobResourceTracker'
import type { TeamWatchActionMeta, TeamWatchSkillView } from '@/types/teamWatchTypes'
import { resolveJobResourceActionCost } from '@/resources/jobResourceActionCost'
import { compareSame, normalizeUpgradeActionId } from '@/utils/compareSaveAction'
import Util from '@/utils/util'

// --- store & utils helpers ---

export function resolveTrackedActionId(actionId: number): number {
  if (actionId <= 0)
    return 0
  const upgradedActionId = normalizeUpgradeActionId(actionId)
  return compareSame(upgradedActionId)
}

export function encodeBase64Payload(text: string): string {
  try {
    const bytes = new TextEncoder().encode(text)
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return window.btoa(binary)
  }
  catch {
    return window.btoa(unescape(encodeURIComponent(text)))
  }
}

export function decodeBase64Payload(base64: string): string {
  const normalized = base64
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded = padding > 0 ? normalized.padEnd(normalized.length + (4 - padding), '=') : normalized
  const binary = window.atob(padded)
  try {
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }
  catch {
    try {
      return decodeURIComponent(escape(binary))
    }
    catch {
      return binary
    }
  }
}

export function buildSimulatedAbilityLine(
  timestampMs: number,
  sourceId: string,
  sourceName: string,
  actionId: number,
  actionName: string,
): string[] {
  const line: string[] = []
  line[0] = '21'
  line[1] = new Date(timestampMs).toISOString()
  line[2] = String(sourceId).toUpperCase()
  line[3] = sourceName
  line[4] = actionId.toString(16).toUpperCase()
  line[5] = actionName
  line[6] = String(sourceId).toUpperCase()
  line[7] = sourceName
  return line
}

// --- runtime helpers ---

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
      ownerId: String(ownerId).toUpperCase(),
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
    existing.chargesNow = Math.min(
      existing.maxCharges,
      Math.max(0, existing.maxCharges - existing.chargeReadyAt.length),
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
  cooldownTracker[runtime.ownerId] ??= {}
  cooldownTracker[runtime.ownerId]![runtime.trackedActionId] ??= []
  const history = cooldownTracker[runtime.ownerId]![runtime.trackedActionId]!
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

  Object.values(cooldownTracker).forEach((ownerMap) => {
    if (!ownerMap)
      return
    Object.values(ownerMap).forEach((history) => {
      if (history)
        history.length = 0
    })
  })
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
        runtime.chargesNow = Math.min(
          runtime.maxCharges,
          Math.max(0, runtime.maxCharges - runtime.chargeReadyAt.length),
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

// --- skill state helpers ---

export interface TeamWatchSkillStateView {
  text: string
  charges: number
  maxCharges: number
  isCharge: boolean
  overlayPercent: number
  isCooling: boolean
  isRecentlyUsed: boolean
  hasResourceCost: boolean
  resourceReady: boolean
  resourceValue?: number
  extraText: string
}

export interface TeamWatchSkillStateContext {
  skill: TeamWatchSkillView
  runtime: TeamWatchRuntime | undefined
  now: number
  cooldownTracker: Record<string, Record<number, number[]>>
  resourceManager: JobResourceManager
}

export function resolveTeamWatchSkillState(context: TeamWatchSkillStateContext): TeamWatchSkillStateView {
  const { skill, runtime, now, cooldownTracker, resourceManager } = context
  const recastTotalMs = Math.max(1, skill.meta.recast1000ms * 1000)
  const isCharge = skill.meta.maxCharges > 0

  let overlayPercent = 0
  let text = ''
  let charges = skill.meta.maxCharges
  let isCooling = false
  let hasResourceCost = false
  let resourceReady = true
  let resourceValue: number | undefined
  let extraText = ''

  if (!runtime) {
    return {
      text,
      charges,
      maxCharges: skill.meta.maxCharges,
      isCharge,
      overlayPercent,
      isCooling,
      isRecentlyUsed: false,
      hasResourceCost,
      resourceReady,
      resourceValue,
      extraText,
    }
  }

  if (isCharge) {
    charges = runtime.chargesNow
    if (runtime.chargeReadyAt.length > 0) {
      const nextReadyAt = runtime.chargeReadyAt[0]!
      const remain = Math.min(recastTotalMs, Math.max(0, nextReadyAt - now))
      overlayPercent = (remain / recastTotalMs) * 100
      isCooling = true
    }
  }
  else if (runtime.recastEndAt) {
    const remain = Math.max(0, runtime.recastEndAt - now)
    text = remain > 0
      ? String(Math.max(0, Math.round(remain / 1000)))
      : ''
    overlayPercent = (remain / recastTotalMs) * 100
    isCooling = remain > 0
  }

  const resourceCost = resolveJobResourceActionCost(
    skill.rawActionId,
    skill.resolvedActionId,
    skill.trackedActionId,
  )

  if (resourceCost !== undefined) {
    hasResourceCost = true
    resourceValue = resourceManager.getResource(runtime.ownerJob, runtime.ownerId)
    resourceReady = resourceManager.isResourceReady(
      runtime.ownerJob,
      runtime.ownerId,
      skill.resolvedActionId,
      resourceCost,
    )
  }
  extraText = resourceManager.getExtraText(
    runtime.ownerJob,
    runtime.ownerId,
    skill.resolvedActionId,
    now,
    cooldownTracker[runtime.ownerId] ?? {},
  )

  return {
    text,
    charges,
    maxCharges: skill.meta.maxCharges,
    isCharge,
    overlayPercent: Math.min(100, Math.max(0, overlayPercent)),
    isCooling,
    isRecentlyUsed: now - runtime.activeAt < 250,
    hasResourceCost,
    resourceReady,
    resourceValue,
    extraText,
  }
}
