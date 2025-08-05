import type { FFIcon } from '@/types/fflogs'

type DynamicValue = number | string

interface KeySkill {
  // 此key是对于技能来说的，而不是技能的具体实例
  key: string
  id: DynamicValue
  tts: string
  duration: DynamicValue
  recast1000ms: DynamicValue
  job: number[]
  line: number
  minLevel: number
}

interface KeySkillEntity {
  // 此key是对于技能来说的，而不是技能的具体实例
  skillKey: string
  // 此key是对于某个具体玩家的技能实例来说的，同一个技能可能有多个实例
  instanceKey: string
  id: number
  tts: string
  duration: number
  recast1000ms: number
  job: number[]
  line: number
  minLevel: number
  src: string
  owner: {
    id: string
    name: string
    job: number
    jobIcon: FFIcon
    jobName: string
    hasDuplicate: {
      skill: boolean
      job: boolean
    }
  }
}

export { DynamicValue, KeySkill, KeySkillEntity }
