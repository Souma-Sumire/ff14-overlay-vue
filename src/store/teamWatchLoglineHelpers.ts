import type { TeamWatchRuntime } from '@/store/teamWatchRuntimeHelpers'
import { useRuntime } from '@/store/teamWatchRuntimeHelpers'
import { normalizeTrackedActionId, toHexId } from '@/store/teamWatchStoreHelpers'

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
