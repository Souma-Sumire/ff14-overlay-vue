import type { DynamicValue } from '@/types/dynamicValue'
import type { KeigennSkill, Scope } from '@/types/keigennRecord2'
import { getGlobalSkillDefinitionById } from '@/resources/globalSkills'

interface KeigennSkillDefinition {
  id: number
  recast1000ms?: DynamicValue
  job?: number[]
  minLevel?: number
  duration?: DynamicValue
  scope: Scope
  maxCharges?: DynamicValue
  overrideIconId?: number
}

const keigennSkillDefinitions: KeigennSkillDefinition[] = [
  { id: 30, scope: 'party' },
  { id: 43, scope: 'party' },
  { id: 3638, scope: 'party' },
  { id: 16152, scope: 'party' },
  { id: 140, scope: 'party' },
  { id: 25862, scope: 'party' },
  { id: 25868, scope: 'party' },
  { id: 25874, scope: 'party' },
  { id: 7549, scope: 'party' },
  { id: 7560, scope: 'party' },
  { id: 7535, scope: 'party' },
  { id: 3540, scope: 'party' },
  { id: 7385, scope: 'party' },
  { id: 7388, scope: 'party' },
  { id: 16471, scope: 'party' },
  { id: 16160, scope: 'party' },
  { id: 7433, scope: 'party' },
  { id: 16536, scope: 'party' },
  { id: 7405, scope: 'party' },
  { id: 16889, scope: 'party' },
  { id: 2887, scope: 'party' },
  { id: 16012, scope: 'party' },
  { id: 25857, scope: 'party' },
  { id: 7531, scope: 'self' },
  { id: 7561, scope: 'party' },
  { id: 7542, scope: 'self' },
  { id: 7541, scope: 'self' },
  { id: 7548, scope: 'self' },
  { id: 7559, scope: 'self' },
  { id: 17, scope: 'self' },
  { id: 36920, scope: 'self' },
  { id: 22, scope: 'self' },
  { id: 25746, scope: 'self' },
  { id: 7382, scope: 'other' },
  { id: 44, scope: 'self' },
  { id: 36923, scope: 'self' },
  { id: 40, scope: 'self' },
  { id: 3552, scope: 'self' },
  { id: 25751, scope: 'self' },
  { id: 16464, scope: 'other' },
  { id: 36927, scope: 'self' },
  { id: 3634, scope: 'self' },
  { id: 7393, scope: 'party' },
  { id: 25754, scope: 'party', maxCharges: 2 },
  { id: 36935, scope: 'self' },
  { id: 16140, scope: 'self' },
  { id: 25758, scope: 'party' },
  { id: 16151, scope: 'party', maxCharges: '(lv) => lv>=84 ? 2 : 1' },
  { id: 3570, scope: 'party', maxCharges: '(lv) => lv>=98 ? 2 : 1' },
  { id: 7432, scope: 'party', maxCharges: '(lv) => lv>=98 ? 2 : 1' },
  { id: 25861, scope: 'party' },
  { id: 16542, scope: 'party' },
  { id: 3585, scope: 'party' },
  { id: 16538, scope: 'party' },
  { id: 188, scope: 'party' },
  { id: 3583, scope: 'party' },
  { id: 7434, scope: 'party' },
  { id: 16545, scope: 'party' },
  { id: 25867, scope: 'party' },
  { id: 37014, scope: 'party' },
  { id: 3614, scope: 'party', maxCharges: '(lv) => lv>=78 ? (lv>=98 ? 3 : 2) : 1' },
  { id: 3613, scope: 'party' },
  { id: 16553, scope: 'party' },
  { id: 7439, scope: 'party' },
  { id: 16556, scope: 'party', maxCharges: '(lv) => lv>=88 ? 2 : 1' },
  { id: 16557, scope: 'party' },
  { id: 16559, scope: 'party' },
  { id: 25873, scope: 'party' },
  { id: 24298, scope: 'party' },
  { id: 24299, scope: 'party' },
  { id: 24303, scope: 'party' },
  { id: 24305, scope: 'party' },
  { id: 24311, scope: 'party' },
  { id: 24310, scope: 'party' },
  { id: 24300, scope: 'party' },
  { id: 24318, scope: 'party' },
  { id: 37035, scope: 'party' },
  { id: 7394, scope: 'self' },
  { id: 7394, scope: 'other', overrideIconId: 36944 },
  { id: 65, scope: 'party' },
  { id: 2241, scope: 'self' },
  { id: 36962, scope: 'self' },
  { id: 24404, scope: 'self' },
  { id: 7408, scope: 'party' },
  { id: 16015, scope: 'party' },
  { id: 16014, scope: 'party' },
  { id: 157, scope: 'self' },
  { id: 155, scope: 'self' },
  { id: 25799, scope: 'self', maxCharges: '(lv) => lv>=88 ? 2 : 1' },
  { id: 34685, scope: 'party' },
]

const keigennSkills: KeigennSkill[] = keigennSkillDefinitions
  .map((definition) => {
    const shared = getGlobalSkillDefinitionById(definition.id)
    if (!shared)
      return undefined

    const skill: KeigennSkill = {
      id: definition.id,
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
