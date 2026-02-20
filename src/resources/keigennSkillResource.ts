import type { DynamicValue } from '@/types/dynamicValue'
import type { KeigennSkill, Scope } from '@/types/keigennRecord2'
import { getGlobalSkillDefinitionById } from '@/resources/globalSkills'
import { resolveBakedActionMeta } from '@/resources/logic/actionMetaResolver'

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
  { id: 25754, scope: 'party' },
  { id: 36935, scope: 'self' },
  { id: 16140, scope: 'self' },
  { id: 25758, scope: 'party' },
  { id: 16151, scope: 'party' },
  { id: 3570, scope: 'party' },
  { id: 7432, scope: 'party' },
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
  { id: 3614, scope: 'party' },
  { id: 3613, scope: 'party' },
  { id: 16553, scope: 'party' },
  { id: 7439, scope: 'party' },
  { id: 16556, scope: 'party' },
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
  { id: 7394, scope: 'other' },
  { id: 65, scope: 'party' },
  { id: 2241, scope: 'self' },
  { id: 36962, scope: 'self' },
  { id: 24404, scope: 'self' },
  { id: 7408, scope: 'party' },
  { id: 16015, scope: 'party' },
  { id: 16014, scope: 'party' },
  { id: 157, scope: 'self' },
  { id: 155, scope: 'self' },
  { id: 25799, scope: 'self' },
  { id: 34685, scope: 'party' },
]

const keigennSkills: KeigennSkill[] = keigennSkillDefinitions
  .map((definition) => {
    const shared = getGlobalSkillDefinitionById(definition.id)
    const api = resolveBakedActionMeta(definition.id)

    if (!shared && !api)
      return undefined

    let recast = definition.recast1000ms ?? shared?.recast1000ms
    if (recast === undefined && api)
      recast = Math.round(api.recast1000ms)

    let jobs = definition.job ?? shared?.job
    if ((!jobs || jobs.length === 0) && api)
      jobs = api.jobs

    let minLevel = definition.minLevel ?? shared?.minLevel
    if (minLevel === undefined && api)
      minLevel = api.classJobLevel

    const skill: KeigennSkill = {
      id: definition.id,
      recast1000ms: recast ?? 0,
      job: [...(jobs ?? [])],
      minLevel: minLevel ?? 1,
      scope: definition.scope,
    }

    if (definition.duration !== undefined)
      skill.duration = definition.duration
    else if (shared?.duration !== undefined)
      skill.duration = shared.duration

    if (definition.maxCharges !== undefined)
      skill.maxCharges = definition.maxCharges
    else if (api && api.maxCharges > 0)
      skill.maxCharges = api.maxCharges
    else if (shared?.maxCharges !== undefined)
      skill.maxCharges = shared.maxCharges

    if (definition.overrideIconId !== undefined)
      skill.overrideIconId = definition.overrideIconId
    else if (shared?.overrideIconId !== undefined)
      skill.overrideIconId = shared.overrideIconId
    else if (api && api.iconId > 0)
      skill.overrideIconId = api.iconId

    return skill
  })
  .filter((skill): skill is KeigennSkill => Boolean(skill))

export { keigennSkillDefinitions, keigennSkills }
