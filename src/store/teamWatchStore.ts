import type { Party } from 'cactbot/types/event'
import type { TeamWatchRuntime, TeamWatchSkillStateView } from '@/store/teamWatchHelpers'
import type { TeamWatchActionMeta, TeamWatchActionMetaRaw, TeamWatchMemberView, TeamWatchSkillView, TeamWatchStorageData } from '@/types/teamWatchTypes'
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { JobResourceManager } from '@/modules/jobResourceTracker'
import { DEFAULT_JOB_SORT_ORDER } from '@/resources/jobSortOrder'
import { getActionIconId, resolveActionDisplayName, resolveActionIconSrc, resolveApiActionMeta } from '@/resources/logic/actionMetaResolver'
import { buildInheritedBaseJobActions, cloneTeamWatchActionMetaMap, loadTeamWatchStorageData, normalizeTeamWatchActionMetaRaw, saveTeamWatchStorageData, TEAM_WATCH_EMPTY_ACTIONS, TEAM_WATCH_STORAGE_NAMESPACE, TEAM_WATCH_WATCH_ACTIONS_DEFAULT } from '@/resources/teamWatchResource'
import { buildSimulatedAbilityLine, clearRuntimeCooldownStates, decodeBase64Payload, encodeBase64Payload, ensureRuntime, resolveTeamWatchSkillState, resolveTrackedActionId, updateRuntimeCollection, useRuntime } from '@/store/teamWatchHelpers'
import { resolveUpgradeActionIdForLevel } from '@/utils/compareSaveAction'
import { parseDynamicValue } from '@/utils/dynamicValue'
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

const TEAM_WATCH_RESET_EFFECT_IDS = new Set(['4000000F', '40000010'])

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
    Object.fromEntries(Object.entries(storage.watchJobsActionsIDUser).map(([k, v]) => [Number(k), [...v]])),
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

  // 1. Reactive Sync & Auto Rebuild
  watch(
    [party, fakeMode, playerId, sortRuleUser, watchJobsActionsIDUser, actionMetaUser],
    () => {
      saveTeamWatchStorageData(getSnapshot())
      scheduleRebuild()
    },
    { deep: true },
  )

  function getActionMetaRaw(actionId: number, autoFetch = true) {
    const raw = normalizeTeamWatchActionMetaRaw(actionId, actionMetaUser.value[actionId])
    if (autoFetch && actionId > 0)
      triggerAutoFetchActionMeta(actionId)
    return raw
  }

  function triggerAutoFetchActionMeta(actionId: number) {
    if (actionId <= 0)
      return
    const existing = actionMetaUser.value[actionId]
    if ((existing?.actionCategory ?? 0) > 0)
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
    const configuredActionId = Math.trunc(Number(raw.id)) || actionId
    const resolvedActionId = resolveUpgradeActionIdForLevel(configuredActionId, level) || configuredActionId
    const iconId = raw.iconId || getActionIconId(configuredActionId)

    return {
      id: resolvedActionId,
      name: resolveActionDisplayName(resolvedActionId, configuredActionId, raw.name),
      iconId,
      iconSrc: resolveActionIconSrc(resolvedActionId > 0 ? resolvedActionId : configuredActionId),
      actionCategory: Number(raw.actionCategory),
      recast1000ms: parseDynamicValue(raw.recast1000ms, level),
      duration: parseDynamicValue(raw.duration, level),
      maxCharges: parseDynamicValue(raw.maxCharges, level),
      classJobLevel: parseDynamicValue(raw.classJobLevel, level),
    } satisfies TeamWatchActionMeta
  }

  async function fetchActionMetaDraft(actionId: number, force = false): Promise<TeamWatchActionMetaRaw> {
    if (actionId <= 0)
      return normalizeTeamWatchActionMetaRaw(0, {})

    if (!force && actionMetaUser.value[actionId])
      return getActionMetaRaw(actionId)

    const pending = pendingMetaRequest.get(actionId)
    if (pending)
      return pending

    const task = (async () => {
      const base = getActionMetaRaw(actionId, false)
      try {
        const response = await parseAction('action', actionId, TEAM_WATCH_ACTION_COLUMNS)
        const resolvedApi = resolveApiActionMeta(actionId, response as Record<string, unknown>)

        const apiMeta = normalizeTeamWatchActionMetaRaw(actionId, {
          id: actionId,
          name: resolveActionDisplayName(actionId, actionId, resolvedApi.name),
          iconId: getActionIconId(actionId),
          actionCategory: resolvedApi.actionCategoryTargetId,
          recast1000ms: resolvedApi.recast1000ms,
          duration: base.duration,
          maxCharges: resolvedApi.maxCharges,
          classJobLevel: resolvedApi.classJobLevel,
        })

        const merged = apiMeta
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
      const normalizedId = String(member.id).toUpperCase()
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
    const jobId = Math.trunc(Number(job)) || 0
    if (jobId <= 0)
      return [...TEAM_WATCH_EMPTY_ACTIONS]

    const advancedJob = Util.baseJobEnumConverted(jobId)
    const isBase = advancedJob !== jobId

    const source = watchJobsActionsIDUser.value[isBase ? advancedJob : jobId] ?? TEAM_WATCH_EMPTY_ACTIONS
    const validSource = Array.isArray(source) && source.length > 0 ? source : [...TEAM_WATCH_EMPTY_ACTIONS]

    return isBase ? buildInheritedBaseJobActions(jobId, validSource) : validSource
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

      const ownerId = String(member.id).toUpperCase()
      const memberLevel = Number.isFinite(member.level) ? member.level : 100

      const skills: TeamWatchSkillView[] = actionIds.map((rawActionId) => {
        if (rawActionId > 0)
          pendingAutoFetchActionIds.add(rawActionId)
        const meta = resolveActionMeta(rawActionId, memberLevel)
        const resolvedActionId = Math.max(0, meta.id)
        const trackedActionId = resolveTrackedActionId(resolvedActionId)
        const runtimeKey = `${ownerId}:${trackedActionId}`
        ensureRuntime(runtimeByKey, runtimeKey, ownerId, member.job, trackedActionId, meta)
        activeRuntimeKeys.add(runtimeKey)

        if (trackedActionId > 0) {
          nextLookup[`${ownerId}:${trackedActionId}`] = runtimeKey
          cooldownTracker[ownerId] ??= {}
          cooldownTracker[ownerId]![trackedActionId] ??= []
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
    const trackedActionId = resolveTrackedActionId(actionId)
    if (trackedActionId <= 0)
      return
    const runtimeKey = actionLookup[`${String(casterId).toUpperCase()}:${trackedActionId}`]
    if (!runtimeKey)
      return
    if (useRuntime(runtimeByKey, cooldownTracker, runtimeKey, now)) {
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
    fakeMode.value = value
  }

  function handleChangePrimaryPlayer(e: { charID: number }) {
    playerId.value = e.charID.toString(16).toUpperCase()
  }

  function handlePartyChanged(e: { party: Party[] }) {
    party.value = e.party
      .filter(v => v.inParty)
      .map(v => ({
        ...v,
        id: String(v.id).toUpperCase(),
      }))
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

    if (type === '21' || (type === '22' && e.line[45] === '0')) {
      const actionId = Number.parseInt(e.line[4] ?? '', 16)
      const casterId = e.line[2]
      if (casterId && Number.isFinite(actionId)) {
        triggerSkillByAction(casterId, actionId)
        return
      }
    }

    if (type === '33' && TEAM_WATCH_RESET_EFFECT_IDS.has(e.line[3] ?? '')) {
      clearCooldownStates()
      scheduleRebuild()
    }
  }

  function getSkillState(skill: TeamWatchSkillView): TeamWatchSkillStateView {
    if (skillStateCacheTs !== nowTs.value) {
      skillStateCacheTs = nowTs.value
      skillStateCache.clear()
    }

    const cacheKey = `${skill.runtimeKey}:${skill.rawActionId}:${skill.resolvedActionId}:${skill.trackedActionId}:${skill.meta.maxCharges}:${skill.meta.recast1000ms}`
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

    return `${member.name} ${skill.meta.name} ${suffixes.join(' ')}`
  }

  function getSnapshot() {
    return {
      sortRuleUser: [...sortRuleUser.value],
      watchJobsActionsIDUser: Object.fromEntries(Object.entries(watchJobsActionsIDUser.value).map(([k, v]) => [Number(k), [...v]])),
      actionMetaUser: cloneTeamWatchActionMetaMap(actionMetaUser.value),
    } satisfies TeamWatchStorageData
  }

  function loadFromStorage() {
    const next = loadTeamWatchStorageData()
    sortRuleUser.value = [...next.sortRuleUser]
    watchJobsActionsIDUser.value = Object.fromEntries(Object.entries(next.watchJobsActionsIDUser).map(([k, v]) => [Number(k), [...v]]))
    actionMetaUser.value = cloneTeamWatchActionMetaMap(next.actionMetaUser)
    // rebuild will bue triggered by watch
    const actionIds = new Set(
      Object.values(watchJobsActionsIDUser.value)
        .flat()
        .map(Number)
        .filter(id => Number.isFinite(id) && id > 0),
    )
    actionIds.forEach(actionId => triggerAutoFetchActionMeta(actionId))
  }

  // Window Sync: Listen for storage changes from other windows (e.g., settings window)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === TEAM_WATCH_STORAGE_NAMESPACE) {
        loadFromStorage()
      }
    })
  }

  function saveSettings(next: TeamWatchSaveSettingsInput) {
    sortRuleUser.value = [...next.sortRuleUser]
    watchJobsActionsIDUser.value = Object.fromEntries(Object.entries(next.watchJobsActionsIDUser).map(([k, v]) => [Number(k), [...v]]))
    if (next.actionMetaUser !== undefined)
      actionMetaUser.value = cloneTeamWatchActionMetaMap(next.actionMetaUser)
    // Force immediate persistence to avoid race conditions with loadFromStorage
    saveTeamWatchStorageData(getSnapshot())
  }

  function saveActionMetaRaw(actionId: number, raw: TeamWatchActionMetaRaw) {
    if (actionId <= 0)
      return
    actionMetaUser.value[actionId] = normalizeTeamWatchActionMetaRaw(actionId, raw)
  }

  function resetSettings() {
    // 重置到初始状态
    const knownJobs = Array.from(new Set([
      ...DEFAULT_JOB_SORT_ORDER,
      ...Object.keys(watchJobsActionsIDUser.value).map(Number),
    ]))
    const defaultWatchMap: Record<number, number[]> = {}
    knownJobs.forEach((job) => {
      defaultWatchMap[job] = [...(TEAM_WATCH_WATCH_ACTIONS_DEFAULT[job] ?? TEAM_WATCH_EMPTY_ACTIONS)]
    })
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
    sortRuleUser,
    watchJobsActionsIDUser,
    actionMetaUser,
    fakeMode,
    playerId,
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
