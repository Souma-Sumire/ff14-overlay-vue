import type { Party } from 'cactbot/types/event'
import type { KeySkillEntity } from '@/types/keySkill'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { useDemo } from '@/composables/useDemo'
import { useDev } from '@/composables/useDev'
import { RandomPartyGenerator } from '@/mock/demoKeySkillParty'
import { skillChinese, skillGlobal } from '@/resources/raidbuffs'
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
  const keySkillsData = useStorage('keySkills', { chinese: skillChinese, global: skillGlobal })
  const language = ref<'chinese' | 'global'>('chinese')
  const skillStates = reactive<Record<string, SkillState>>({})

  const loadedSkills = computed(() => keySkillsData.value[language.value])

  const speed = ref(1)

  const usedSkills = computed(() => {
    const result: KeySkillEntity[] = []
    const currentParty = computed(() => (dev.value || demo.value) ? generator.party.value : party.value)

    for (const player of currentParty.value) {
      for (const skill of loadedSkills.value) {
        if ((skill.job.includes(player.job)) && (player.level === undefined || (skill.minLevel <= player.level))) {
          const duration = parseDynamicValue(skill.duration, player.level || 999)
          const id = parseDynamicValue(skill.id, player.level || 999)
          const recast1000ms = parseDynamicValue(skill.recast1000ms, player.level || 999)
          const minLevel = parseDynamicValue(skill.minLevel, player.level || 999)
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
          const key = `${player.id}-${id}`
          const src = idToSrc(id)
          const tts = skill.tts
          const line = skill.line
          const job = skill.job
          result.push({ duration, id, owner, key, minLevel, recast1000ms, src, tts, line, job })
        }
      }
    }
    for (const res of result) {
      res.owner.hasDuplicate = {
        skill: result.some(v => v.id === res.id && v.owner.id !== res.owner.id),
        job: result.some(v => v.owner.job === res.owner.job && v.owner.id !== res.owner.id),
      }
    }

    result.sort((a, b) => {
      const aIndex = loadedSkills.value.findIndex(v => v.id === a.id)
      const bIndex = loadedSkills.value.findIndex(v => v.id === b.id)
      if (aIndex === bIndex) {
        return Util.enumSortMethod(a.owner.job, b.owner.job)
      }
      return aIndex - bIndex
    })
    return result
  })

  function triggerSkill(skillId: number, ownerID: string, speak: boolean) {
    const skill = usedSkills.value.find(v => v.id === skillId && v.owner.id === ownerID)
    if (!skill)
      return

    const key = skill.key
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
    const durationMs = (duration) * 1000
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
    if (speak) {
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
    language,
    keySkillsData,
  }
})

export { type SkillState, useKeySkillStore }
