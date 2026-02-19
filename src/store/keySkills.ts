import type { Party } from 'cactbot/types/event'
import type { DynamicValue } from '@/types/dynamicValue'
import type { KeySkillEntity } from '@/types/keySkill'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { useDemo } from '@/composables/useDemo'
import { useDev } from '@/composables/useDev'
import { RandomPartyGenerator } from '@/mock/demoParty'
import { GLOBAL_SKILL_MAX_LEVEL } from '@/resources/globalSkills'
import { DEFAULT_JOB_SORT_ORDER } from '@/resources/jobSortOrder'
import { raidbuffs } from '@/resources/keySkillResource'
import { resolveActionDisplayName, resolveActionIconSrc, resolveActionJobsFromTargets, resolveActionMetaByLevel, resolveApiActionMeta, resolveBakedActionMeta, shouldFetchResolvedActionMeta } from '@/resources/logic/actionMetaResolver'
import { resolveActionMinLevel } from '@/resources/logic/actionMinLevel'
import { resolveTeamWatchDynamicValue } from '@/resources/teamWatchResource'
import { resolveUpgradeActionIdForLevel } from '@/utils/compareSaveAction'
import { tts } from '@/utils/tts'
import Util from '@/utils/util'
import { parseAction, XIVAPI_CACHE_VERSION } from '@/utils/xivapi'

interface SkillState {
  startTime: number | null
  isRecast: boolean
  durationLeft: number
  recastLeft: number
  text: string
  active: boolean
  animationKey: number
  clipPercent: number
  rafId?: number
}

interface KeySkillEntry {
  key: string
  id: number
  tts: string
  line: number
  job?: number[]
  recast1000ms?: DynamicValue
  duration?: DynamicValue
  minLevel?: number
}

interface KeySkillStorageData {
  chinese: KeySkillEntry[]
  mergedIds: number[]
}

interface KeySkillAutoMeta {
  id: number
  name: string
  src: string
  duration: number
  recast1000ms: number
  minLevel: number
  jobs: number[]
  classJobTargetId?: number
  isRoleAction: boolean
}

interface DefaultKeySkillEntry {
  id: number
  tts: string
  line: number
}

const KEY_SKILLS_AUTO_META_CACHE_VERSION_STORAGE_KEY = 'keySkills-auto-meta-cache-version'
const LEGACY_PRESET_2248_KEY = 'preset_2248'

function normalizeAutoMetaEntry(rawId: number, value: unknown): KeySkillAutoMeta | undefined {
  if (!value || typeof value !== 'object')
    return undefined
  const row = value as Record<string, unknown>
  const id = normalizeInt(Number(row.id ?? rawId), rawId, 1)
  const name = typeof row.name === 'string' && row.name.trim() ? row.name : resolveActionDisplayName(id, id)
  const src = typeof row.src === 'string' ? row.src : resolveActionIconSrc(id)
  const duration = normalizeInt(Number(row.duration ?? 0), 0, 0)
  const recast1000ms = normalizeInt(Number(row.recast1000ms ?? 0), 0, 0)
  const isRoleAction = Number(row.isRoleAction ?? 0) > 0
  const minLevel = resolveActionMinLevel(row.minLevel ?? 1, {
    actionId: id,
    isRoleAction,
    fallback: 1,
  })
  const jobs = uniqueInts(Array.isArray(row.jobs) ? row.jobs.map(v => Number(v)) : [])
  const classJobTargetId = normalizeInt(Number(row.classJobTargetId ?? 0), 0, 0)
  return { id, name, src, duration, recast1000ms, minLevel, jobs, classJobTargetId, isRoleAction }
}

function normalizeAutoMetaCache(raw: unknown): Record<number, KeySkillAutoMeta> {
  if (!raw || typeof raw !== 'object')
    return {}
  const output: Record<number, KeySkillAutoMeta> = {}
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    const id = normalizeInt(Number(key), 0, 1)
    if (id <= 0)
      return
    const normalized = normalizeAutoMetaEntry(id, value)
    if (!normalized)
      return
    output[id] = normalized
  })
  return output
}

const generator = new RandomPartyGenerator()

function normalizeInt(value: number, fallback: number, min = 0) {
  if (!Number.isFinite(value))
    return fallback
  return Math.max(min, Math.trunc(value))
}

function normalizeSkillLevel(value: number, fallback = GLOBAL_SKILL_MAX_LEVEL) {
  const normalized = normalizeInt(value, fallback, 1)
  return Math.min(GLOBAL_SKILL_MAX_LEVEL, normalized)
}

function uniqueInts(input: number[]) {
  return [...new Set(input.filter(v => Number.isFinite(v) && v > 0).map(v => Math.trunc(v)))]
}

function buildDefaultSkillEntries() {
  const map = new Map<number, DefaultKeySkillEntry>()
  raidbuffs.forEach((skill) => {
    const resolvedId = normalizeInt(resolveTeamWatchDynamicValue(skill.id, GLOBAL_SKILL_MAX_LEVEL, 0), 0, 0)
    if (resolvedId <= 0 || map.has(resolvedId))
      return

    map.set(resolvedId, {
      id: resolvedId,
      tts: typeof skill.tts === 'string' ? skill.tts : '',
      line: normalizeInt(Number(skill.line ?? 1), 1, 1),
    })
  })
  return [...map.values()]
}

function createSkillEntry(id: number, tts = '', line = 1): KeySkillEntry {
  return {
    key: crypto.randomUUID(),
    id,
    tts,
    line: normalizeInt(Number(line), 1, 1),
  }
}

function normalizeEntryDynamicValue(value: unknown): DynamicValue | undefined {
  if (typeof value === 'number' && Number.isFinite(value))
    return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed)
      return trimmed
  }
  return undefined
}

function normalizeEntryMinLevel(value: unknown): number | undefined {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return undefined
  return normalizeInt(numeric, 1, 1)
}

function normalizeEntryJobs(value: unknown): number[] | undefined {
  if (!Array.isArray(value))
    return undefined
  const jobs = uniqueInts(value.map(v => Number(v)))
  return jobs
}

function normalizeStorageSkills(raw: unknown): KeySkillEntry[] {
  if (!Array.isArray(raw))
    return []

  const normalized: KeySkillEntry[] = []
  raw.forEach((item) => {
    if (!item || typeof item !== 'object')
      return
    const row = item as Record<string, unknown>
    const rawId = row.id as number | string | undefined
    const resolvedId = normalizeInt(
      resolveTeamWatchDynamicValue(rawId ?? 0, GLOBAL_SKILL_MAX_LEVEL, 0),
      0,
      0,
    )
    if (resolvedId <= 0)
      return
    const key = typeof row.key === 'string' && row.key.trim() ? row.key : crypto.randomUUID()
    if (key === LEGACY_PRESET_2248_KEY)
      return
    const line = normalizeInt(Number(row.line ?? 1), 1, 1)
    const ttsText = typeof row.tts === 'string' ? row.tts : ''
    normalized.push({
      key,
      id: resolvedId,
      line,
      tts: ttsText,
      job: normalizeEntryJobs(row.job),
      recast1000ms: normalizeEntryDynamicValue(row.recast1000ms),
      duration: normalizeEntryDynamicValue(row.duration),
      minLevel: (() => {
        const minLevel = normalizeEntryMinLevel(row.minLevel)
        if (minLevel === undefined)
          return undefined
        return resolveActionMinLevel(minLevel, {
          actionId: resolvedId,
          fallback: 1,
        })
      })(),
    })
  })
  return normalized
}

const useKeySkillStore = defineStore('keySkill', () => {
  const dev = useDev()
  const demo = useDemo()
  const party = ref<Party[]>([])
  const defaultSkillEntries = buildDefaultSkillEntries()
  const defaultSkillIds = defaultSkillEntries.map(v => v.id)

  const keySkillsData = useStorage<KeySkillStorageData>('keySkills-fix', {
    chinese: defaultSkillEntries.map(skill => createSkillEntry(skill.id, skill.tts, skill.line)),
    mergedIds: [...defaultSkillIds],
  })

  const normalizedStored = normalizeStorageSkills(keySkillsData.value.chinese)
  keySkillsData.value.chinese = normalizedStored

  if (!Array.isArray(keySkillsData.value.mergedIds)) {
    keySkillsData.value.mergedIds = [...defaultSkillIds]
  }
  else {
    keySkillsData.value.mergedIds = uniqueInts(keySkillsData.value.mergedIds)
  }

  const mergedSet = new Set(keySkillsData.value.mergedIds)
  const missingDefaultEntries = defaultSkillEntries.filter(skill => !mergedSet.has(skill.id))
  if (missingDefaultEntries.length > 0) {
    keySkillsData.value.chinese.push(
      ...missingDefaultEntries.map(skill => createSkillEntry(skill.id, skill.tts, skill.line)),
    )
    keySkillsData.value.mergedIds.push(...missingDefaultEntries.map(skill => skill.id))
  }

  const enableTts = useStorage('keySkills-enable-tts', { chinese: true })
  const skillStates = reactive<Record<string, SkillState>>({})
  const speed = ref(1)
  const levelSyncTestLevel = useStorage<number>('keySkills-level-sync-test-level', GLOBAL_SKILL_MAX_LEVEL)
  const autoMetaCache = useStorage<Record<string, KeySkillAutoMeta>>('keySkills-auto-meta-cache', {})
  const autoMetaCacheVersion = useStorage<string>(KEY_SKILLS_AUTO_META_CACHE_VERSION_STORAGE_KEY, '')

  levelSyncTestLevel.value = normalizeSkillLevel(levelSyncTestLevel.value)
  watch(levelSyncTestLevel, (value) => {
    const normalized = normalizeSkillLevel(value)
    if (normalized !== value)
      levelSyncTestLevel.value = normalized
  })

  if (autoMetaCacheVersion.value !== XIVAPI_CACHE_VERSION) {
    autoMetaCache.value = {}
    autoMetaCacheVersion.value = XIVAPI_CACHE_VERSION
  }

  const autoMetaById = reactive<Record<number, KeySkillAutoMeta>>({})
  const normalizedAutoMetaCache = normalizeAutoMetaCache(autoMetaCache.value)
  autoMetaCache.value = Object.fromEntries(
    Object.entries(normalizedAutoMetaCache).map(([id, meta]) => [String(id), meta]),
  )
  Object.entries(normalizedAutoMetaCache).forEach(([id, meta]) => {
    autoMetaById[Number(id)] = meta
  })
  const pendingAutoMeta = reactive(new Set<number>())
  const pendingAutoMetaTasks = new Map<number, Promise<void>>()
  const refreshedIncompleteAutoMeta = reactive(new Set<number>())
  const isAutoMetaLoading = computed(() => pendingAutoMeta.size > 0)

  function saveAutoMetaToCache(id: number, meta: KeySkillAutoMeta) {
    autoMetaById[id] = meta
    autoMetaCache.value = {
      ...autoMetaCache.value,
      [String(id)]: meta,
    }
    if (meta.isRoleAction) {
      keySkillsData.value.chinese.forEach((entry) => {
        if (entry.id !== id)
          return
        entry.minLevel = undefined
      })
    }
  }

  function buildAutoMetaFromBaked(actionId: number): KeySkillAutoMeta | undefined {
    const id = normalizeInt(actionId, 0, 1)
    if (id <= 0)
      return undefined
    const baked = resolveBakedActionMeta(id)
    if (!baked)
      return undefined

    const isRoleAction = baked.isRoleAction
    const levelMeta = resolveActionMetaByLevel(id, GLOBAL_SKILL_MAX_LEVEL, {
      baseRecast1000ms: baked.recast1000ms,
      baseDuration: 0,
      baseMinLevel: baked.classJobLevel,
      isRoleAction,
    })
    const jobs = levelMeta.jobsFromGlobal.length > 0
      ? levelMeta.jobsFromGlobal
      : baked.jobs
    const classJobTargetId = baked.classJobTargetId

    return {
      id: levelMeta.resolvedId,
      name: resolveActionDisplayName(levelMeta.resolvedId, id, baked.name),
      src: resolveActionIconSrc(levelMeta.resolvedId),
      duration: levelMeta.duration,
      recast1000ms: levelMeta.recast1000ms,
      minLevel: levelMeta.minLevel,
      jobs,
      classJobTargetId: classJobTargetId > 0 ? classJobTargetId : 0,
      isRoleAction,
    }
  }

  function resolveMeta(actionId: number): KeySkillAutoMeta {
    const cached = autoMetaById[actionId]
    if (cached)
      return cached
    const baked = buildAutoMetaFromBaked(actionId)
    if (baked)
      return baked
    const levelMeta = resolveActionMetaByLevel(actionId, GLOBAL_SKILL_MAX_LEVEL, {
      baseRecast1000ms: 0,
      baseDuration: 0,
      baseMinLevel: 1,
      isRoleAction: false,
    })

    return {
      id: levelMeta.resolvedId,
      name: resolveActionDisplayName(levelMeta.resolvedId, levelMeta.resolvedId),
      src: resolveActionIconSrc(levelMeta.resolvedId),
      duration: levelMeta.duration,
      recast1000ms: levelMeta.recast1000ms,
      minLevel: levelMeta.minLevel,
      jobs: levelMeta.jobsFromGlobal,
      classJobTargetId: 0,
      isRoleAction: false,
    }
  }

  async function ensureActionAutoMeta(actionId: number) {
    if (!Number.isFinite(actionId) || actionId <= 0)
      return
    const id = Math.trunc(actionId)
    const existing = autoMetaById[id]
    if (existing) {
      if (!shouldFetchResolvedActionMeta(
        { jobs: existing.jobs },
        { requireActionCategory: false, requireJobs: true },
      )) {
        return
      }
      if (refreshedIncompleteAutoMeta.has(id))
        return
    }
    const task = pendingAutoMetaTasks.get(id)
    if (task) {
      await task
      return
    }

    const baked = buildAutoMetaFromBaked(id)
    if (baked && !shouldFetchResolvedActionMeta(
      { jobs: baked.jobs },
      { requireActionCategory: false, requireJobs: true },
    )) {
      saveAutoMetaToCache(id, baked)
      refreshedIncompleteAutoMeta.add(id)
      return
    }

    const nextTask = (async () => {
      pendingAutoMeta.add(id)
      try {
        const response = await parseAction('action', id, [
          'ID',
          'Name',
          'Icon',
          'Recast100ms',
          'ClassJobLevel',
          'ClassJobTargetID',
          'ClassJobCategoryTargetID',
          'ActionCategoryTargetID',
          'IsRoleAction',
        ])
        const apiMeta = resolveApiActionMeta(id, response as Record<string, unknown>)
        const apiRecast1000ms = apiMeta.recast1000ms
        const classJobLevel = apiMeta.classJobLevel
        const classJobTargetId = apiMeta.classJobTargetId
        const classJobCategoryTargetId = apiMeta.classJobCategoryTargetId
        const actionCategoryTargetId = apiMeta.actionCategoryTargetId
        const isRoleAction = apiMeta.isRoleAction
        const levelMeta = resolveActionMetaByLevel(id, GLOBAL_SKILL_MAX_LEVEL, {
          baseRecast1000ms: apiRecast1000ms,
          baseDuration: 0,
          baseMinLevel: classJobLevel,
          isRoleAction,
        })
        const jobs = levelMeta.jobsFromGlobal.length > 0
          ? levelMeta.jobsFromGlobal
          : resolveActionJobsFromTargets(classJobTargetId, classJobCategoryTargetId, actionCategoryTargetId, isRoleAction)
        const iconSrc = resolveActionIconSrc(id, {
          apiIconPath: typeof response.Icon === 'string' ? response.Icon : undefined,
        }) || ''

        saveAutoMetaToCache(id, {
          id: levelMeta.resolvedId,
          name: resolveActionDisplayName(levelMeta.resolvedId, id, apiMeta.name),
          src: iconSrc,
          duration: levelMeta.duration,
          recast1000ms: levelMeta.recast1000ms,
          minLevel: levelMeta.minLevel,
          jobs,
          classJobTargetId: classJobTargetId > 0 ? classJobTargetId : 0,
          isRoleAction,
        })
      }
      catch (error) {
        console.warn('[keySkill] ensureActionAutoMeta failed:', id, error)
        const levelMeta = resolveActionMetaByLevel(id, GLOBAL_SKILL_MAX_LEVEL, {
          baseRecast1000ms: 0,
          baseDuration: 0,
          baseMinLevel: 1,
          isRoleAction: false,
        })
        saveAutoMetaToCache(id, {
          id: levelMeta.resolvedId,
          name: resolveActionDisplayName(levelMeta.resolvedId, levelMeta.resolvedId),
          src: resolveActionIconSrc(levelMeta.resolvedId),
          duration: levelMeta.duration,
          recast1000ms: levelMeta.recast1000ms,
          minLevel: levelMeta.minLevel,
          jobs: levelMeta.jobsFromGlobal,
          classJobTargetId: 0,
          isRoleAction: false,
        })
      }
      finally {
        refreshedIncompleteAutoMeta.add(id)
        pendingAutoMeta.delete(id)
        pendingAutoMetaTasks.delete(id)
      }
    })()

    pendingAutoMetaTasks.set(id, nextTask)
    await nextTask
  }

  function shouldScheduleEnsureActionAutoMeta(actionId: number) {
    if (!Number.isFinite(actionId) || actionId <= 0)
      return false
    const id = Math.trunc(actionId)

    if (pendingAutoMetaTasks.has(id) || pendingAutoMeta.has(id))
      return false

    const existing = autoMetaById[id]
    if (existing) {
      if (!shouldFetchResolvedActionMeta(
        { jobs: existing.jobs },
        { requireActionCategory: false, requireJobs: true },
      )) {
        return false
      }
      return !refreshedIncompleteAutoMeta.has(id)
    }

    const baked = buildAutoMetaFromBaked(id)
    if (baked && !shouldFetchResolvedActionMeta(
      { jobs: baked.jobs },
      { requireActionCategory: false, requireJobs: true },
    )) {
      saveAutoMetaToCache(id, baked)
      refreshedIncompleteAutoMeta.add(id)
      return false
    }

    return true
  }

  watch(
    () => keySkillsData.value.chinese.map(item => item.id),
    (ids) => {
      uniqueInts(ids.map(v => Number(v))).forEach((id) => {
        if (!shouldScheduleEnsureActionAutoMeta(id))
          return
        void ensureActionAutoMeta(id)
      })
    },
    { immediate: true, deep: true },
  )

  const usedSkills = computed(() => {
    const result: KeySkillEntity[] = []
    const currentParty = computed(() =>
      dev.value || demo.value ? generator.party.value : party.value,
    )

    for (const player of currentParty.value) {
      for (const skill of keySkillsData.value.chinese) {
        const actualLevel = normalizeSkillLevel(player.level || GLOBAL_SKILL_MAX_LEVEL)
        const level = dev.value || demo.value ? levelSyncTestLevel.value : actualLevel
        const meta = resolveMeta(skill.id)
        const displayActionId = normalizeInt(
          resolveUpgradeActionIdForLevel(meta.id, level),
          meta.id,
          1,
        )
        const resolvedJobs = skill.job && skill.job.length > 0 ? uniqueInts(skill.job) : meta.jobs
        const resolvedRecast1000ms = normalizeInt(
          resolveTeamWatchDynamicValue(skill.recast1000ms ?? meta.recast1000ms, level, meta.recast1000ms),
          meta.recast1000ms,
          0,
        )
        const resolvedDuration = normalizeInt(
          resolveTeamWatchDynamicValue(skill.duration ?? meta.duration, level, meta.duration),
          meta.duration,
          0,
        )
        const resolvedMinLevel = resolveActionMinLevel(
          skill.minLevel ?? meta.minLevel,
          {
            actionId: meta.id,
            isRoleAction: meta.isRoleAction,
            fallback: meta.minLevel,
          },
        )

        if (!resolvedJobs.includes(player.job))
          continue
        if (resolvedMinLevel > level)
          continue

        const owner: KeySkillEntity['owner'] = {
          id: player.id,
          name: player.name,
          job: player.job,
          jobIcon: Util.jobEnumToIcon(player.job),
          jobName: Util.jobToFullName(Util.jobEnumToJob(player.job)).simple1,
          hasDuplicate: {
            skill: false,
            job: false,
          },
        }
        const instanceKey = `${player.id}-${meta.id}`
        result.push({
          duration: resolvedDuration,
          id: meta.id,
          owner,
          skillKey: skill.key,
          minLevel: resolvedMinLevel,
          recast1000ms: resolvedRecast1000ms,
          src: resolveActionIconSrc(displayActionId) || meta.src,
          tts: skill.tts,
          line: skill.line,
          job: resolvedJobs,
          instanceKey,
        })
      }
    }

    for (const res of result) {
      res.owner.hasDuplicate = {
        skill: result.some(v => v.id === res.id && v.owner.id !== res.owner.id),
        job: result.some(v => v.owner.job === res.owner.job && v.owner.id !== res.owner.id),
      }
    }

    result.sort((a, b) => {
      const aIndex = keySkillsData.value.chinese.findIndex(v => v.key === a.skillKey)
      const bIndex = keySkillsData.value.chinese.findIndex(v => v.key === b.skillKey)
      if (aIndex === bIndex) {
        return DEFAULT_JOB_SORT_ORDER.indexOf(a.owner.job) - DEFAULT_JOB_SORT_ORDER.indexOf(b.owner.job)
      }
      return aIndex - bIndex
    })
    return result
  })

  function triggerSkill(skillIds: number[], ownerID: string, speak: boolean) {
    const matchedSkills = usedSkills.value.filter(v => skillIds.includes(v.id) && v.owner.id === ownerID)
    if (matchedSkills.length === 0)
      return

    matchedSkills.forEach((skill) => {
      const key = skill.instanceKey
      const { duration, recast1000ms: recast } = skill

      if (skillStates[key]?.rafId)
        cancelAnimationFrame(skillStates[key].rafId)

      const state = reactive<SkillState>({
        startTime: performance.now(),
        isRecast: duration === 0,
        durationLeft: duration,
        recastLeft: recast - duration,
        text: (duration || recast).toString(),
        active: true,
        animationKey: Date.now(),
        clipPercent: 0,
        rafId: undefined,
      })

      const speedValue = speed.value
      const start = performance.now()
      const durationMs = duration * 1000
      const recastMs = (recast - duration) * 1000

      function update() {
        const now = performance.now()
        const elapsed = (now - start) * speedValue
        if (!state.isRecast) {
          if (elapsed < durationMs) {
            const remain = durationMs - elapsed
            state.durationLeft = Math.ceil(remain / 1000)
            state.text = state.durationLeft.toString()
            state.clipPercent = (remain / durationMs) * 100
          }
          else {
            state.isRecast = true
            state.startTime = now
            state.clipPercent = 0
          }
        }
        else {
          const recastElapsed = elapsed - durationMs
          if (recastElapsed < recastMs) {
            const remain = recastMs - recastElapsed
            state.recastLeft = Math.ceil(remain / 1000)
            state.text = state.recastLeft.toString()
            state.clipPercent = (recastElapsed / recastMs) * 100
          }
          else {
            state.text = ''
            state.active = false
            state.isRecast = false
            state.clipPercent = 0
            if (state.rafId)
              cancelAnimationFrame(state.rafId)
            state.rafId = undefined
            Reflect.deleteProperty(skillStates, key)
            return
          }
        }
        state.rafId = requestAnimationFrame(update)
      }

      state.rafId = requestAnimationFrame(update)
      skillStates[key] = state
      if (speak && enableTts.value.chinese)
        tts(skill.tts)
    })
  }

  function wipe() {
    for (const key in skillStates) {
      const state = skillStates[key]
      if (!state)
        continue
      if (state.rafId)
        cancelAnimationFrame(state.rafId)
      state.text = ''
      state.active = false
    }
  }

  function shuffle() {
    generator.shuffle()
  }

  function demoFullParty() {
    generator.fullParty()
  }

  function setSkills(entries: unknown[]) {
    keySkillsData.value.chinese = normalizeStorageSkills(entries)
    keySkillsData.value.chinese.forEach((entry) => {
      void ensureActionAutoMeta(entry.id)
    })
  }

  function resetSkillsToDefault() {
    keySkillsData.value = {
      chinese: defaultSkillEntries.map(skill => createSkillEntry(skill.id, skill.tts, skill.line)),
      mergedIds: [...defaultSkillIds],
    }
    wipe()
    pendingAutoMeta.clear()
    pendingAutoMetaTasks.clear()
    Object.keys(autoMetaById).forEach((key) => {
      Reflect.deleteProperty(autoMetaById, Number(key))
    })
    keySkillsData.value.chinese.forEach((entry) => {
      const cached = normalizeAutoMetaEntry(entry.id, autoMetaCache.value[String(entry.id)])
      if (cached) {
        autoMetaById[entry.id] = cached
        return
      }
      void ensureActionAutoMeta(entry.id)
    })
  }

  return {
    party,
    skillStates,
    dev,
    demo,
    speed,
    levelSyncTestLevel,
    usedSkills,
    triggerSkill,
    wipe,
    shuffle,
    demoFullParty,
    keySkillsData,
    enableTts,
    autoMetaById,
    isAutoMetaLoading,
    ensureActionAutoMeta,
    setSkills,
    resetSkillsToDefault,
  }
})

export { type KeySkillAutoMeta, type SkillState, useKeySkillStore }
