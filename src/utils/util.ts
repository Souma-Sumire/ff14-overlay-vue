import type { Job, Role } from '../../cactbot/types/job'
import type { FFIcon as Icon } from '../types/fflogs'

const iconToJobEnum: Record<Icon, number> = {
  NONE: 0,
  Gladiator: 1,
  Pugilist: 2,
  Marauder: 3,
  Lancer: 4,
  Archer: 5,
  Conjurer: 6,
  Thaumaturge: 7,
  Carpenter: 8,
  Blacksmith: 9,
  Armorer: 10,
  Goldsmith: 11,
  Leatherworker: 12,
  Weaver: 13,
  Alchemist: 14,
  Culinarian: 15,
  Miner: 16,
  Botanist: 17,
  Fisher: 18,
  Paladin: 19,
  Monk: 20,
  Warrior: 21,
  Dragoon: 22,
  Bard: 23,
  WhiteMage: 24,
  BlackMage: 25,
  Arcanist: 26,
  Summoner: 27,
  Scholar: 28,
  Rogue: 29,
  Ninja: 30,
  Machinist: 31,
  DarkKnight: 32,
  Astrologian: 33,
  Samurai: 34,
  RedMage: 35,
  BlueMage: 36,
  Gunbreaker: 37,
  Dancer: 38,
  Reaper: 39,
  Sage: 40,
  Viper: 41,
  Pictomancer: 42,
}

const nameToJobEnum: Record<Job, number> = {
  NONE: 0,
  GLA: 1,
  PGL: 2,
  MRD: 3,
  LNC: 4,
  ARC: 5,
  CNJ: 6,
  THM: 7,
  CRP: 8,
  BSM: 9,
  ARM: 10,
  GSM: 11,
  LTW: 12,
  WVR: 13,
  ALC: 14,
  CUL: 15,
  MIN: 16,
  BTN: 17,
  FSH: 18,
  PLD: 19,
  MNK: 20,
  WAR: 21,
  DRG: 22,
  BRD: 23,
  WHM: 24,
  BLM: 25,
  ACN: 26,
  SMN: 27,
  SCH: 28,
  ROG: 29,
  NIN: 30,
  MCH: 31,
  DRK: 32,
  AST: 33,
  SAM: 34,
  RDM: 35,
  BLU: 36,
  GNB: 37,
  DNC: 38,
  RPR: 39,
  SGE: 40,
  VPR: 41,
  PCT: 42,
}

const baseJob = [
  'GLA', // 剑术师
  'MRD', // 斧术师
  'CNJ', // 幻术师
  'ROG', // 双剑师
  'PGL', // 格斗家
  'LNC', // 枪术师
  'ARC', // 弓箭手
  'ACN', // 秘术师
  'THM', // 咒术师
]

const baseJobEnumConverted: Record<number, number> = {
  1: 19, // 剑术师 - 骑士
  3: 21, // 斧术师 - 战士
  6: 24, // 幻术师 - 白魔法师
  29: 30, // 双剑师 - 忍者
  2: 20, // 格斗家 - 武僧
  4: 22, // 枪术师 - 龙骑士
  5: 23, // 弓箭手 - 吟游诗人
  26: 27, // 秘术师 - 召唤师
  7: 25, // 咒术师 - 黑魔法师
} as const

const jobEnumOrder = [
  3, // MRD 斧术师
  21, // WAR 战士
  1, // GLA 剑术师
  32, // DRK 暗黑骑士
  37, // GNB 绝枪战士
  19, // PLD 骑士
  6, // CNJ 幻术师
  24, // WHM 白魔法师
  33, // AST 占星术士
  40, // SGE 贤者
  28, // SCH 学者
  34, // SAM 武士
  29, // ROG 双剑师
  30, // NIN 忍者
  39, // RPR 钐镰客
  4, // LNC 枪术师
  22, // DRG 龙骑士
  2, // PGL 格斗家
  20, // MNK 武僧
  41, // VPR 蛇武士
  5, // ARC 弓箭手
  23, // BRD 吟游诗人
  31, // MCH 机工士
  38, // DNC 舞者
  7, // THM 咒术师
  25, // BLM 黑魔法师
  26, // ACN 秘术师
  27, // SMN 召唤师
  35, // RDM 赤魔法师
  42, // PCT 绘灵法师
  36, // BLU 青魔法师
  8, // CRP 刻木匠
  9, // BSM 锻铁匠
  10, // ARM 铸甲匠
  11, // GSM 雕金匠
  12, // LTW 制革匠
  13, // WVR 裁衣匠
  14, // ALC 炼金术士
  15, // CUL 烹调师
  16, // MIN 采矿工
  17, // BTN 园艺工
  18, // FSH 捕鱼人
  0, // NONE 冒险者
]

const nameToFullName: Record<
  Job,
  { en: string, ja: string, cn: string, simple1: string, simple2: string }
> = {
  NONE: {
    en: 'Adventurer',
    ja: 'すっぴん士',
    cn: '冒险者',
    simple1: '冒',
    simple2: '冒险',
  },
  GLA: {
    en: 'Gladiator',
    ja: '剣術士',
    cn: '剑术师',
    simple1: '剑',
    simple2: '剑术',
  },
  PGL: {
    en: 'Pugilist',
    ja: '格闘士',
    cn: '格斗家',
    simple1: '斗',
    simple2: '格斗',
  },
  MRD: {
    en: 'Marauder',
    ja: '斧術士',
    cn: '斧术师',
    simple1: '斧',
    simple2: '斧术',
  },
  LNC: {
    en: 'Lancer',
    ja: '槍術士',
    cn: '枪术师',
    simple1: '枪',
    simple2: '枪术',
  },
  ARC: {
    en: 'Archer',
    ja: '弓術士',
    cn: '弓箭手',
    simple1: '弓',
    simple2: '弓箭',
  },
  CNJ: {
    en: 'Conjurer',
    ja: '幻術士',
    cn: '幻术师',
    simple1: '幻',
    simple2: '幻术',
  },
  THM: {
    en: 'Thaumaturge',
    ja: '呪術士',
    cn: '咒术师',
    simple1: '咒',
    simple2: '咒术',
  },
  CRP: {
    en: 'Carpenter',
    ja: '木工師',
    cn: '刻木匠',
    simple1: '刻',
    simple2: '刻木',
  },
  BSM: {
    en: 'Blacksmith',
    ja: '鍛冶師',
    cn: '锻铁匠',
    simple1: '锻',
    simple2: '锻铁',
  },
  ARM: {
    en: 'Armorer',
    ja: '甲冑師',
    cn: '铸甲匠',
    simple1: '铸',
    simple2: '铸甲',
  },
  GSM: {
    en: 'Goldsmith',
    ja: '彫金師',
    cn: '雕金匠',
    simple1: '雕',
    simple2: '雕金',
  },
  LTW: {
    en: 'Leatherworker',
    ja: '革細工師',
    cn: '制革匠',
    simple1: '革',
    simple2: '制革',
  },
  WVR: {
    en: 'Weaver',
    ja: '裁縫師',
    cn: '裁衣匠',
    simple1: '裁',
    simple2: '裁衣',
  },
  ALC: {
    en: 'Alchemist',
    ja: '錬金術師',
    cn: '炼金术士',
    simple1: '炼',
    simple2: '炼金',
  },
  CUL: {
    en: 'Culinarian',
    ja: '調理師',
    cn: '烹调师',
    simple1: '烹',
    simple2: '烹调',
  },
  MIN: {
    en: 'Miner',
    ja: '採掘師',
    cn: '采矿工',
    simple1: '采',
    simple2: '采矿',
  },
  BTN: {
    en: 'Botanist',
    ja: '園芸師',
    cn: '园艺工',
    simple1: '园',
    simple2: '园艺',
  },
  FSH: {
    en: 'Fisher',
    ja: '漁師',
    cn: '捕鱼人',
    simple1: '捕',
    simple2: '捕鱼',
  },
  PLD: {
    en: 'Paladin',
    ja: 'ナイト',
    cn: '骑士',
    simple1: '骑',
    simple2: '骑士',
  },
  MNK: {
    en: 'Monk',
    ja: 'モンク',
    cn: '武僧',
    simple1: '僧',
    simple2: '武僧',
  },
  WAR: {
    en: 'Warrior',
    ja: '戦士',
    cn: '战士',
    simple1: '战',
    simple2: '战士',
  },
  DRG: {
    en: 'Dragoon',
    ja: '竜騎士',
    cn: '龙骑士',
    simple1: '龙',
    simple2: '龙骑',
  },
  BRD: {
    en: 'Bard',
    ja: '吟遊詩人',
    cn: '吟游诗人',
    simple1: '诗',
    simple2: '诗人',
  },
  WHM: {
    en: 'White Mage',
    ja: '白魔道士',
    cn: '白魔法师',
    simple1: '白',
    simple2: '白魔',
  },
  BLM: {
    en: 'Black Mage',
    ja: '黒魔道士',
    cn: '黑魔法师',
    simple1: '黑',
    simple2: '黑魔',
  },
  ACN: {
    en: 'Arcanist',
    ja: '巴術士',
    cn: '秘术师',
    simple1: '秘',
    simple2: '秘术',
  },
  SMN: {
    en: 'Summoner',
    ja: '召喚士',
    cn: '召唤师',
    simple1: '召',
    simple2: '召唤',
  },
  SCH: {
    en: 'Scholar',
    ja: '学者',
    cn: '学者',
    simple1: '学',
    simple2: '学者',
  },
  ROG: {
    en: 'Rogue',
    ja: '双剣士',
    cn: '双剑师',
    simple1: '双',
    simple2: '双剑',
  },
  NIN: {
    en: 'Ninja',
    ja: '忍者',
    cn: '忍者',
    simple1: '忍',
    simple2: '忍者',
  },
  MCH: {
    en: 'Machinist',
    ja: '機工士',
    cn: '机工士',
    simple1: '机',
    simple2: '机工',
  },
  DRK: {
    en: 'Dark Knight',
    ja: '暗黒騎士',
    cn: '暗黑骑士',
    simple1: '暗',
    simple2: '暗骑',
  },
  AST: {
    en: 'Astrologian',
    ja: '占星術師',
    cn: '占星术士',
    simple1: '占',
    simple2: '占星',
  },
  SAM: {
    en: 'Samurai',
    ja: '侍',
    cn: '武士',
    simple1: '武',
    simple2: '武士',
  },
  RDM: {
    en: 'Red Mage',
    ja: '赤魔道士',
    cn: '赤魔法师',
    simple1: '赤',
    simple2: '赤魔',
  },
  BLU: {
    en: 'Blue Mage',
    ja: '青魔道士',
    cn: '青魔法师',
    simple1: '青',
    simple2: '青魔',
  },
  GNB: {
    en: 'Gunbreaker',
    ja: 'ガンブレイカー',
    cn: '绝枪战士',
    simple1: '绝',
    simple2: '绝枪',
  },
  DNC: {
    en: 'Dancer',
    ja: '踊り子',
    cn: '舞者',
    simple1: '舞',
    simple2: '舞者',
  },
  RPR: {
    en: 'Reaper',
    ja: 'リーパー',
    cn: '钐镰客',
    simple1: '镰',
    simple2: '钐镰',
  },
  SGE: {
    en: 'Sage',
    ja: '賢者',
    cn: '贤者',
    simple1: '贤',
    simple2: '贤者',
  },
  VPR: {
    en: 'Viper',
    ja: 'ヴァイパー',
    cn: '蛇武士',
    simple1: '蛇',
    simple2: '蛇武',
  },
  PCT: {
    en: 'Pictomancer',
    ja: 'ピクトマンサー',
    cn: '绘灵法师',
    simple1: '绘',
    simple2: '绘灵',
  },
}
const allJobs = Object.keys(nameToJobEnum) as Job[]
const allIcons = Object.keys(iconToJobEnum) as Icon[]
const allRoles = [
  'tank',
  'healer',
  'dps',
  'crafter',
  'gatherer',
  'none',
] as Role[]

const tankJobs: Job[] = ['GLA', 'PLD', 'MRD', 'WAR', 'DRK', 'GNB']
const healerJobs: Job[] = ['CNJ', 'WHM', 'SCH', 'AST', 'SGE']
const meleeDpsJobs: Job[] = [
  'PGL',
  'MNK',
  'LNC',
  'DRG',
  'ROG',
  'NIN',
  'SAM',
  'RPR',
  'VPR',
]
const rangedDpsJobs: Job[] = ['ARC', 'BRD', 'DNC', 'MCH']
const casterDpsJobs: Job[] = ['BLU', 'RDM', 'BLM', 'SMN', 'ACN', 'THM', 'PCT']
const dpsJobs: Job[] = [...meleeDpsJobs, ...rangedDpsJobs, ...casterDpsJobs]
const battleJobs: Job[] = [
  ...tankJobs,
  ...healerJobs,
  ...meleeDpsJobs,
  ...rangedDpsJobs,
  ...casterDpsJobs,
]
const battleJobs2: Job[] = [
  ...tankJobs,
  ...healerJobs,
  ...meleeDpsJobs,
  ...rangedDpsJobs,
  ...casterDpsJobs,
  'NONE',
]

const craftingJobs: Job[] = [
  'CRP',
  'BSM',
  'ARM',
  'GSM',
  'LTW',
  'WVR',
  'ALC',
  'CUL',
]
const gatheringJobs: Job[] = ['MIN', 'BTN', 'FSH']

const stunJobs: Job[] = ['BLU', ...tankJobs, ...meleeDpsJobs]
const silenceJobs: Job[] = ['BLU', ...tankJobs, ...rangedDpsJobs]
const sleepJobs: Job[] = ['BLM', 'BLU', ...healerJobs]
const feintJobs: Job[] = [...meleeDpsJobs]
const addleJobs: Job[] = [...casterDpsJobs]
const cleanseJobs: Job[] = ['BLU', 'BRD', ...healerJobs]

const jobToRoleMap: Map<Job, Role> = (() => {
  const addToMap = (map: Map<Job, Role>, jobs: Job[], role: Role) => {
    for (const job of jobs) map.set(job, role)
  }

  const map: Map<Job, Role> = new Map([['NONE', 'none']])
  addToMap(map, tankJobs, 'tank')
  addToMap(map, healerJobs, 'healer')
  addToMap(map, dpsJobs, 'dps')
  addToMap(map, craftingJobs, 'crafter')
  addToMap(map, gatheringJobs, 'gatherer')

  return map
})()

const Util = {
  jobEnumToJob: (id: number) => {
    const job = allJobs.find((job: Job) => nameToJobEnum[job] === id)
    return job ?? 'NONE'
  },
  jobEnumToIcon: (id: number) => {
    const icon = allIcons.find((icon: Icon) => iconToJobEnum[icon] === id)
    return icon ?? 'NONE'
  },
  jobToJobEnum: (job: Job) => nameToJobEnum[job],
  jobToRole: (job: Job) => {
    const role = jobToRoleMap.get(job)
    return role ?? 'none'
  },
  getAllRoles: (): readonly Role[] => allRoles,
  isTankJob: (job: Job) => tankJobs.includes(job),
  isHealerJob: (job: Job) => healerJobs.includes(job),
  isMeleeDpsJob: (job: Job) => meleeDpsJobs.includes(job),
  isRangedDpsJob: (job: Job) => rangedDpsJobs.includes(job),
  isCasterDpsJob: (job: Job) => casterDpsJobs.includes(job),
  isDpsJob: (job: Job) => dpsJobs.includes(job),
  isCraftingJob: (job: Job) => craftingJobs.includes(job),
  isGatheringJob: (job: Job) => gatheringJobs.includes(job),
  isCombatJob: (job: Job) => {
    return !craftingJobs.includes(job) && !gatheringJobs.includes(job)
  },
  canStun: (job: Job) => stunJobs.includes(job),
  canSilence: (job: Job) => silenceJobs.includes(job),
  canSleep: (job: Job) => sleepJobs.includes(job),
  canCleanse: (job: Job) => cleanseJobs.includes(job),
  canFeint: (job: Job) => feintJobs.includes(job),
  canAddle: (job: Job) => addleJobs.includes(job),
  getAllJobs: (): readonly Job[] => allJobs,
  getBattleJobs: (): readonly Job[] => battleJobs,
  getBattleJobs2: (): readonly Job[] => battleJobs2,
  getBattleJobs3: (): readonly Job[] =>
    battleJobs.filter(v => !baseJob.includes(v)),
  jobToFullName: (job: Job) => {
    return nameToFullName[job]
  },
  iconToJobEnum: (icon: Icon) => {
    return iconToJobEnum[icon] ?? 0
  },
  enumSortMethod: (a: number, b: number) => {
    return jobEnumOrder.indexOf(a) - jobEnumOrder.indexOf(b)
  },
  baseJobEnumConverted: (jobEnum: number): number => {
    return baseJobEnumConverted[jobEnum] ?? jobEnum
  },
  isBaseJob: (job: Job) => baseJob.includes(job),
}

export default Util
