import type { Party } from 'cactbot/types/event'
import type { TeamWatchRuntime } from '@/store/teamWatchRuntimeHelpers'
import type { TeamWatchSkillStateView } from '@/store/teamWatchSkillStateHelpers'
import type { TeamWatchActionMeta, TeamWatchActionMetaRaw, TeamWatchMemberView, TeamWatchSkillView, TeamWatchStorageData } from '@/types/teamWatchTypes'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { JobResourceManager } from '@/modules/jobResourceTracker'
import { DEFAULT_JOB_SORT_ORDER } from '@/resources/jobSortOrder'
import { resolveActionDisplayName, resolveActionIconSrc, resolveApiActionMeta, shouldFetchResolvedActionMeta } from '@/resources/logic/actionMetaResolver'
import { buildInheritedBaseJobActions, buildTeamWatchFallbackMeta, cloneTeamWatchActionMetaMap, hasBakedTeamWatchMeta, loadTeamWatchStorageData, normalizeTeamWatchActionMetaRaw, resolveTeamWatchDynamicValue, saveTeamWatchStorageData, TEAM_WATCH_EMPTY_ACTIONS, TEAM_WATCH_WATCH_ACTIONS_DEFAULT } from '@/resources/teamWatchResource'
import { extractTriggeredActionFromLogLine, isTeamWatchResetLogLine, triggerRuntimeByAction } from '@/store/teamWatchLoglineHelpers'
import { clearRuntimeCooldownStates, ensureCooldownHistory, ensureRuntime, updateRuntimeCollection } from '@/store/teamWatchRuntimeHelpers'
import { buildSkillStateCacheKey, buildTeamWatchSkillStatusText, resolveTeamWatchSkillState } from '@/store/teamWatchSkillStateHelpers'
import { buildDefaultWatchMap, buildKnownJobs, buildSimulatedAbilityLine, collectWatchActionIds, decodeBase64Payload, deepCloneWatchMap, encodeBase64Payload, normalizeInt, normalizeTrackedActionId, toHexId } from '@/store/teamWatchStoreHelpers'
import { resolveUpgradeActionIdForLevel } from '@/utils/compareSaveAction'
import Util from '@/utils/util'
import { parseAction } from '@/utils/xivapi'

const TEAM_WATCH_ACTION_COLUMNS = [
  'ID',
  'Name',
  'Icon',
  'ActionCategoryTargetID',
  'Recast100ms',
  'MaxCharges',
  'ClassJobLevel',
  'IsRoleAction',
] as (keyof XivApiJson)[]

const teamWatchFakeParty: Party[] = [
  { id: '10000001', name: 'Faker1', worldId: 0, job: 19, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000002', name: 'Faker2', worldId: 0, job: 32, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000003', name: 'Faker3', worldId: 0, job: 35, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000004', name: 'Faker4', worldId: 0, job: 34, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000005', name: 'Faker5', worldId: 0, job: 42, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000006', name: 'Faker6', worldId: 0, job: 41, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000007', name: 'Faker7', worldId: 0, job: 28, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000008', name: 'Faker8', worldId: 0, job: 33, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
]

interface TeamWatchSaveSettingsInput {
  sortRuleUser: number[]
  watchJobsActionsIDUser: Record<number, number[]>
  actionMetaUser?: Record<number, TeamWatchActionMetaRaw>
}

const useTeamWatchStore = defineStore('teamWatch', () => {
  const storage = loadTeamWatchStorageData()

  const playerId = ref('')
  const party = ref<Party[]>([])
  const fakeMode = ref(false)
  const nowTs = ref(Date.now())
  const partyCount = computed(() => party.value.length)

  const sortRuleUser = ref<number[]>([...storage.sortRuleUser])
  const watchJobsActionsIDUser = ref<Record<number, number[]>>(
    deepCloneWatchMap(storage.watchJobsActionsIDUser),
  )
  const actionMetaUser = ref<Record<number, TeamWatchActionMetaRaw>>(
    cloneTeamWatchActionMetaMap(storage.actionMetaUser),
  )

  const runtimeByKey = reactive<Record<string, TeamWatchRuntime>>({})
  const actionLookup = reactive<Record<string, string>>({})
  const members = ref<TeamWatchMemberView[]>([])
  const cooldownTracker = reactive<Record<string, Record<number, number[]>>>({})
  const resourceManager = new JobResourceManager()

  const pendingMetaRequest = new Map<number, Promise<TeamWatchActionMetaRaw>>()
  const autoFetchMetaRequested = new Set<number>()
  let rebuildTimer: number | undefined
  let skillStateCacheTs = 0
  const skillStateCache = new Map<string, TeamWatchSkillStateView>()

  function getActionMetaRaw(actionId: number, autoFetch = true) {
    if (actionId <= 0)
      return normalizeTeamWatchActionMetaRaw(0, buildTeamWatchFallbackMeta(0))
    const raw = normalizeTeamWatchActionMetaRaw(
      actionId,
      actionMetaUser.value[actionId] ?? buildTeamWatchFallbackMeta(actionId),
    )
    if (autoFetch)
      triggerAutoFetchActionMeta(actionId)
    return raw
  }

  function triggerAutoFetchActionMeta(actionId: number) {
    if (actionId <= 0)
      return
    const existing = actionMetaUser.value[actionId]
    const shouldFetch = shouldFetchResolvedActionMeta(
      {
        actionCategoryTargetId: existing
          ? Number(existing.actionCategory ?? 0)
          : (hasBakedTeamWatchMeta(actionId) ? 1 : 0),
      },
      { requireActionCategory: true },
    )
    if (!shouldFetch)
      return
    if (autoFetchMetaRequested.has(actionId))
      return

    autoFetchMetaRequested.add(actionId)
    void fetchActionMetaDraft(actionId, true)
      .finally(() => {
        autoFetchMetaRequested.delete(actionId)
      })
  }

  function resolveActionMeta(actionId: number, level: number, rawOverride?: TeamWatchActionMetaRaw) {
    const raw = rawOverride ? normalizeTeamWatchActionMetaRaw(actionId, rawOverride) : getActionMetaRaw(actionId, false)
    const configuredActionId = normalizeInt(Number(raw.id), actionId, 0)
    const resolvedActionId = normalizeInt(
      resolveUpgradeActionIdForLevel(configuredActionId, level),
      configuredActionId,
      0,
    )

    const fallback = buildTeamWatchFallbackMeta(resolvedActionId > 0 ? resolvedActionId : actionId)
    const name = raw.name.trim()
      || resolveActionDisplayName(resolvedActionId > 0 ? resolvedActionId : actionId, actionId)
      || fallback.name
    const iconSrc = resolveActionIconSrc(resolvedActionId > 0 ? resolvedActionId : actionId)
      || raw.iconSrc.trim()
      || fallback.iconSrc

    return {
      id: resolvedActionId,
      name,
      iconSrc,
      actionCategory: normalizeInt(Number(raw.actionCategory), 0, 0),
      recast1000ms: normalizeInt(resolveTeamWatchDynamicValue(raw.recast1000ms, level, 0), 0, 0),
      duration: normalizeInt(resolveTeamWatchDynamicValue(raw.duration, level, 0), 0, 0),
      maxCharges: normalizeInt(resolveTeamWatchDynamicValue(raw.maxCharges, level, 0), 0, 0),
      classJobLevel: normalizeInt(resolveTeamWatchDynamicValue(raw.classJobLevel, level, 1), 1, 1),
    } satisfies TeamWatchActionMeta
  }

  async function fetchActionMetaDraft(actionId: number, force = false): Promise<TeamWatchActionMetaRaw> {
    if (actionId <= 0)
      return normalizeTeamWatchActionMetaRaw(0, buildTeamWatchFallbackMeta(0))

    if (!force && actionMetaUser.value[actionId])
      return getActionMetaRaw(actionId)

    const pending = pendingMetaRequest.get(actionId)
    if (pending)
      return pending

    const task = (async () => {
      const base = force
        ? normalizeTeamWatchActionMetaRaw(actionId, buildTeamWatchFallbackMeta(actionId))
        : getActionMetaRaw(actionId, false)
      try {
        const response = await parseAction('action', actionId, TEAM_WATCH_ACTION_COLUMNS)
        const resolvedApi = resolveApiActionMeta(actionId, response as Record<string, unknown>)
        const iconPath = typeof response.Icon === 'string' ? response.Icon : undefined
        const iconSrc = resolveActionIconSrc(actionId, { apiIconPath: iconPath, highRes: true }) || base.iconSrc

        const apiMeta = normalizeTeamWatchActionMetaRaw(actionId, {
          id: actionId,
          name: resolveActionDisplayName(actionId, actionId, resolvedApi.name) || base.name,
          iconSrc,
          actionCategory: resolvedApi.actionCategoryTargetId,
          recast1000ms: resolvedApi.recast1000ms,
          duration: base.duration,
          maxCharges: resolvedApi.maxCharges,
          classJobLevel: resolvedApi.classJobLevel,
        } satisfies TeamWatchActionMetaRaw)

        const merged = normalizeTeamWatchActionMetaRaw(actionId, apiMeta)
        // Cache API result to local state + localStorage, but never overwrite manual config.
        const existing = actionMetaUser.value[actionId]
        if (!existing)
          saveActionMetaRaw(actionId, merged)
        else if (Number(existing.actionCategory ?? 0) <= 0 && Number(merged.actionCategory ?? 0) > 0)
          saveActionMetaRaw(actionId, { ...existing, actionCategory: merged.actionCategory })
        return merged
      }
      catch (error) {
        console.warn('[teamWatch] action meta fetch failed:', actionId, error)
        const merged = normalizeTeamWatchActionMetaRaw(actionId, base)
        if (!actionMetaUser.value[actionId])
          saveActionMetaRaw(actionId, merged)
        return merged
      }
    })()

    pendingMetaRequest.set(actionId, task)
    return task.finally(() => pendingMetaRequest.delete(actionId))
  }

  function getSortedParty() {
    return [...(fakeMode.value ? teamWatchFakeParty : party.value)]
      .sort((a, b) => {
        if (a.id === playerId.value)
          return -1
        if (b.id === playerId.value)
          return 1
        const aBaseJob = Util.baseJobEnumConverted(a.job)
        const bBaseJob = Util.baseJobEnumConverted(b.job)
        const aIndex = sortRuleUser.value.indexOf(aBaseJob)
        const bIndex = sortRuleUser.value.indexOf(bBaseJob)
        const aSort = aIndex >= 0 ? aIndex : 999
        const bSort = bIndex >= 0 ? bIndex : 999
        if (aSort === bSort)
          return Number.parseInt(b.id, 16) - Number.parseInt(a.id, 16)
        return aSort - bSort
      })
      .slice(0, 8)
  }

  function updateResourceManagerJobs() {
    const partyInfo = new Map<number, string[]>()
    const partySource = fakeMode.value ? teamWatchFakeParty : party.value
    partySource.forEach((member) => {
      const normalizedJob = Util.baseJobEnumConverted(member.job)
      const normalizedId = toHexId(member.id)
      if (!partyInfo.has(normalizedJob))
        partyInfo.set(normalizedJob, [])
      const ids = partyInfo.get(normalizedJob)!
      if (!ids.includes(normalizedId))
        ids.push(normalizedId)
    })
    resourceManager.updateParty(partyInfo)
  }

  function scheduleRebuild() {
    if (rebuildTimer)
      return
    rebuildTimer = window.setTimeout(() => {
      rebuildTimer = undefined
      rebuildMembers()
    }, 0)
  }

  function resolveMemberWatchActionIds(job: number) {
    const normalizedJob = Number.isFinite(Number(job)) ? Math.trunc(Number(job)) : 0
    if (normalizedJob <= 0)
      return [...TEAM_WATCH_EMPTY_ACTIONS]

    const advancedJob = Util.baseJobEnumConverted(normalizedJob)
    if (advancedJob !== normalizedJob) {
      const inheritedSource
        = watchJobsActionsIDUser.value[advancedJob]
          ?? TEAM_WATCH_EMPTY_ACTIONS
      return buildInheritedBaseJobActions(normalizedJob, inheritedSource)
    }

    const configured = watchJobsActionsIDUser.value[normalizedJob]
    if (Array.isArray(configured) && configured.length > 0)
      return configured
    return [...TEAM_WATCH_EMPTY_ACTIONS]
  }

  function rebuildMembers() {
    updateResourceManagerJobs()

    const sorted = getSortedParty()
    const nextMembers: TeamWatchMemberView[] = []
    const pendingAutoFetchActionIds = new Set<number>()
    const activeRuntimeKeys = new Set<string>()
    const nextLookup: Record<string, string> = {}
    const activeActionByOwner = new Map<string, Set<number>>()

    for (const member of sorted) {
      const actionIds = resolveMemberWatchActionIds(member.job)

      const ownerId = toHexId(member.id)
      const memberLevel = Number.isFinite(member.level) ? member.level : 100

      const skills: TeamWatchSkillView[] = actionIds.map((rawActionId) => {
        if (rawActionId > 0)
          pendingAutoFetchActionIds.add(rawActionId)
        const meta = resolveActionMeta(rawActionId, memberLevel)
        const resolvedActionId = Math.max(0, meta.id)
        const trackedActionId = normalizeTrackedActionId(resolvedActionId)
        const runtimeKey = `${ownerId}:${trackedActionId}`
        ensureRuntime(runtimeByKey, runtimeKey, ownerId, member.job, trackedActionId, meta)
        activeRuntimeKeys.add(runtimeKey)

        if (trackedActionId > 0) {
          nextLookup[`${ownerId}:${trackedActionId}`] = runtimeKey
          ensureCooldownHistory(cooldownTracker, ownerId, trackedActionId)
          if (!activeActionByOwner.has(ownerId))
            activeActionByOwner.set(ownerId, new Set<number>())
          activeActionByOwner.get(ownerId)!.add(trackedActionId)
        }

        return {
          rawActionId,
          resolvedActionId,
          trackedActionId,
          runtimeKey,
          meta,
        }
      })

      nextMembers.push({
        id: ownerId,
        name: member.name,
        job: member.job,
        level: member.level,
        skills,
      })
    }

    pendingAutoFetchActionIds.forEach(actionId => triggerAutoFetchActionMeta(actionId))

    for (const key of Object.keys(runtimeByKey)) {
      if (!activeRuntimeKeys.has(key))
        Reflect.deleteProperty(runtimeByKey, key)
    }

    for (const ownerId of Object.keys(cooldownTracker)) {
      const activeActions = activeActionByOwner.get(ownerId)
      if (!activeActions) {
        Reflect.deleteProperty(cooldownTracker, ownerId)
        continue
      }
      const ownerMap = cooldownTracker[ownerId]
      if (!ownerMap)
        continue
      for (const rawActionId of Object.keys(ownerMap)) {
        const actionId = Number(rawActionId)
        if (!activeActions.has(actionId))
          Reflect.deleteProperty(ownerMap, rawActionId)
      }
      if (Object.keys(ownerMap).length === 0)
        Reflect.deleteProperty(cooldownTracker, ownerId)
    }

    for (const key of Object.keys(actionLookup))
      Reflect.deleteProperty(actionLookup, key)
    Object.assign(actionLookup, nextLookup)
    members.value = nextMembers
  }

  function clearCooldownStates() {
    clearRuntimeCooldownStates(runtimeByKey, cooldownTracker)
    resourceManager.reset()
    nowTs.value = Date.now()
    skillStateCacheTs = 0
    skillStateCache.clear()
  }

  function fillResourceStates() {
    resourceManager.fill()
    nowTs.value = Date.now()
    skillStateCacheTs = 0
    skillStateCache.clear()
  }

  function updateRuntime() {
    const now = Date.now()
    nowTs.value = now
    if (skillStateCacheTs !== now) {
      skillStateCacheTs = now
      skillStateCache.clear()
    }
    updateRuntimeCollection(runtimeByKey, cooldownTracker, now)
  }

  function triggerSkillByAction(casterId: string, actionId: number) {
    const now = Date.now()
    if (triggerRuntimeByAction({
      runtimeByKey,
      cooldownTracker,
      actionLookup,
      casterId,
      actionId,
      now,
    })) {
      nowTs.value = now
    }
  }

  function triggerAllVisibleSkills() {
    let offsetMs = 0
    members.value.forEach((member) => {
      member.skills.forEach((skill) => {
        if (skill.rawActionId <= 0 || member.level < skill.meta.classJobLevel)
          return
        const actionId = skill.resolvedActionId > 0 ? skill.resolvedActionId : skill.rawActionId
        if (actionId <= 0)
          return

        const line = buildSimulatedAbilityLine(
          Date.now() + offsetMs,
          member.id,
          member.name,
          actionId,
          skill.meta.name,
        )
        offsetMs += 1
        handleLogLine({ line })
      })
    })
  }

  function setFakeMode(value: boolean) {
    if (fakeMode.value === value)
      return
    fakeMode.value = value
    rebuildMembers()
  }

  function handleChangePrimaryPlayer(e: { charID: number }) {
    playerId.value = e.charID.toString(16).toUpperCase()
    rebuildMembers()
  }

  function handlePartyChanged(e: { party: Party[] }) {
    party.value = e.party
      .filter(v => v.inParty)
      .map(v => ({
        ...v,
        id: toHexId(v.id),
      }))
    if (!fakeMode.value)
      rebuildMembers()
  }

  function handleZoneChanged() {
    clearCooldownStates()
    scheduleRebuild()
  }

  function handleLogLine(e: { line: string[] }) {
    const type = e.line[0] ?? ''
    if (!type)
      return

    resourceManager.processLine(type, e.line, cooldownTracker)

    const triggeredAction = extractTriggeredActionFromLogLine(e.line)
    if (triggeredAction) {
      triggerSkillByAction(triggeredAction.casterId, triggeredAction.actionId)
      return
    }

    if (isTeamWatchResetLogLine(e.line)) {
      clearCooldownStates()
      scheduleRebuild()
    }
  }

  function getSkillState(skill: TeamWatchSkillView): TeamWatchSkillStateView {
    if (skillStateCacheTs !== nowTs.value) {
      skillStateCacheTs = nowTs.value
      skillStateCache.clear()
    }

    const cacheKey = buildSkillStateCacheKey(skill)
    const cached = skillStateCache.get(cacheKey)
    if (cached)
      return cached

    const state = resolveTeamWatchSkillState({
      skill,
      runtime: runtimeByKey[skill.runtimeKey],
      now: nowTs.value,
      cooldownTracker,
      resourceManager,
    })
    skillStateCache.set(cacheKey, state)
    return state
  }

  function buildSkillStatusText(member: TeamWatchMemberView, skill: TeamWatchSkillView) {
    const state = getSkillState(skill)
    return buildTeamWatchSkillStatusText(member.name, skill.meta.name, state)
  }

  function getSnapshot() {
    return {
      sortRuleUser: [...sortRuleUser.value],
      watchJobsActionsIDUser: deepCloneWatchMap(watchJobsActionsIDUser.value),
      actionMetaUser: cloneTeamWatchActionMetaMap(actionMetaUser.value),
    } satisfies TeamWatchStorageData
  }

  function loadFromStorage() {
    const next = loadTeamWatchStorageData()
    sortRuleUser.value = [...next.sortRuleUser]
    watchJobsActionsIDUser.value = deepCloneWatchMap(next.watchJobsActionsIDUser)
    actionMetaUser.value = cloneTeamWatchActionMetaMap(next.actionMetaUser)
    rebuildMembers()
    const actionIds = collectWatchActionIds(watchJobsActionsIDUser.value)
    actionIds.forEach(actionId => triggerAutoFetchActionMeta(actionId))
  }

  function saveSettings(next: TeamWatchSaveSettingsInput) {
    const nextActionMetaUser = next.actionMetaUser ?? actionMetaUser.value
    saveTeamWatchStorageData({
      sortRuleUser: [...next.sortRuleUser],
      watchJobsActionsIDUser: deepCloneWatchMap(next.watchJobsActionsIDUser),
      actionMetaUser: cloneTeamWatchActionMetaMap(nextActionMetaUser),
    })
    loadFromStorage()
  }

  function saveActionMetaRaw(actionId: number, raw: TeamWatchActionMetaRaw) {
    if (actionId <= 0)
      return

    const nextActionMetaUser = cloneTeamWatchActionMetaMap(actionMetaUser.value)
    nextActionMetaUser[actionId] = normalizeTeamWatchActionMetaRaw(actionId, raw)

    saveTeamWatchStorageData({
      sortRuleUser: [...sortRuleUser.value],
      watchJobsActionsIDUser: deepCloneWatchMap(watchJobsActionsIDUser.value),
      actionMetaUser: nextActionMetaUser,
    })

    actionMetaUser.value = nextActionMetaUser
    scheduleRebuild()
  }

  function resetSettings() {
    const knownJobs = buildKnownJobs(watchJobsActionsIDUser.value, DEFAULT_JOB_SORT_ORDER)
    const defaultWatchMap = buildDefaultWatchMap(
      knownJobs,
      TEAM_WATCH_WATCH_ACTIONS_DEFAULT,
      TEAM_WATCH_EMPTY_ACTIONS,
    )
    saveSettings({
      sortRuleUser: [...DEFAULT_JOB_SORT_ORDER],
      watchJobsActionsIDUser: defaultWatchMap,
      actionMetaUser: {},
    })
  }

  function exportSettings() {
    const snapshot = getSnapshot()
    return encodeBase64Payload(JSON.stringify(snapshot))
  }

  function importSettings(encoded: string) {
    const decoded = decodeBase64Payload(encoded)
    const parsed = JSON.parse(decoded) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object')
      throw new Error('invalid teamwatch payload')

    const entries = Object.entries(parsed)
    const isLegacyV4Payload = entries.length > 0 && entries.every(([key, value]) => {
      const jobId = Number(key)
      return Number.isFinite(jobId) && Array.isArray(value)
    })
    if (isLegacyV4Payload) {
      saveSettings({
        sortRuleUser: sortRuleUser.value,
        watchJobsActionsIDUser: parsed as unknown as Record<number, number[]>,
        actionMetaUser: {},
      })
      return
    }

    const sortRuleCandidate = parsed.sortRuleUser
    const watchMapCandidate = parsed.watchJobsActionsIDUser
    const actionMetaCandidate = parsed.actionMetaUser
    if (
      Array.isArray(sortRuleCandidate)
      && !!watchMapCandidate
      && typeof watchMapCandidate === 'object'
      && !!actionMetaCandidate
      && typeof actionMetaCandidate === 'object'
    ) {
      saveSettings({
        sortRuleUser: sortRuleCandidate as number[],
        watchJobsActionsIDUser: watchMapCandidate as Record<number, number[]>,
        actionMetaUser: actionMetaCandidate as Record<number, TeamWatchActionMetaRaw>,
      })
      return
    }

    throw new Error('invalid teamwatch payload')
  }

  return {
    members,
    partyCount,
    getActionMetaRaw,
    resolveActionMeta,
    fetchActionMetaDraft,
    getSkillState,
    buildSkillStatusText,
    updateRuntime,
    triggerAllVisibleSkills,
    setFakeMode,
    fillResourceStates,
    handleChangePrimaryPlayer,
    handlePartyChanged,
    handleZoneChanged,
    handleLogLine,
    getSnapshot,
    loadFromStorage,
    saveSettings,
    resetSettings,
    exportSettings,
    importSettings,
  }
})

export { useTeamWatchStore }
