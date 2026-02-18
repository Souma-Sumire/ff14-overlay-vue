import type { Party } from 'cactbot/types/event'
import type {
  TeamWatchActionMeta,
  TeamWatchActionMetaRaw,
  TeamWatchMemberView,
  TeamWatchSkillView,
  TeamWatchStorageData,
} from '@/types/teamWatchTypes'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { JobResourceManager } from '@/modules/jobResourceTracker'
import { resolveJobResourceActionCost } from '@/resources/jobResourceActionCost'
import { DEFAULT_JOB_SORT_ORDER } from '@/resources/jobSortOrder'
import {
  buildTeamWatchFallbackMeta,
  cloneTeamWatchActionMetaMap,
  loadTeamWatchStorageData,
  normalizeTeamWatchActionMetaRaw,
  resolveTeamWatchDynamicValue,
  saveTeamWatchStorageData,
  TEAM_WATCH_EMPTY_ACTIONS,
  TEAM_WATCH_STORAGE_VERSION,
  TEAM_WATCH_WATCH_ACTIONS_DEFAULT,
} from '@/resources/teamWatchResource'
import {
  buildDefaultWatchMap,
  buildKnownJobs,
  buildSimulatedAbilityLine,
  clamp,
  collectWatchActionIds,
  decodeBase64Payload,
  deepCloneWatchMap,
  encodeBase64Payload,
  normalizeInt,
  normalizeTrackedActionId,
  toHexId,
} from '@/store/teamWatchStoreHelpers'
import {
  clearRuntimeCooldownStates,
  ensureCooldownHistory,
  ensureRuntime,
  type TeamWatchRuntime,
  updateRuntimeCollection,
  useRuntime,
} from '@/store/teamWatchRuntimeHelpers'
import Util from '@/utils/util'
import { getIconSrcByPath, parseAction } from '@/utils/xivapi'

interface TeamWatchSkillStateView {
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

const TEAM_WATCH_ACTION_COLUMNS = [
  'ID',
  'Name',
  'Icon',
  'Recast100ms',
  'MaxCharges',
  'ClassJobLevel',
] as (keyof XivApiJson)[]

const teamWatchFakeParty: Party[] = [
  { id: '10000001', name: 'Faker1', worldId: 0, job: 24, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000002', name: 'Faker2', worldId: 0, job: 25, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000003', name: 'Faker3', worldId: 0, job: 35, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000004', name: 'Faker4', worldId: 0, job: 34, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000005', name: 'Faker5', worldId: 0, job: 42, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000006', name: 'Faker6', worldId: 0, job: 41, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000007', name: 'Faker7', worldId: 0, job: 28, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
  { id: '10000008', name: 'Faker8', worldId: 0, job: 33, inParty: true, contentId: 0, flags: 0, level: 100, objectId: 0, partyType: 1, territoryType: 0 },
]

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
    if (actionMetaUser.value[actionId])
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
    const raw = rawOverride ? normalizeTeamWatchActionMetaRaw(actionId, rawOverride) : getActionMetaRaw(actionId)
    const resolvedActionId = normalizeInt(Number(raw.id), actionId, 0)

    const fallback = buildTeamWatchFallbackMeta(actionId)
    const name = raw.name.trim() || fallback.name
    const iconSrc = raw.iconSrc.trim() || fallback.iconSrc

    return {
      id: resolvedActionId,
      name,
      iconSrc,
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
        const iconPath = typeof response.Icon === 'string' ? response.Icon : ''
        const iconSrc = iconPath
          ? getIconSrcByPath(iconPath, false, true)
          : base.iconSrc

        const apiMeta = normalizeTeamWatchActionMetaRaw(actionId, {
          id: actionId,
          name: response.Name ?? base.name,
          iconSrc,
          recast1000ms: Number(response.Recast100ms ?? 0) / 10,
          duration: base.duration,
          maxCharges: Number(response.MaxCharges ?? 0),
          classJobLevel: Number(response.ClassJobLevel ?? 1),
        } satisfies TeamWatchActionMetaRaw)

        const merged = normalizeTeamWatchActionMetaRaw(actionId, apiMeta)
        // Cache API result to local state + localStorage, but never overwrite manual config.
        if (!actionMetaUser.value[actionId])
          saveActionMetaRaw(actionId, merged)
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

  function rebuildMembers() {
    updateResourceManagerJobs()

    const sorted = getSortedParty()
    const nextMembers: TeamWatchMemberView[] = []
    const activeRuntimeKeys = new Set<string>()
    const nextLookup: Record<string, string> = {}
    const activeActionByOwner = new Map<string, Set<number>>()

    for (const member of sorted) {
      const actionIds
        = watchJobsActionsIDUser.value[member.job]
          ?? watchJobsActionsIDUser.value[Util.baseJobEnumConverted(member.job)]
          ?? [0, 0, 0, 0, 0]

      const ownerId = toHexId(member.id)
      const memberLevel = Number.isFinite(member.level) ? member.level : 100

      const skills: TeamWatchSkillView[] = actionIds.map((rawActionId) => {
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
    const trackedActionId = normalizeTrackedActionId(actionId)
    if (trackedActionId <= 0)
      return
    const runtimeKey = actionLookup[`${toHexId(casterId)}:${trackedActionId}`]
    if (!runtimeKey)
      return
    const now = Date.now()
    if (useRuntime(runtimeByKey, cooldownTracker, runtimeKey, now))
      nowTs.value = now
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

    if (type === '21' || (type === '22' && e.line[45] === '0')) {
      const actionIdHex = e.line[4]
      const casterId = e.line[2]
      if (!actionIdHex || !casterId)
        return
      const actionId = Number.parseInt(actionIdHex, 16)
      if (!Number.isFinite(actionId))
        return
      triggerSkillByAction(casterId, actionId)
      return
    }

    if (type === '33' && ['4000000F', '40000010'].includes(e.line[3] ?? '')) {
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

    const runtime = runtimeByKey[skill.runtimeKey]
    const now = nowTs.value
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
      const state = {
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
      skillStateCache.set(cacheKey, state)
      return state
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

    const resourceCost
      = resolveJobResourceActionCost(
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

    const state = {
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
      storageVersion: TEAM_WATCH_STORAGE_VERSION,
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

  function saveSettings(
    nextSortRuleUser: number[],
    nextWatchJobsActionsIDUser: Record<number, number[]>,
    nextActionMetaUser: Record<number, TeamWatchActionMetaRaw> = actionMetaUser.value,
  ) {
    saveTeamWatchStorageData({
      sortRuleUser: [...nextSortRuleUser],
      watchJobsActionsIDUser: deepCloneWatchMap(nextWatchJobsActionsIDUser),
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
    saveSettings([...DEFAULT_JOB_SORT_ORDER], defaultWatchMap, {})
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
    const storageVersion = Number(parsed.storageVersion ?? 0)
    const isV5Payload = Number.isFinite(storageVersion) && storageVersion >= TEAM_WATCH_STORAGE_VERSION

    const hasNewShape = parsed && typeof parsed === 'object' && (
      Object.prototype.hasOwnProperty.call(parsed, 'watchJobsActionsIDUser')
      || Object.prototype.hasOwnProperty.call(parsed, 'sortRuleUser')
      || Object.prototype.hasOwnProperty.call(parsed, 'actionMetaUser')
    )

    if (hasNewShape) {
      saveSettings(
        (parsed.sortRuleUser as number[]) ?? sortRuleUser.value,
        (parsed.watchJobsActionsIDUser as Record<number, number[]>) ?? watchJobsActionsIDUser.value,
        isV5Payload
          ? ((parsed.actionMetaUser as Record<number, TeamWatchActionMetaRaw>) ?? actionMetaUser.value)
          : {},
      )
      return
    }

    saveSettings(
      sortRuleUser.value,
      parsed as unknown as Record<number, number[]>,
      {},
    )
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
