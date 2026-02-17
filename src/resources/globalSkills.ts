import type { DynamicValue } from '@/types/dynamicValue'
import { parseDynamicValue } from '@/utils/dynamicValue'

export interface GlobalSkillDefinition {
  ref: string
  id: DynamicValue
  recast1000ms: DynamicValue
  job: number[]
  minLevel: number
  duration?: DynamicValue
}

const globalSkillDefinitions: GlobalSkillDefinition[] = [
  { ref: 'skill_神圣领域', id: 30, recast1000ms: 420, job: [19], minLevel: 50, duration: 10 },
  { ref: 'skill_死斗', id: 43, recast1000ms: 240, job: [3, 21], minLevel: 42, duration: 10 },
  { ref: 'skill_行尸走肉', id: 3638, recast1000ms: 300, job: [32], minLevel: 50, duration: 10 },
  { ref: 'skill_超火流星', id: 16152, recast1000ms: 360, job: [37], minLevel: 50, duration: 10 },
  { ref: 'skill_天赐', id: 140, recast1000ms: 180, job: [24], minLevel: 50, duration: 0 },
  { ref: 'skill_礼仪之铃', id: 25862, recast1000ms: 180, job: [24], minLevel: 90, duration: 15 },
  { ref: 'skill_跑快快', id: 25868, recast1000ms: 120, job: [28], minLevel: 90, duration: 20 },
  { ref: 'skill_大宇宙', id: 25874, recast1000ms: 180, job: [33], minLevel: 90, duration: 15 },
  { ref: 'skill_牵制', id: 7549, recast1000ms: 90, job: [2, 4, 20, 22, 29, 30, 34, 39, 41], minLevel: 1, duration: '(lv) => lv>=98 ? 15 : 10' },
  { ref: 'skill_昏乱', id: 7560, recast1000ms: 90, job: [7, 25, 26, 27, 35, 36, 42], minLevel: 1, duration: '(lv) => lv>=98 ? 15 : 10' },
  { ref: 'skill_雪愁', id: 7535, recast1000ms: 60, job: [1, 3, 19, 21, 32, 37], minLevel: 1, duration: '(lv) => lv>=98 ? 15 : 10' },
  { ref: 'skill_幕帘', id: 3540, recast1000ms: 90, job: [19], minLevel: 56, duration: 30 },
  { ref: 'skill_大翅膀', id: 7385, recast1000ms: 120, job: [19], minLevel: 70, duration: 5 },
  { ref: 'skill_摆脱', id: 7388, recast1000ms: 90, job: [21], minLevel: 68, duration: 15 },
  { ref: 'skill_布道', id: 16471, recast1000ms: 90, job: [32], minLevel: 66, duration: 15 },
  { ref: 'skill_光心', id: 16160, recast1000ms: 90, job: [37], minLevel: 64, duration: 15 },
  { ref: 'skill_全大赦', id: 7433, recast1000ms: 60, job: [24], minLevel: 70, duration: 10 },
  { ref: 'skill_节制', id: 16536, recast1000ms: 120, job: [24], minLevel: 80, duration: 20 },
  { ref: 'skill_行吟', id: 7405, recast1000ms: '(lv) => lv>=88 ? 90 : 120', job: [23], minLevel: 62, duration: 15 },
  { ref: 'skill_策动', id: 16889, recast1000ms: '(lv) => lv>=88 ? 90 : 120', job: [31], minLevel: 56, duration: 15 },
  { ref: 'skill_武解', id: 2887, recast1000ms: 120, job: [31], minLevel: 62, duration: 10 },
  { ref: 'skill_桑巴', id: 16012, recast1000ms: '(lv) => lv>=88 ? 90 : 120', job: [38], minLevel: 56, duration: 15 },
  { ref: 'skill_抗死', id: 25857, recast1000ms: 120, job: [35], minLevel: 86, duration: 10 },
  { ref: 'skill_战歌', id: 118, recast1000ms: 120, job: [23], minLevel: 50, duration: 20 },
  { ref: 'skill_光神曲', id: 25785, recast1000ms: 110, job: [23], minLevel: 90, duration: 20 },
  { ref: 'skill_背刺', id: '(lv) => lv>=66 ? 36957 : 2248', recast1000ms: 120, job: [30], minLevel: 15, duration: 20 },
  { ref: 'skill_背刺_2', id: 2248, recast1000ms: 120, job: [29], minLevel: 15, duration: 20 },
  { ref: 'skill_神秘环', id: 24405, recast1000ms: 120, job: [39], minLevel: 72, duration: 20 },
  { ref: 'skill_连祷', id: 3557, recast1000ms: 120, job: [22], minLevel: 52, duration: 20 },
  { ref: 'skill_义结金兰', id: 7396, recast1000ms: 120, job: [20], minLevel: 70, duration: 20 },
  { ref: 'skill_灼热之光', id: 25801, recast1000ms: 120, job: [27], minLevel: 66, duration: 20 },
  { ref: 'skill_星空构想', id: 34675, recast1000ms: 120, job: [42], minLevel: 70, duration: 20 },
  { ref: 'skill_连环计', id: 7436, recast1000ms: 120, job: [28], minLevel: 66, duration: 20 },
  { ref: 'skill_鼓励', id: 7520, recast1000ms: 120, job: [35], minLevel: 58, duration: 20 },
  { ref: 'skill_技巧舞步', id: 16196, recast1000ms: 120, job: [38], minLevel: 70, duration: 20 },
  { ref: 'skill_进攻之探戈', id: 16011, recast1000ms: 120, job: [38], minLevel: 62, duration: 20 },
  { ref: 'skill_占卜', id: 16552, recast1000ms: 120, job: [33], minLevel: 50, duration: 20 },
  { ref: 'skill_铁壁', id: 7531, recast1000ms: 90, job: [1, 3, 19, 21, 32, 37], minLevel: 1, duration: 20 },
  { ref: 'skill_即刻咏唱', id: 7561, recast1000ms: '(lv) => lv>=94 ? 40 : 60', job: [6, 24, 27, 28, 33, 40], minLevel: 18 },
  { ref: 'skill_浴血', id: 7542, recast1000ms: 90, job: [2, 4, 20, 22, 29, 30, 34, 39, 41], minLevel: 1, duration: 20 },
  { ref: 'skill_内丹', id: 7541, recast1000ms: 120, job: [2, 4, 5, 20, 22, 23, 29, 30, 31, 34, 38, 39, 41], minLevel: 1 },
  { ref: 'skill_亲疏自行', id: 7548, recast1000ms: 120, job: [1, 2, 3, 4, 5, 19, 20, 21, 22, 23, 29, 30, 31, 32, 34, 37, 38, 39, 41], minLevel: 1, duration: 6 },
  { ref: 'skill_沉稳咏唱', id: 7559, recast1000ms: '120', job: [6, 7, 8, 24, 25, 26, 27, 28, 33, 35, 36, 40, 42], minLevel: 1, duration: 6 },
  { ref: 'skill_预警_剑术师', id: 17, recast1000ms: 120, job: [1], minLevel: 38, duration: 15 },
  { ref: 'skill_预警_极致防御', id: '(lv) => lv>=92 ? 36920 : 17', recast1000ms: 120, job: [19], minLevel: 38, duration: 15 },
  { ref: 'skill_壁垒', id: 22, recast1000ms: 90, job: [19], minLevel: 52, duration: 10 },
  { ref: 'skill_圣盾阵', id: '(lv) => lv>=82 ? 25746 : 3542', recast1000ms: 5, job: [19], minLevel: 35, duration: 8 },
  { ref: 'skill_干预', id: 7382, recast1000ms: 10, job: [19], minLevel: 62, duration: 8 },
  { ref: 'skill_复仇_斧术士', id: 44, recast1000ms: 120, job: [3], minLevel: 38, duration: 15 },
  { ref: 'skill_复仇_戮罪', id: '(lv) => lv>=92 ? 36923 : 44', recast1000ms: 120, job: [21], minLevel: 38, duration: 15 },
  { ref: 'skill_战栗', id: 40, recast1000ms: 90, job: [3, 21], minLevel: 30, duration: 10 },
  { ref: 'skill_泰然自若', id: 3552, recast1000ms: 60, job: [21], minLevel: 58 },
  { ref: 'skill_原初的血气', id: '(lv) => lv>=82 ? 25751 : 3551', recast1000ms: 25, job: [21], minLevel: 56, duration: 8 },
  { ref: 'skill_原初的勇猛', id: 16464, recast1000ms: 25, job: [21], minLevel: 76, duration: 8 },
  { ref: 'skill_暗影卫', id: '(lv) => lv>=92 ? 36927 : 3636', recast1000ms: 120, job: [32], minLevel: 38, duration: 15 },
  { ref: 'skill_弃明投暗', id: 3634, recast1000ms: 60, job: [32], minLevel: 45, duration: 10 },
  { ref: 'skill_至黑之夜', id: 7393, recast1000ms: 15, job: [32], minLevel: 70, duration: 7 },
  { ref: 'skill_献奉', id: 25754, recast1000ms: 60, job: [32], minLevel: 82, duration: 7 },
  { ref: 'skill_大星云', id: '(lv) => lv>=92 ? 36935 : 16148', recast1000ms: 120, job: [37], minLevel: 38, duration: 15 },
  { ref: 'skill_伪装', id: 16140, recast1000ms: 90, job: [37], minLevel: 6, duration: 10 },
  { ref: 'skill_刚玉之心', id: '(lv) => lv>=82 ? 25758 : 16161', recast1000ms: 25, job: [37], minLevel: 68, duration: 8 },
  { ref: 'skill_极光', id: 16151, recast1000ms: 60, job: [37], minLevel: 45 },
  { ref: 'skill_神名', id: 3570, recast1000ms: 60, job: [24], minLevel: 60 },
  { ref: 'skill_神祝祷', id: 7432, recast1000ms: 30, job: [24], minLevel: 66 },
  { ref: 'skill_水流幕', id: 25861, recast1000ms: 60, job: [24], minLevel: 86, duration: 8 },
  { ref: 'skill_秘策', id: 16542, recast1000ms: 90, job: [28], minLevel: 70 },
  { ref: 'skill_展开战术', id: 3585, recast1000ms: 90, job: [28], minLevel: 56 },
  { ref: 'skill_异想的幻光', id: 16538, recast1000ms: 120, job: [28], minLevel: 40, duration: 20 },
  { ref: 'skill_野战治疗阵', id: 188, recast1000ms: 30, job: [28], minLevel: 50, duration: 18 },
  { ref: 'skill_不屈不挠之策', id: 3583, recast1000ms: 30, job: [28], minLevel: 52 },
  { ref: 'skill_深谋远虑之策', id: 7434, recast1000ms: 45, job: [28], minLevel: 62 },
  { ref: 'skill_炽天召唤', id: 16545, recast1000ms: 120, job: [28], minLevel: 80 },
  { ref: 'skill_生命回生法', id: 25867, recast1000ms: 60, job: [28], minLevel: 86 },
  { ref: 'skill_炽天附体', id: 37014, recast1000ms: 180, job: [28], minLevel: 100 },
  { ref: 'skill_先天禀赋', id: 3614, recast1000ms: 40, job: [33], minLevel: 15 },
  { ref: 'skill_命运之轮', id: 3613, recast1000ms: 60, job: [33], minLevel: 58, duration: 10 },
  { ref: 'skill_天星冲日', id: 16553, recast1000ms: 60, job: [33], minLevel: 60, duration: 15 },
  { ref: 'skill_地星', id: 7439, recast1000ms: 60, job: [33], minLevel: 62, duration: 10 },
  { ref: 'skill_天星交错', id: 16556, recast1000ms: 30, job: [33], minLevel: 74 },
  { ref: 'skill_天宫图', id: 16557, recast1000ms: 60, job: [33], minLevel: 76 },
  { ref: 'skill_中间学派', id: 16559, recast1000ms: 120, job: [33], minLevel: 80 },
  { ref: 'skill_擢升', id: 25873, recast1000ms: 60, job: [33], minLevel: 86 },
  { ref: 'skill_坚角清汁', id: 24298, recast1000ms: 30, job: [40], minLevel: 50, duration: 15 },
  { ref: 'skill_寄生清汁', id: 24299, recast1000ms: 30, job: [40], minLevel: 52 },
  { ref: 'skill_白牛清汁', id: 24303, recast1000ms: 45, job: [40], minLevel: 62 },
  { ref: 'skill_输血', id: 24305, recast1000ms: 120, job: [40], minLevel: 70 },
  { ref: 'skill_泛输血', id: 24311, recast1000ms: 120, job: [40], minLevel: 80 },
  { ref: 'skill_整体论', id: 24310, recast1000ms: 120, job: [40], minLevel: 76, duration: 20 },
  { ref: 'skill_活化', id: 24300, recast1000ms: '(lv) => lv>=88 ? 90 : 120', job: [40], minLevel: 56 },
  { ref: 'skill_魂灵风息', id: 24318, recast1000ms: 120, job: [40], minLevel: 90 },
  { ref: 'skill_智慧之爱', id: 37035, recast1000ms: 180, job: [40], minLevel: 100 },
  { ref: 'skill_金刚极意', id: 7394, recast1000ms: 120, job: [20], minLevel: 64 },
  { ref: 'skill_金刚周天', id: 7394, recast1000ms: 120, job: [20], minLevel: 64 },
  { ref: 'skill_真言', id: 65, recast1000ms: 90, job: [2, 20], minLevel: 42 },
  { ref: 'skill_残影', id: 2241, recast1000ms: 120, job: [29, 30], minLevel: 2 },
  { ref: 'skill_天眼通', id: '(lv) => lv>=82 ? 36962 : 7498', recast1000ms: 15, job: [34], minLevel: 6, duration: 4 },
  { ref: 'skill_神秘纹', id: 24404, recast1000ms: 30, job: [39], minLevel: 40 },
  { ref: 'skill_大地神的抒情恋歌', id: 7408, recast1000ms: 120, job: [23], minLevel: 66 },
  { ref: 'skill_治疗之华尔兹', id: 16015, recast1000ms: 60, job: [38], minLevel: 52 },
  { ref: 'skill_即兴表演', id: 16014, recast1000ms: 120, job: [38], minLevel: 80 },
  { ref: 'skill_魔罩', id: 157, recast1000ms: 120, job: [7, 25], minLevel: 40 },
  { ref: 'skill_以太步', id: 155, recast1000ms: 10, job: [25], minLevel: 50 },
  { ref: 'skill_守护之光', id: 25799, recast1000ms: 60, job: [26, 27], minLevel: 2 },
  { ref: 'skill_坦培拉涂层', id: 34685, recast1000ms: 120, job: [42], minLevel: 10 },
]

const globalSkillDefinitionMap = new Map(globalSkillDefinitions.map(definition => [definition.ref, definition]))

const GLOBAL_SKILL_MAX_LEVEL = 100

export interface GlobalSkillMeta {
  id: DynamicValue
  recast1000ms: DynamicValue
  duration: DynamicValue
  minLevel: number
  job: number[]
}

function resolveActionId(value: DynamicValue, level: number): number {
  try {
    const resolved = parseDynamicValue(value, level)
    if (!Number.isFinite(resolved) || resolved <= 0)
      return 0
    return Math.trunc(resolved)
  }
  catch {
    return 0
  }
}

function uniqueJobs(jobs: number[] | undefined): number[] {
  if (!Array.isArray(jobs))
    return []
  return [...new Set(jobs
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && v > 0)
    .map(v => Math.trunc(v)))]
}

const globalSkillMetaMap = (() => {
  const map = new Map<number, GlobalSkillMeta>()

  globalSkillDefinitions.forEach((definition) => {
    for (let level = 1; level <= GLOBAL_SKILL_MAX_LEVEL; level += 1) {
      const actionId = resolveActionId(definition.id, level)
      if (actionId <= 0)
        continue

      const previous = map.get(actionId)
      if (!previous) {
        map.set(actionId, {
          id: definition.id,
          recast1000ms: definition.recast1000ms,
          duration: definition.duration ?? 0,
          minLevel: definition.minLevel,
          job: uniqueJobs(definition.job),
        })
        continue
      }

      map.set(actionId, {
        id: previous.id,
        recast1000ms: previous.recast1000ms,
        duration: previous.duration,
        minLevel: Math.min(previous.minLevel, definition.minLevel),
        job: uniqueJobs([...previous.job, ...definition.job]),
      })
    }
  })

  return map
})()

export function getGlobalSkillDefinitionByRef(ref: string): GlobalSkillDefinition | undefined {
  const found = globalSkillDefinitionMap.get(ref)
  return found ? { ...found, job: [...found.job] } : undefined
}

export function getGlobalSkillMetaByActionId(actionId: number): GlobalSkillMeta | undefined {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return undefined
  const normalized = Math.trunc(actionId)
  const found = globalSkillMetaMap.get(normalized)
  return found ? { ...found, job: [...found.job] } : undefined
}

export { globalSkillDefinitions }
