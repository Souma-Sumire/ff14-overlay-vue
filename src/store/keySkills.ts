import type { Party } from 'cactbot/types/event'
import type { KeySkillEntity } from '@/types/keySkill'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { useDemo } from '@/composables/useDemo'
import { useDev } from '@/composables/useDev'
import { RandomPartyGenerator } from '@/mock/demoParty'
import { actionResourcesLoaded } from '@/resources/actionChinese'
import { raidbuffs } from '@/resources/raidbuffs'
import { idToSrc, parseDynamicValue } from '@/utils/dynamicValue'
import { tts } from '@/utils/tts'
import Util from '@/utils/util'

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

const generator = new RandomPartyGenerator()

const useKeySkillStore = defineStore('keySkill', () => {
  const dev = useDev()
  const demo = useDemo()

  const party = ref<Party[]>([])

  // 版本管理：用于自动合并开发者新增的默认技能
  const keySkillsData = useStorage('keySkills-fix', { chinese: [...raidbuffs] })

  // 自动合并逻辑：每当开发者在 raidbuffs.ts 中新增了默认技能，
  // 用户的本地存储会自动检测到这些通过 key 标识的新技能并将其追加。
  // 自动合并逻辑：
  // 1. 迁移与去重：保留用户的第一份数据（可能是魔改过的），将其 Key 更新为静态 Key，并移除后续重复项
  const defaultSkillMap = new Map<number | string, string>(
    raidbuffs.map(s => [s.id, s.key]),
  )
  const seenDefaultIds = new Set<number | string>()

  keySkillsData.value.chinese = keySkillsData.value.chinese.reduce(
    (acc, skill) => {
      // 检查是否为默认提供的技能 ID
      if (defaultSkillMap.has(skill.id)) {
        if (seenDefaultIds.has(skill.id)) {
          // 如果该 ID 已经添加过一次，说明后续的都是 Bug 产生的重复项，直接丢弃
          return acc
        }
        // 第一次遇到该默认技能（保留这份数据，因为它是最早的，可能包含用户修改）
        seenDefaultIds.add(skill.id)

        // 【关键】执行迁移：如果 Key 还是旧的 UUID，强制更新为新的静态 Key
        // 这样既保留了用户的配置（TTS/时间等），又修复了 Key 不一致的问题
        const staticKey = defaultSkillMap.get(skill.id)!
        if (skill.key !== staticKey) {
          skill.key = staticKey
        }
        acc.push(skill)
        return acc
      }

      // 用户自定义的技能（ID 不在默认列表中），直接保留
      acc.push(skill)
      return acc
    },
    [] as typeof keySkillsData.value.chinese,
  )

  // 2. 补全缺失的默认技能（针对新版本新增的默认技能）
  const userCurrentKeys = new Set(
    keySkillsData.value.chinese.map(s => s.key),
  )
  const newDefaultSkills = raidbuffs.filter(s => !userCurrentKeys.has(s.key))

  if (newDefaultSkills.length > 0) {
    keySkillsData.value.chinese = [
      ...keySkillsData.value.chinese,
      ...newDefaultSkills,
    ]
  }

  const enableTts = useStorage('keySkills-enable-tts', { chinese: true })
  const skillStates = reactive<Record<string, SkillState>>({})

  const speed = ref(1)

  const usedSkills = computed(() => {
    // 确保 actionResourcesLoaded 变化时重新计算
    // eslint-disable-next-line ts/no-unused-expressions
    actionResourcesLoaded.value

    const result: KeySkillEntity[] = []
    const currentParty = computed(() =>
      dev.value || demo.value ? generator.party.value : party.value,
    )

    for (const player of currentParty.value) {
      for (const skill of keySkillsData.value.chinese) {
        if (
          skill.job.includes(player.job)
          && (player.level === undefined || skill.minLevel <= player.level)
        ) {
          const duration = parseDynamicValue(
            skill.duration,
            player.level || 999,
          )
          const id = parseDynamicValue(skill.id, player.level || 999)
          const recast1000ms = parseDynamicValue(
            skill.recast1000ms,
            player.level || 999,
          )
          const minLevel = parseDynamicValue(
            skill.minLevel,
            player.level || 999,
          )
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
          const skillKey = skill.key
          const instanceKey = `${player.id}-${id}`
          const src = idToSrc(id)
          const tts = skill.tts
          const line = skill.line
          const job = skill.job
          result.push({
            duration,
            id,
            owner,
            skillKey,
            minLevel,
            recast1000ms,
            src,
            tts,
            line,
            job,
            instanceKey,
          })
        }
      }
    }
    for (const res of result) {
      res.owner.hasDuplicate = {
        skill: result.some(
          v => v.id === res.id && v.owner.id !== res.owner.id,
        ),
        job: result.some(
          v => v.owner.job === res.owner.job && v.owner.id !== res.owner.id,
        ),
      }
    }

    result.sort((a, b) => {
      const aIndex = keySkillsData.value.chinese.findIndex(
        v => v.key === a.skillKey,
      )
      const bIndex = keySkillsData.value.chinese.findIndex(
        v => v.key === b.skillKey,
      )
      if (aIndex === bIndex) {
        return Util.enumSortMethod(a.owner.job, b.owner.job)
      }
      return aIndex - bIndex
    })
    return result
  })

  function triggerSkill(skillIds: number[], ownerID: string, speak: boolean) {
    const skill = usedSkills.value.find(
      v => skillIds.includes(v.id) && v.owner.id === ownerID,
    )
    if (!skill)
      return

    const key = skill.instanceKey
    const { duration, recast1000ms: recast } = skill

    // 取消之前动画
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
        // 持续时间阶段
        if (elapsed < durationMs) {
          const remain = durationMs - elapsed
          state.durationLeft = Math.ceil(remain / 1000)
          state.text = state.durationLeft.toString()
          state.clipPercent = (remain / durationMs) * 100
        }
        else {
          // 进入冷却阶段
          state.isRecast = true
          state.startTime = now
          state.clipPercent = 0
        }
      }
      else {
        // 冷却阶段
        const recastElapsed = elapsed - durationMs
        if (recastElapsed < recastMs) {
          const remain = recastMs - recastElapsed
          state.recastLeft = Math.ceil(remain / 1000)
          state.text = state.recastLeft.toString()
          state.clipPercent = (recastElapsed / recastMs) * 100
        }
        else {
          // 动画结束
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
    if (speak && enableTts.value.chinese) {
      tts(skill.tts)
    }
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
    generator.fullPary()
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
  }
})

export { type SkillState, useKeySkillStore }
