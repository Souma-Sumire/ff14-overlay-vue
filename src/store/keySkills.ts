import type { Party } from 'cactbot/types/event'
import type { KeySkillEntity } from '@/types/keySkill'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { useDemo } from '@/composables/useDemo'
import { useDev } from '@/composables/useDev'
import { RandomPartyGenerator } from '@/mock/demoParty'
import { getActionChinese } from '@/resources/actionChinese'
import { getGlobalSkillMetaByActionId } from '@/resources/globalSkills'
import { DEFAULT_JOB_SORT_ORDER } from '@/resources/jobSortOrder'
import { raidbuffs } from '@/resources/keySkillResource'
import { ROLE_ACTION_CATEGORY_BY_JOB } from '@/resources/roleActionCategoryByJob'
import { resolveTeamWatchDynamicValue } from '@/resources/teamWatchResource'
import { idToSrc } from '@/utils/dynamicValue'
import { tts } from '@/utils/tts'
import Util from '@/utils/util'
import { getIconSrcByPath, parseAction } from '@/utils/xivapi'

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
}

interface DefaultKeySkillEntry {
  id: number
  tts: string
  line: number
}

const generator = new RandomPartyGenerator()

function normalizeInt(value: number, fallback: number, min = 0) {
  if (!Number.isFinite(value))
    return fallback
  return Math.max(min, Math.trunc(value))
}

function uniqueInts(input: number[]) {
  return [...new Set(input.filter(v => Number.isFinite(v) && v > 0).map(v => Math.trunc(v)))]
}

function buildDefaultSkillEntries() {
  const map = new Map<number, DefaultKeySkillEntry>()
  raidbuffs.forEach((skill) => {
    const resolvedId = normalizeInt(resolveTeamWatchDynamicValue(skill.id, 100, 0), 0, 0)
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

function normalizeStorageSkills(raw: unknown): KeySkillEntry[] {
  if (!Array.isArray(raw))
    return []

  const normalized: KeySkillEntry[] = []
  raw.forEach((item) => {
    if (!item || typeof item !== 'object')
      return
    const row = item as Record<string, unknown>
    const resolvedId = normalizeInt(resolveTeamWatchDynamicValue(row.id as number | string, 100, 0), 0, 0)
    if (resolvedId <= 0)
      return
    const key = typeof row.key === 'string' && row.key.trim() ? row.key : crypto.randomUUID()
    const line = normalizeInt(Number(row.line ?? 1), 1, 1)
    const ttsText = typeof row.tts === 'string' ? row.tts : ''
    normalized.push({
      key,
      id: resolvedId,
      line,
      tts: ttsText,
    })
  })
  return normalized
}

function resolveJobsFromApi(classJobTargetId: number, actionCategoryTargetId: number, isRoleAction: boolean) {
  const battleJobEnums = Util.getBattleJobs()
    .filter(job => job !== 'NONE')
    .filter(job => Util.isCombatJob(job))
    .map(job => Util.jobToJobEnum(job))

  if (isRoleAction && actionCategoryTargetId > 0) {
    return uniqueInts(
      battleJobEnums.filter((jobEnum) => {
        const categories = ROLE_ACTION_CATEGORY_BY_JOB[jobEnum] ?? []
        return categories.includes(actionCategoryTargetId)
      }),
    )
  }

  if (classJobTargetId <= 0)
    return []

  return uniqueInts(
    battleJobEnums.filter((jobEnum) => {
      return jobEnum === classJobTargetId
        || Util.baseJobEnumConverted(jobEnum) === classJobTargetId
        || Util.baseJobEnumConverted(classJobTargetId) === jobEnum
    }),
  )
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
  const missingDefaults = defaultSkillEntries.filter(skill => !mergedSet.has(skill.id))
  if (missingDefaults.length > 0) {
    keySkillsData.value.chinese.push(
      ...missingDefaults.map(skill => createSkillEntry(skill.id, skill.tts, skill.line)),
    )
    keySkillsData.value.mergedIds.push(...missingDefaults.map(skill => skill.id))
  }

  const enableTts = useStorage('keySkills-enable-tts', { chinese: true })
  const skillStates = reactive<Record<string, SkillState>>({})
  const speed = ref(1)

  const autoMetaById = reactive<Record<number, KeySkillAutoMeta>>({})
  const pendingAutoMeta = new Set<number>()

  function resolveMeta(actionId: number): KeySkillAutoMeta {
    const cached = autoMetaById[actionId]
    if (cached)
      return cached

    return {
      id: actionId,
      name: getActionChinese(actionId) || `#${actionId}`,
      src: idToSrc(actionId),
      duration: 0,
      recast1000ms: 0,
      minLevel: 1,
      jobs: [],
    }
  }

  async function ensureActionAutoMeta(actionId: number) {
    if (!Number.isFinite(actionId) || actionId <= 0)
      return
    const id = Math.trunc(actionId)
    if (autoMetaById[id] || pendingAutoMeta.has(id))
      return

    const globalMeta = getGlobalSkillMetaByActionId(id)

    pendingAutoMeta.add(id)
    try {
      const response = await parseAction('action', id, [
        'ID',
        'Name',
        'Icon',
        'Recast100ms',
        'ClassJobLevel',
        'ClassJobTargetID',
        'ActionCategoryTargetID',
        'IsRoleAction',
      ])
      const recast100ms = Number(response.Recast100ms ?? 0)
      const apiRecast1000ms = Number.isFinite(recast100ms) && recast100ms > 0 ? recast100ms / 10 : 0
      const classJobLevel = normalizeInt(Number(response.ClassJobLevel ?? 1), 1, 1)
      const classJobTargetId = normalizeInt(Number(response.ClassJobTargetID ?? 0), 0, 0)
      const actionCategoryTargetId = normalizeInt(Number(response.ActionCategoryTargetID ?? 0), 0, 0)
      const isRoleAction = Number(response.IsRoleAction ?? 0) > 0
      const jobs = (globalMeta?.job?.length ?? 0) > 0
        ? uniqueInts(globalMeta!.job)
        : resolveJobsFromApi(classJobTargetId, actionCategoryTargetId, isRoleAction)
      const resolvedId = normalizeInt(
        resolveTeamWatchDynamicValue(globalMeta?.id ?? id, 100, id),
        id,
        1,
      )
      const resolvedRecast1000ms = normalizeInt(
        resolveTeamWatchDynamicValue(globalMeta?.recast1000ms ?? apiRecast1000ms, 100, apiRecast1000ms),
        apiRecast1000ms,
        0,
      )
      const resolvedDuration = normalizeInt(
        resolveTeamWatchDynamicValue(globalMeta?.duration ?? 0, 100, 0),
        0,
        0,
      )
      const resolvedMinLevel = isRoleAction ? 1 : classJobLevel
      const iconSrcById = idToSrc(id)
      const iconSrc = iconSrcById
        || (typeof response.Icon === 'string' && response.Icon
          ? getIconSrcByPath(response.Icon)
          : '')

      autoMetaById[id] = {
        id: resolvedId,
        name: response.Name ?? getActionChinese(resolvedId) ?? `#${resolvedId}`,
        src: iconSrc,
        duration: resolvedDuration,
        recast1000ms: resolvedRecast1000ms,
        minLevel: resolvedMinLevel,
        jobs,
      }
    }
    catch (error) {
      console.warn('[keySkill] ensureActionAutoMeta failed:', id, error)
      autoMetaById[id] = {
        id,
        name: getActionChinese(id) || `#${id}`,
        src: idToSrc(id),
        duration: 0,
        recast1000ms: 0,
        minLevel: 1,
        jobs: [],
      }
    }
    finally {
      pendingAutoMeta.delete(id)
    }
  }

  watch(
    () => keySkillsData.value.chinese.map(item => item.id),
    (ids) => {
      ids.forEach((id) => {
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
        const meta = resolveMeta(skill.id)
        if (!meta.jobs.includes(player.job))
          continue
        if (player.level !== undefined && meta.minLevel > player.level)
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
          duration: meta.duration,
          id: meta.id,
          owner,
          skillKey: skill.key,
          minLevel: meta.minLevel,
          recast1000ms: meta.recast1000ms,
          src: meta.src,
          tts: skill.tts || meta.name,
          line: skill.line,
          job: meta.jobs,
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
    const skill = usedSkills.value.find(v => skillIds.includes(v.id) && v.owner.id === ownerID)
    if (!skill)
      return

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
    keySkillsData.value.chinese = defaultSkillEntries.map(skill => createSkillEntry(skill.id, skill.tts, skill.line))
    keySkillsData.value.mergedIds = [...defaultSkillIds]
  }

  return {
    party,
    skillStates,
    dev,
    demo,
    speed,
    usedSkills,
    triggerSkill,
    wipe,
    shuffle,
    demoFullParty,
    keySkillsData,
    enableTts,
    autoMetaById,
    ensureActionAutoMeta,
    setSkills,
    resetSkillsToDefault,
  }
})

export { type KeySkillAutoMeta, type SkillState, useKeySkillStore }
