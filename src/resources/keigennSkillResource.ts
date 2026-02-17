import type { DynamicValue } from '@/types/dynamicValue'
import type { KeigennSkill, Scope } from '@/types/keigennRecord2'
import { getGlobalSkillDefinitionByRef } from '@/resources/globalSkills'

interface KeigennSkillDefinition {
  ref: string
  id?: DynamicValue
  recast1000ms?: DynamicValue
  job?: number[]
  minLevel?: number
  duration?: DynamicValue
  scope: Scope
  maxCharges?: DynamicValue
  overrideIconId?: number
}

const keigennSkillDefinitions: KeigennSkillDefinition[] = [
  { ref: 'skill_神圣领域', scope: 'party' },
  { ref: 'skill_死斗', scope: 'party' },
  { ref: 'skill_行尸走肉', scope: 'party' },
  { ref: 'skill_超火流星', scope: 'party' },
  { ref: 'skill_天赐', scope: 'party' },
  { ref: 'skill_礼仪之铃', scope: 'party' },
  { ref: 'skill_跑快快', scope: 'party' },
  { ref: 'skill_大宇宙', scope: 'party' },
  { ref: 'skill_牵制', scope: 'party' },
  { ref: 'skill_昏乱', scope: 'party' },
  { ref: 'skill_雪愁', scope: 'party' },
  { ref: 'skill_幕帘', scope: 'party' },
  { ref: 'skill_大翅膀', scope: 'party' },
  { ref: 'skill_摆脱', scope: 'party' },
  { ref: 'skill_布道', scope: 'party' },
  { ref: 'skill_光心', scope: 'party' },
  { ref: 'skill_全大赦', scope: 'party' },
  { ref: 'skill_节制', scope: 'party' },
  { ref: 'skill_行吟', scope: 'party' },
  { ref: 'skill_策动', scope: 'party' },
  { ref: 'skill_武解', scope: 'party' },
  { ref: 'skill_桑巴', scope: 'party' },
  { ref: 'skill_抗死', scope: 'party' },
  { ref: 'skill_铁壁', scope: 'self' },
  { ref: 'skill_即刻咏唱', scope: 'party' },
  { ref: 'skill_浴血', scope: 'self' },
  { ref: 'skill_内丹', scope: 'self' },
  { ref: 'skill_亲疏自行', scope: 'self' },
  { ref: 'skill_沉稳咏唱', scope: 'self' },
  { ref: 'skill_预警_剑术师', scope: 'self' },
  { ref: 'skill_预警_极致防御', scope: 'self' },
  { ref: 'skill_壁垒', scope: 'self' },
  { ref: 'skill_圣盾阵', scope: 'self' },
  { ref: 'skill_干预', scope: 'other' },
  { ref: 'skill_复仇_斧术士', scope: 'self' },
  { ref: 'skill_复仇_戮罪', scope: 'self' },
  { ref: 'skill_战栗', scope: 'self' },
  { ref: 'skill_泰然自若', scope: 'self' },
  { ref: 'skill_原初的血气', scope: 'self' },
  { ref: 'skill_原初的勇猛', scope: 'other' },
  { ref: 'skill_暗影卫', scope: 'self' },
  { ref: 'skill_弃明投暗', scope: 'self' },
  { ref: 'skill_至黑之夜', scope: 'party' },
  { ref: 'skill_献奉', scope: 'party', maxCharges: 2 },
  { ref: 'skill_大星云', scope: 'self' },
  { ref: 'skill_伪装', scope: 'self' },
  { ref: 'skill_刚玉之心', scope: 'party' },
  { ref: 'skill_极光', scope: 'party', maxCharges: '(lv) => lv>=84 ? 2 : 1' },
  { ref: 'skill_神名', scope: 'party', maxCharges: '(lv) => lv>=98 ? 2 : 1' },
  { ref: 'skill_神祝祷', scope: 'party', maxCharges: '(lv) => lv>=98 ? 2 : 1' },
  { ref: 'skill_水流幕', scope: 'party' },
  { ref: 'skill_秘策', scope: 'party' },
  { ref: 'skill_展开战术', scope: 'party' },
  { ref: 'skill_异想的幻光', scope: 'party' },
  { ref: 'skill_野战治疗阵', scope: 'party' },
  { ref: 'skill_不屈不挠之策', scope: 'party' },
  { ref: 'skill_深谋远虑之策', scope: 'party' },
  { ref: 'skill_炽天召唤', scope: 'party' },
  { ref: 'skill_生命回生法', scope: 'party' },
  { ref: 'skill_炽天附体', scope: 'party' },
  { ref: 'skill_先天禀赋', scope: 'party', maxCharges: '(lv) => lv>=78 ? (lv>=98 ? 3 : 2) : 1' },
  { ref: 'skill_命运之轮', scope: 'party' },
  { ref: 'skill_天星冲日', scope: 'party' },
  { ref: 'skill_地星', scope: 'party' },
  { ref: 'skill_天星交错', scope: 'party', maxCharges: '(lv) => lv>=88 ? 2 : 1' },
  { ref: 'skill_天宫图', scope: 'party' },
  { ref: 'skill_中间学派', scope: 'party' },
  { ref: 'skill_擢升', scope: 'party' },
  { ref: 'skill_坚角清汁', scope: 'party' },
  { ref: 'skill_寄生清汁', scope: 'party' },
  { ref: 'skill_白牛清汁', scope: 'party' },
  { ref: 'skill_输血', scope: 'party' },
  { ref: 'skill_泛输血', scope: 'party' },
  { ref: 'skill_整体论', scope: 'party' },
  { ref: 'skill_活化', scope: 'party' },
  { ref: 'skill_魂灵风息', scope: 'party' },
  { ref: 'skill_智慧之爱', scope: 'party' },
  { ref: 'skill_金刚极意', scope: 'self' },
  { ref: 'skill_金刚周天', scope: 'other', overrideIconId: 36944 },
  { ref: 'skill_真言', scope: 'party' },
  { ref: 'skill_残影', scope: 'self' },
  { ref: 'skill_天眼通', scope: 'self' },
  { ref: 'skill_神秘纹', scope: 'self' },
  { ref: 'skill_大地神的抒情恋歌', scope: 'party' },
  { ref: 'skill_治疗之华尔兹', scope: 'party' },
  { ref: 'skill_即兴表演', scope: 'party' },
  { ref: 'skill_魔罩', scope: 'self' },
  { ref: 'skill_以太步', scope: 'self' },
  { ref: 'skill_守护之光', scope: 'self', maxCharges: '(lv) => lv>=88 ? 2 : 1' },
  { ref: 'skill_坦培拉涂层', scope: 'party' },
]

const keigennSkills: KeigennSkill[] = keigennSkillDefinitions
  .map((definition) => {
    const shared = getGlobalSkillDefinitionByRef(definition.ref)
    if (!shared)
      return undefined

    const skill: KeigennSkill = {
      id: definition.id ?? shared.id,
      recast1000ms: definition.recast1000ms ?? shared.recast1000ms,
      job: [...(definition.job ?? shared.job)],
      minLevel: definition.minLevel ?? shared.minLevel,
      scope: definition.scope,
    }

    if (definition.duration !== undefined)
      skill.duration = definition.duration
    else if (shared.duration !== undefined)
      skill.duration = shared.duration
    if (definition.maxCharges !== undefined)
      skill.maxCharges = definition.maxCharges
    if (definition.overrideIconId !== undefined)
      skill.overrideIconId = definition.overrideIconId

    return skill
  })
  .filter((skill): skill is KeigennSkill => Boolean(skill))

export { keigennSkillDefinitions, keigennSkills }
