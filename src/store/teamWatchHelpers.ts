import type { JobResourceManager } from '@/modules/jobResourceTracker'
import type { TeamWatchActionMeta, TeamWatchSkillView } from '@/types/teamWatchTypes'
import { resolveJobResourceActionCost } from '@/resources/jobResourceActionCost'
import { compareSame, normalizeUpgradeActionId } from '@/utils/compareSaveAction'
import Util from '@/utils/util'

// --- store & utils helpers ---

export function toHexId(id: string | number): string {
  return String(id).toUpperCase()
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeInt(value: number, fallback: number, min = 0): number {
  if (!Number.isFinite(value))
    return fallback
  return Math.max(min, Math.trunc(value))
}

export function normalizeTrackedActionId(actionId: number): number {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return 0
  const upgradedActionId = normalizeUpgradeActionId(Math.trunc(actionId))
  return compareSame(upgradedActionId)
}

export function deepCloneWatchMap(input: Record<number, number[]>): Record<number, number[]> {
  const result: Record<number, number[]> = {}
  Object.entries(input).forEach(([key, value]) => {
    result[Number(key)] = [...value]
  })
  return result
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
  line[2] = toHexId(sourceId)
  line[3] = sourceName
  line[4] = actionId.toString(16).toUpperCase()
  line[5] = actionName
  line[6] = toHexId(sourceId)
  line[7] = sourceName
  return line
}

export function collectWatchActionIds(watchMap: Record<number, number[]>): Set<number> {
  const actionIds = new Set<number>()
  Object.values(watchMap).forEach((actions) => {
    actions.forEach((actionId) => {
      const normalizedId = Number(actionId)
      if (Number.isFinite(normalizedId) && normalizedId > 0)
        actionIds.add(normalizedId)
    })
  })
  return actionIds
}

export function buildKnownJobs(
  watchMap: Record<number, number[]>,
  defaultJobSort: number[],
): number[] {
  return Array.from(new Set([
    ...defaultJobSort,
    ...Object.keys(watchMap).map(v => Number(v)),
  ]))
}

export function buildDefaultWatchMap(
  knownJobs: number[],
  defaults: Record<number, number[]>,
  emptyActions: readonly number[],
): Record<number, number[]> {
  const result: Record<number, number[]> = {}
  knownJobs.forEach((job) => {
    result[job] = [...(defaults[job] ?? emptyActions)]
  })
  return result
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

// --- logline helpers ---

const TEAM_WATCH_RESET_EFFECT_IDS = new Set(['4000000F', '40000010'])

export interface TeamWatchActionTrigger {
  casterId: string
  actionId: number
}

export interface TriggerRuntimeByActionOptions {
  runtimeByKey: Record<string, TeamWatchRuntime>
  cooldownTracker: Record<string, Record<number, number[]>>
  actionLookup: Record<string, string>
  casterId: string
  actionId: number
  now: number
}

export function extractTriggeredActionFromLogLine(line: string[]): TeamWatchActionTrigger | null {
  const type = line[0] ?? ''
  if (type !== '21' && !(type === '22' && line[45] === '0'))
    return null

  const actionIdHex = line[4]
  const casterId = line[2]
  if (!actionIdHex || !casterId)
    return null

  const actionId = Number.parseInt(actionIdHex, 16)
  if (!Number.isFinite(actionId))
    return null

  return {
    casterId,
    actionId,
  }
}

export function isTeamWatchResetLogLine(line: string[]): boolean {
  return (line[0] ?? '') === '33' && TEAM_WATCH_RESET_EFFECT_IDS.has(line[3] ?? '')
}

export function triggerRuntimeByAction(options: TriggerRuntimeByActionOptions): boolean {
  const trackedActionId = normalizeTrackedActionId(options.actionId)
  if (trackedActionId <= 0)
    return false

  const runtimeKey = options.actionLookup[`${toHexId(options.casterId)}:${trackedActionId}`]
  if (!runtimeKey)
    return false

  return useRuntime(
    options.runtimeByKey,
    options.cooldownTracker,
    runtimeKey,
    options.now,
  )
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

export function buildSkillStateCacheKey(skill: TeamWatchSkillView): string {
  return `${skill.runtimeKey}:${skill.rawActionId}:${skill.resolvedActionId}:${skill.trackedActionId}:${skill.meta.maxCharges}:${skill.meta.recast1000ms}`
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
      const remain = clamp(nextReadyAt - now, 0, recastTotalMs)
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
    overlayPercent: clamp(overlayPercent, 0, 100),
    isCooling,
    isRecentlyUsed: now - runtime.activeAt < 250,
    hasResourceCost,
    resourceReady,
    resourceValue,
    extraText,
  }
}

export function buildTeamWatchSkillStatusText(
  memberName: string,
  skillName: string,
  state: TeamWatchSkillStateView,
): string {
  const suffixes: string[] = []

  if (state.isCharge) {
    suffixes.push(
      state.charges >= state.maxCharges
        ? `已就绪(${state.charges}层)`
        : `当前(${state.charges}层)`,
    )
  }
  else {
    suffixes.push(state.text ? `冷却：${state.text}` : '已就绪')
  }

  if (!state.resourceReady)
    suffixes.push(`资源不足(${state.resourceValue ?? 0})`)
  if (state.extraText)
    suffixes.push(`附加:${state.extraText}`)

  return `${memberName} ${skillName} ${suffixes.join(' ')}`
}
