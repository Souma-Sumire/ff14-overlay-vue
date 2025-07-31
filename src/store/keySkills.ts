import type { Party } from 'cactbot/types/event'
import type { KeySkillEntity } from '@/types/keySkill'
import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { useDemo } from '@/composables/useDemo'
import { useDev } from '@/composables/useDev'
import { RandomPartyGenerator } from '@/mock/demoKeySkillParty'
import { useKeySkill } from '@/resources/raidbuffs'
import { tts } from '@/utils/tts'
import Util from '@/utils/util'

interface SkillState {
  startTime: number | null
  isRecast: boolean
  durationLeft: number
  recastLeft: number
  interval?: number
  text: string
  active: boolean
  animationKey: number
}

const { keySkills, loadData } = useKeySkill()

const generator = new RandomPartyGenerator(8)

function isFunctionValue<T, Args extends any[] = any[]>(value: T | ((...args: Args) => T)): value is (...args: Args) => T {
  return typeof value === 'function'
}

const useKeySkillStore = defineStore('keySkill', () => {
  const dev = useDev()
  const demo = useDemo()

  const party = ref<Party[]>([])
  const skillStates = reactive<Record<string, SkillState>>({})

  const speed = computed(() => (dev.value || demo.value) ? 5 : 1)

  const usedSkills = computed(() => {
    const result: KeySkillEntity[] = []
    const currentParty = computed(() => (dev.value || demo.value) ? generator.party.value : party.value)

    for (const player of currentParty.value) {
      for (const skill of keySkills.value) {
        if ((skill.job.includes(player.job)) && (player.level === undefined || skill.level <= player.level)) {
          const duration = isFunctionValue(skill.duration) ? skill.duration(player.level || 999) : skill.duration
          const id = isFunctionValue(skill.id) ? skill.id(player.level || 999) : skill.id
          const recast1000ms = isFunctionValue(skill.recast1000ms) ? skill.recast1000ms(player.level || 999) : skill.recast1000ms
          const level = isFunctionValue(skill.level) ? skill.level(player.level || 999) : skill.level
          const owner: KeySkillEntity['owner'] = {
            id: player.id,
            name: player.name,
            jobIcon: Util.jobEnumToIcon(player.job),
            jobName: Util.jobToFullName(Util.jobEnumToJob(player.job)).simple1,
            hasDuplicate: false,
          }
          const key = `${id}-${player.id}`
          result.push({ ...skill, duration, id, owner, key, level, recast1000ms })
        }
      }
    }

    for (const res of result) {
      res.owner.hasDuplicate = result.some(v => v.id === res.id && v.owner.id !== res.owner.id)
    }

    result.sort((a, b) => keySkills.value.findIndex(v => v.id === a.id) - keySkills.value.findIndex(v => v.id === b.id))
    return result
  })

  function triggerSkill(skillId: number, ownerID: string) {
    const skill = usedSkills.value.find(v => v.id === skillId && v.owner.id === ownerID)
    if (!skill)
      return

    const key = skill.key
    const { duration, recast1000ms: recast } = skill

    if (skillStates[key]?.interval)
      clearInterval(skillStates[key].interval)

    const state = reactive<SkillState>({
      startTime: Date.now(),
      isRecast: duration === 0,
      durationLeft: duration,
      recastLeft: recast - duration,
      text: (duration || recast).toString(),
      active: true,
      animationKey: Date.now(),
    })

    state.interval = window.setInterval(() => {
      if (!state.isRecast) {
        state.durationLeft--
        if (state.durationLeft <= 0) {
          state.isRecast = true
        }
        state.text = state.durationLeft.toString()
      }
      else {
        state.recastLeft--
        state.text = state.recastLeft.toString()
        if (state.recastLeft <= 0) {
          clearInterval(state.interval)
          state.interval = undefined
          state.text = ''
          state.isRecast = false
          state.active = false
          Reflect.deleteProperty(skillStates, skillId)
        }
      }
    }, 1000 / speed.value)

    skillStates[key] = state
    tts(skill.tts)
  }

  function wipe() {
    for (const key in skillStates) {
      const state = skillStates[key]
      if (!state)
        continue
      clearInterval(state.interval)
      state.interval = undefined
      state.text = ''
      state.active = false
    }
  }

  function shuffle() {
    generator.shuffle()
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
    loadData,
    shuffle,
  }
})

export { type SkillState, useKeySkillStore }
