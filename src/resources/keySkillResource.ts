import type { DynamicValue } from '@/types/dynamicValue'
import type { KeySkill } from '@/types/keySkill'
import { getGlobalSkillDefinitionById } from '@/resources/globalSkills'

interface KeySkillDefinition {
  id: number
  recast1000ms?: DynamicValue
  job?: number[]
  minLevel?: number
  duration?: DynamicValue
  tts: string
  line: number
}

const keySkillDefinitions: KeySkillDefinition[] = [
  { id: 30, tts: '', line: 1 },
  { id: 43, tts: '', line: 1 },
  { id: 3638, tts: '', line: 1 },
  { id: 16152, tts: '', line: 1 },
  { id: 140, tts: '天赐', line: 1 },
  { id: 25862, tts: '礼仪之铃', line: 1 },
  { id: 25868, tts: '跑快快', line: 1 },
  { id: 25874, tts: '大宇宙', line: 1 },
  { id: 7549, tts: '牵制', line: 2 },
  { id: 7560, tts: '昏乱', line: 2 },
  { id: 7535, tts: '雪愁', line: 2 },
  { id: 3540, tts: '幕帘', line: 2 },
  { id: 7385, tts: '大翅膀', line: 2 },
  { id: 7388, tts: '摆脱', line: 2 },
  { id: 16471, tts: '布道', line: 2 },
  { id: 16160, tts: '光心', line: 2 },
  { id: 7433, tts: '全大赦', line: 2 },
  { id: 16536, tts: '节制', line: 2 },
  { id: 7405, tts: '行吟', line: 2 },
  { id: 16889, tts: '策动', line: 2 },
  { id: 2887, tts: '武解', line: 2 },
  { id: 16012, tts: '桑巴', line: 2 },
  { id: 25857, tts: '抗死', line: 2 },
  { id: 118, tts: '战歌', line: 3 },
  { id: 25785, tts: '光神曲', line: 3 },
  { id: 36957, tts: '背刺', line: 3 },
  { id: 24405, tts: '神秘环', line: 3 },
  { id: 3557, tts: '连祷', line: 3 },
  { id: 7396, tts: '义结金兰', line: 3 },
  { id: 25801, tts: '灼热之光', line: 3 },
  { id: 34675, tts: '星空构想', line: 3 },
  { id: 7436, tts: '连环计', line: 3 },
  { id: 7520, tts: '鼓励', line: 3 },
  { id: 16196, tts: '技巧舞', line: 3 },
  { id: 16011, tts: '探戈', line: 3 },
  { id: 16552, tts: '占卜', line: 3 },
]

const raidbuffs: KeySkill[] = keySkillDefinitions
  .map((definition) => {
    const shared = getGlobalSkillDefinitionById(definition.id)
    if (!shared)
      return undefined

    return {
      key: `skill_${definition.id}`,
      id: definition.id,
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
