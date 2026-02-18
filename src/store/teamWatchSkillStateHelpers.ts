import type { JobResourceManager } from '@/modules/jobResourceTracker'
import type { TeamWatchRuntime } from '@/store/teamWatchRuntimeHelpers'
import type { TeamWatchSkillView } from '@/types/teamWatchTypes'
import { resolveJobResourceActionCost } from '@/resources/jobResourceActionCost'
import { clamp } from '@/store/teamWatchStoreHelpers'

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
