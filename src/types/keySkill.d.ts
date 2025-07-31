import type { FFIcon } from '@/types/fflogs'

type DynamicValue<T> = T | ((level: number) => T)

interface KeySkill {
  id: DynamicValue<number>
  tts: string
  duration: DynamicValue<number>
  recast1000ms: DynamicValue<number>
  job: number[]
  line: number
  level: number
  icon: number
}

interface KeySkillEntity {
  key: string
  id: number
  tts: string
  duration: number
  recast1000ms: number
  job: number[]
  line: number
  level: number
  icon: number
  owner: {
    id: string
    name: string
    jobIcon: FFIcon
    jobName: string
    hasDuplicate: boolean
  }
}

export { DynamicValue, KeySkill, KeySkillEntity }
