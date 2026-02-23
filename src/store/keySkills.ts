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
import { getGlobalSkillDefinitionById, resolveActionDisplayName, resolveActionIconSrc, resolveActionJobsFromTargets, resolveActionMetaByLevel, resolveActionMinLevel, resolveApiActionMeta, resolveBakedActionMeta, uniqueInts } from '@/resources/logic/actionMetaResolver'
import { resolveUpgradeActionIdForLevel } from '@/utils/compareSaveAction'
import { parseDynamicValue } from '@/utils/dynamicValue'
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
  maxCharges?: DynamicValue
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
  maxCharges: number
  isRoleAction: boolean
}

const KEY_SKILLS_AUTO_META_CACHE_VERSION_STORAGE_KEY = 'keySkills-auto-meta-cache-version'
const LEGACY_PRESET_2248_KEY = 'preset_2248'

function normalizeAutoMetaCache(raw: Record<string, KeySkillAutoMeta>): Record<number, KeySkillAutoMeta> {
  const output: Record<number, KeySkillAutoMeta> = {}
  Object.entries(raw).forEach(([key, value]) => {
    if (!value)
      return
    const id = Number(key) || 0
    if (id <= 0)
      return
    const name = typeof value.name === 'string' ? value.name.trim() : ''
    const src = typeof value.src === 'string' ? value.src.trim() : ''
    const jobs = uniqueInts(Array.isArray(value.jobs) ? value.jobs : [])
    // 字段缺失则淘汰
    if (!name || !src || !jobs.length)
      return
    const isRoleAction = !!value.isRoleAction
    output[id] = {
      id: Number(value.id) || id,
      name,
      src,
      duration: Number(value.duration) || 0,
      recast1000ms: Number(value.recast1000ms) || 0,
      isRoleAction,
      minLevel: resolveActionMinLevel(value.minLevel ?? 1, { actionId: id, isRoleAction, fallback: 1 }),
      jobs,
      classJobTargetId: Number(value.classJobTargetId) || 0,
      maxCharges: Number(value.maxCharges) || 1,
    }
  })
  return output
}

const generator = new RandomPartyGenerator()

function buildDefaultSkillEntries() {
  const map = new Map<number, Pick<KeySkillEntry, 'id' | 'tts' | 'line'>>()
  raidbuffs.forEach((skill) => {
    const id = Number(parseDynamicValue(skill.id, GLOBAL_SKILL_MAX_LEVEL)) || 0
    if (id <= 0 || map.has(id))
      return
    map.set(id, { id, tts: String(skill.tts || ''), line: Number(skill.line) || 1 })
  })
  return [...map.values()]
}

function createSkillEntry(id: number, tts = '', line = 1): KeySkillEntry {
  return { key: crypto.randomUUID(), id, tts, line: Number(line) || 1 }
}

function normalizeStorageSkills(raw: KeySkillEntry[]): KeySkillEntry[] {
  return raw.flatMap((item) => {
    if (!item)
      return []
    const id = Number(parseDynamicValue(item.id as DynamicValue, GLOBAL_SKILL_MAX_LEVEL)) || 0
    const key = (typeof item.key === 'string' && item.key.trim()) ? item.key : crypto.randomUUID()
    if (id <= 0 || key === LEGACY_PRESET_2248_KEY)
      return []
    return [{ ...item, key, id, line: Number(item.line) || 1, tts: item.tts ?? '' }]
  })
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

  levelSyncTestLevel.value = Math.min(GLOBAL_SKILL_MAX_LEVEL, Math.max(1, Math.trunc(levelSyncTestLevel.value) || GLOBAL_SKILL_MAX_LEVEL))
  watch(levelSyncTestLevel, (value) => {
    const normalized = Math.min(GLOBAL_SKILL_MAX_LEVEL, Math.max(1, Math.trunc(value) || GLOBAL_SKILL_MAX_LEVEL))
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

  function isApiCached(id: number): boolean {
    return !!autoMetaCache.value[String(id)]
  }

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
    const id = Math.trunc(actionId) || 0
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
      maxCharges: baked.maxCharges,
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
      maxCharges: 1,
      isRoleAction: false,
    }
  }

  async function ensureActionAutoMeta(actionId: number) {
    if (!Number.isFinite(actionId) || actionId <= 0)
      return
    const id = Math.trunc(actionId)

    const baked = buildAutoMetaFromBaked(id)
    if (baked) {
      autoMetaById[id] = baked
      return
    }

    if (isApiCached(id)) {
      if (!autoMetaById[id]) {
        const cached = autoMetaCache.value[String(id)]
        if (cached)
          autoMetaById[id] = cached
      }
      return
    }
    if (refreshedIncompleteAutoMeta.has(id))
      return
    const task = pendingAutoMetaTasks.get(id)
    if (task) {
      await task
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
          'MaxCharges',
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
          maxCharges: apiMeta.maxCharges,
          isRoleAction,
        })
      }
      catch (error) {
        console.warn('[keySkill] ensureActionAutoMeta failed:', id, error)
        // 失败时仅更新内存展示，不写 localStorage（避免缓存錺误数据）
        const baked = buildAutoMetaFromBaked(id)
        if (baked)
          autoMetaById[id] = baked
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

  watch(
    () => keySkillsData.value.chinese.map(item => item.id),
    (ids) => {
      uniqueInts(ids.map(Number)).forEach((id) => {
        if (pendingAutoMetaTasks.has(id) || pendingAutoMeta.has(id))
          return
        if (isApiCached(id))
          return
        if (refreshedIncompleteAutoMeta.has(id))
          return
        // baked 仅作内存展示占位，不写 localStorage
        const baked = buildAutoMetaFromBaked(id)
        if (baked)
          autoMetaById[id] = baked
        void ensureActionAutoMeta(id)
      })
    },
    { immediate: true, deep: true },
  )

  const usedSkills = computed(() => {
    const currentParty = dev.value || demo.value ? generator.party.value : party.value
    const result: KeySkillEntity[] = []

    for (const player of currentParty) {
      const level = dev.value || demo.value ? levelSyncTestLevel.value : Math.min(GLOBAL_SKILL_MAX_LEVEL, Math.max(1, Math.trunc(player.level) || GLOBAL_SKILL_MAX_LEVEL))
      for (const skill of keySkillsData.value.chinese) {
        const meta = resolveMeta(skill.id)
        const globalMeta = getGlobalSkillDefinitionById(skill.id)
        const displayId = resolveUpgradeActionIdForLevel(meta.id, level) || meta.id

        const resolvedJobs = skill.job?.length ? uniqueInts(skill.job) : meta.jobs
        if (!resolvedJobs.includes(player.job))
          continue

        const recastInput = skill.recast1000ms ?? globalMeta?.recast1000ms
        const resolvedRecast = (recastInput !== undefined ? parseDynamicValue(recastInput, level) : 0) || meta.recast1000ms
        const durInput = skill.duration ?? globalMeta?.duration
        const resolvedDuration = (durInput !== undefined ? parseDynamicValue(durInput, level) : 0) || meta.duration
        const chargesInput = skill.maxCharges ?? globalMeta?.maxCharges
        const resolvedMaxCharges = (chargesInput !== undefined ? parseDynamicValue(chargesInput, level) : 1) || 1

        const resolvedMinLevel = resolveActionMinLevel(skill.minLevel ?? meta.minLevel, { actionId: meta.id, isRoleAction: meta.isRoleAction, fallback: meta.minLevel })
        if (resolvedMinLevel > level)
          continue

        result.push({
          duration: resolvedDuration,
          id: meta.id,
          owner: {
            id: player.id,
            name: player.name,
            job: player.job,
            jobIcon: Util.jobEnumToIcon(player.job),
            jobName: Util.jobToFullName(Util.jobEnumToJob(player.job)).simple1,
            hasDuplicate: { skill: false, job: false },
          },
          skillKey: skill.key,
          minLevel: resolvedMinLevel,
          recast1000ms: resolvedRecast,
          src: resolveActionIconSrc(displayId) || meta.src,
          tts: skill.tts,
          line: skill.line,
          job: resolvedJobs,
          maxCharges: resolvedMaxCharges,
          instanceKey: `${player.id}-${meta.id}`,
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

  function setSkills(entries: KeySkillEntry[]) {
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
    Object.keys(autoMetaById).forEach(key => Reflect.deleteProperty(autoMetaById, Number(key)))
    keySkillsData.value.chinese.forEach((entry) => {
      const key = String(entry.id)
      const cached = autoMetaCache.value[key]
        ? normalizeAutoMetaCache({ [key]: autoMetaCache.value[key]! })[entry.id]
        : undefined
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

export { type KeySkillAutoMeta, type KeySkillEntry, type SkillState, useKeySkillStore }
