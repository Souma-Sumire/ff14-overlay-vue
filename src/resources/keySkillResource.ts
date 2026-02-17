import type { DynamicValue } from '@/types/dynamicValue'
import type { KeySkill } from '@/types/keySkill'
import { getGlobalSkillDefinitionByRef } from '@/resources/globalSkills'

interface KeySkillDefinition {
  ref: string
  id?: DynamicValue
  recast1000ms?: DynamicValue
  job?: number[]
  minLevel?: number
  duration?: DynamicValue
  tts: string
  line: number
}

const keySkillDefinitions: KeySkillDefinition[] = [
  { ref: 'skill_神圣领域', tts: '', line: 1 },
  { ref: 'skill_死斗', tts: '', line: 1 },
  { ref: 'skill_行尸走肉', tts: '', line: 1 },
  { ref: 'skill_超火流星', tts: '', line: 1 },
  { ref: 'skill_天赐', tts: '天赐', line: 1 },
  { ref: 'skill_礼仪之铃', tts: '礼仪之铃', line: 1 },
  { ref: 'skill_跑快快', tts: '跑快快', line: 1 },
  { ref: 'skill_大宇宙', tts: '大宇宙', line: 1 },
  { ref: 'skill_牵制', tts: '牵制', line: 2 },
  { ref: 'skill_昏乱', tts: '昏乱', line: 2 },
  { ref: 'skill_雪愁', tts: '雪愁', line: 2 },
  { ref: 'skill_幕帘', tts: '幕帘', line: 2 },
  { ref: 'skill_大翅膀', tts: '大翅膀', line: 2 },
  { ref: 'skill_摆脱', tts: '摆脱', line: 2 },
  { ref: 'skill_布道', tts: '布道', line: 2 },
  { ref: 'skill_光心', tts: '光心', line: 2 },
  { ref: 'skill_全大赦', tts: '全大赦', line: 2 },
  { ref: 'skill_节制', tts: '节制', line: 2 },
  { ref: 'skill_行吟', tts: '行吟', line: 2 },
  { ref: 'skill_策动', tts: '策动', line: 2 },
  { ref: 'skill_武解', tts: '武解', line: 2 },
  { ref: 'skill_桑巴', tts: '桑巴', line: 2 },
  { ref: 'skill_抗死', tts: '抗死', line: 2 },
  { ref: 'skill_战歌', tts: '战歌', line: 3 },
  { ref: 'skill_光神曲', tts: '光神曲', line: 3 },
  { ref: 'skill_背刺', tts: '背刺', line: 3 },
  { ref: 'skill_背刺_2', tts: '背刺', line: 3 },
  { ref: 'skill_神秘环', tts: '神秘环', line: 3 },
  { ref: 'skill_连祷', tts: '连祷', line: 3 },
  { ref: 'skill_义结金兰', tts: '义结金兰', line: 3 },
  { ref: 'skill_灼热之光', tts: '灼热之光', line: 3 },
  { ref: 'skill_星空构想', tts: '星空构想', line: 3 },
  { ref: 'skill_连环计', tts: '连环计', line: 3 },
  { ref: 'skill_鼓励', tts: '鼓励', line: 3 },
  { ref: 'skill_技巧舞步', tts: '技巧舞', line: 3 },
  { ref: 'skill_进攻之探戈', tts: '探戈', line: 3 },
  { ref: 'skill_占卜', tts: '占卜', line: 3 },
]

const raidbuffs: KeySkill[] = keySkillDefinitions
  .map((definition) => {
    const shared = getGlobalSkillDefinitionByRef(definition.ref)
    if (!shared)
      return undefined

    return {
      key: definition.ref,
      id: definition.id ?? shared.id,
      tts: definition.tts,
      duration: definition.duration ?? shared.duration ?? 0,
      recast1000ms: definition.recast1000ms ?? shared.recast1000ms,
      job: [...(definition.job ?? shared.job)],
      line: definition.line,
      minLevel: definition.minLevel ?? shared.minLevel,
    }
  })
  .filter((skill): skill is KeySkill => Boolean(skill))

export { keySkillDefinitions, raidbuffs }
