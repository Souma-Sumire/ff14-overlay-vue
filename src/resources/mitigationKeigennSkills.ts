import type { PerformanceType } from '@/types/keigennRecord2'
import type { DynamicValue } from '@/types/keySkill'

type MitigationScope = 'self' | 'party'
type DynamicDamageTakenMultiplier = PerformanceType | string

interface MitigationSkillWithDamageTakenMultiplier {
  duration: DynamicValue
  mitigationScope: MitigationScope
  damageTakenMultiplier: DynamicDamageTakenMultiplier
}

interface MitigationSkillWithoutDamageTakenMultiplier {
  mitigationScope?: MitigationScope
  damageTakenMultiplier?: undefined
}

type MitigationSkillMeta = MitigationSkillWithDamageTakenMultiplier | MitigationSkillWithoutDamageTakenMultiplier

interface MitigationKeigennSkillBase {
  id: DynamicValue
  recast1000ms: DynamicValue
  job: number[]
  minLevel: number
  maxCharges?: DynamicValue
  duration?: DynamicValue
  shieldAmount?: DynamicValue
}

type MitigationKeigennSkill = MitigationKeigennSkillBase & MitigationSkillMeta
const mitigationKeigennSkills: MitigationKeigennSkill[] = [
  // 职业通用技能
  {
    // 牵制
    id: 7549,
    duration: `(lv) => lv>=98 ? 15 : 10`,
    recast1000ms: 90,
    job: [2, 4, 20, 22, 29, 30, 34, 39, 41],
    // minLevel: 22,
    minLevel: 1,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.95, darkness: 1 },
  },
  {
    // 昏乱
    id: 7560,
    duration: `(lv) => lv>=98 ? 15 : 10`,
    recast1000ms: 90,
    job: [7, 25, 26, 27, 35, 36, 42],
    // minLevel: 8,
    minLevel: 1,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.95, magic: 0.9, darkness: 1 },
  },
  {
    // 雪仇
    id: 7535,
    duration: `(lv) => lv>=98 ? 15 : 10`,
    recast1000ms: 60,
    job: [1, 3, 19, 21, 32, 37],
    // minLevel: 22,
    minLevel: 1,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
  },
  {
    // 铁壁
    id: 7531,
    recast1000ms: 90,
    job: [1, 3, 19, 21, 32, 37],
    // minLevel: 8,
    minLevel: 1,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0.8, magic: 0.8, darkness: 1 },
    duration: 20,
  },
  {
    // 即刻咏唱（只关心治疗职业）
    id: 7561,
    recast1000ms: `(lv) => lv>=94 ? 40 : 60`,
    job: [6, 24, 28, 33, 40],
    // minLevel: 18,
    minLevel: 1,
  },
  {
    // 浴血
    id: 7542,
    recast1000ms: 90,
    job: [2, 4, 20, 22, 29, 30, 34, 39, 41],
    // minLevel: 12,
    minLevel: 1,
    duration: 20,
  },
  {
    // 内丹
    id: 7541,
    recast1000ms: 120,
    job: [2, 4, 5, 20, 22, 23, 29, 30, 31, 34, 38, 39, 41],
    // minLevel: 8,
    minLevel: 1,
  },
  // 骑士
  {
    // 预警（剑术师）
    id: 17,
    recast1000ms: 120,
    job: [1],
    minLevel: 38,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0.7, magic: 0.7, darkness: 1 },
    duration: 15,
  },
  {
    // 神圣领域
    id: 30,
    duration: 10,
    recast1000ms: 420,
    job: [19],
    minLevel: 50,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0, magic: 0, darkness: 0 },
  },
  {
    // 圣光幕帘
    id: 3540,
    duration: 30,
    recast1000ms: 90,
    job: [19],
    minLevel: 56,
    mitigationScope: 'party',
    shieldAmount: 30000,
  },
  {
    // 武装戍卫
    id: 7385,
    duration: 5,
    recast1000ms: 120,
    job: [19],
    minLevel: 70,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.85, magic: 0.85, darkness: 1 },
  },
  {
    // 预警 / 极致防御
    id: `(lv) => lv>=92 ? 36920 : 17`,
    recast1000ms: 120,
    job: [19],
    minLevel: 38,
    mitigationScope: 'self',
    damageTakenMultiplier: `(lv) => lv>=92 ? { physics: 0.6, magic: 0.6, darkness: 1 } : { physics: 0.7, magic: 0.7, darkness: 1 }`,
    duration: 15,
  },
  {
    // 壁垒
    id: 22,
    recast1000ms: 90,
    job: [19],
    minLevel: 52,
    mitigationScope: 'self',
    // 格挡算20%
    damageTakenMultiplier: { physics: 0.8, magic: 0.8, darkness: 1 },
    duration: 10,
  },
  {
    // 圣盾阵
    id: `(lv) => lv>=82 ? 25746 : 3542`,
    recast1000ms: 0,
    job: [19],
    minLevel: 35,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0.85, magic: 0.85, darkness: 1 },
    duration: 8,
  },
  {
    // 干预
    id: 7382,
    recast1000ms: 0,
    job: [19],
    minLevel: 62,
    duration: 8,
  },
  // 战士
  {
    // 摆脱
    id: 7388,
    duration: 15,
    recast1000ms: 90,
    job: [21],
    minLevel: 68,
    mitigationScope: 'party',
  },
  {
    // 死斗
    id: 43,
    duration: 10,
    recast1000ms: 240,
    job: [3, 21],
    minLevel: 42,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0, magic: 0, darkness: 0 },
  },
  {
    // 复仇（斧术士）
    id: 44,
    recast1000ms: 120,
    job: [3],
    minLevel: 38,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0.7, magic: 0.7, darkness: 1 },
    duration: 15,
  },
  {
    // 复仇 / 戮罪
    id: `(lv) => lv>=92 ? 36923 : 44`,
    recast1000ms: 120,
    job: [21],
    minLevel: 38,
    mitigationScope: 'self',
    damageTakenMultiplier: `(lv) => lv>=92 ? { physics: 0.6, magic: 0.6, darkness: 1 } : { physics: 0.7, magic: 0.7, darkness: 1 }`,
    duration: 15,
  },
  {
    // 战栗
    id: 40,
    recast1000ms: 90,
    job: [3, 21],
    minLevel: 30,
    mitigationScope: 'self',
    // 为了自动排轴，按20%算
    damageTakenMultiplier: { physics: 0.8, magic: 0.8, darkness: 0.8 },
    duration: 10,
  },
  {
    // 泰然自若
    id: 3552,
    recast1000ms: 60,
    job: [21],
    minLevel: 58,
    mitigationScope: 'self',
  },
  {
    // 原初的直觉 / 原初的血气
    id: `(lv) => lv>=82 ? 25751 : 3551`,
    recast1000ms: 25,
    job: [21],
    minLevel: 56,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
    duration: 8,
  },
  {
    // 原初的勇猛
    id: 16464,
    recast1000ms: 25,
    job: [21],
    minLevel: 76,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
    duration: 8,
  },
  // 暗黑骑士
  {
    // 行尸走肉
    id: 3638,
    duration: 10,
    recast1000ms: 300,
    job: [32],
    minLevel: 50,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0, magic: 0, darkness: 0 },
  },
  {
    // 暗黑布道
    id: 16471,
    duration: 15,
    recast1000ms: 90,
    job: [32],
    minLevel: 66,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.95, magic: 0.9, darkness: 1 },
  },
  {
    // 暗影墙 / 暗影卫
    id: `(lv) => lv>=92 ? 36927 : 3636`,
    recast1000ms: 120,
    job: [32],
    minLevel: 38,
    mitigationScope: 'self',
    damageTakenMultiplier: `(lv) => lv>=92 ? { physics: 0.6, magic: 0.6, darkness: 1 } : { physics: 0.7, magic: 0.7, darkness: 1 }`,
    duration: 15,
  },
  {
    // 弃明投暗
    id: 3634,
    recast1000ms: 60,
    job: [32],
    minLevel: 45,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0.9, magic: 0.8, darkness: 1 },
    duration: 10,
  },
  {
    // 至黑之夜
    id: 7393,
    recast1000ms: 15,
    job: [32],
    minLevel: 70,
    mitigationScope: 'party',
    duration: 7,
  },
  {
    // 献奉
    id: 25754,
    recast1000ms: 60,
    job: [32],
    minLevel: 82,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
    maxCharges: 2,
    duration: 7,
  },
  // 绝枪战士

  {
    // 超火流星
    id: 16152,
    duration: 10,
    recast1000ms: 360,
    job: [37],
    minLevel: 50,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0, magic: 0, darkness: 0 },
  },
  {
    // 光之心
    id: 16160,
    duration: 15,
    recast1000ms: 90,
    job: [37],
    minLevel: 64,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.95, magic: 0.85, darkness: 1 },
  },

  {
    // 星云 / 大星云
    id: `(lv) => lv>=92 ? 36935 : 16148`,
    recast1000ms: 120,
    job: [37],
    minLevel: 38,
    mitigationScope: 'self',
    damageTakenMultiplier: `(lv) => lv>=92 ? { physics: 0.6, magic: 0.6, darkness: 1 } : { physics: 0.7, magic: 0.7, darkness: 1 }`,
    duration: 15,
  },
  {
    // 伪装
    id: 16140,
    recast1000ms: 90,
    job: [37],
    minLevel: 6,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
    duration: 10,
  },
  {
    // 石之心 / 刚玉之心
    id: `(lv) => lv>=82 ? 25758 : 16161`,
    recast1000ms: 25,
    job: [37],
    minLevel: 68,
    mitigationScope: 'self',
    damageTakenMultiplier: { physics: 0.85, magic: 0.85, darkness: 1 },
    duration: 8,
  },
  {
    // 极光
    id: 16151,
    recast1000ms: 60,
    job: [37],
    minLevel: 45,
    mitigationScope: 'party',
    maxCharges: `(lv) => lv>=84 ? 2 : 1`,
  },
  // 白魔法师
  {
    // 天赐祝福
    id: 140,
    duration: 0,
    recast1000ms: 180,
    job: [24],
    minLevel: 50,
  },
  {
    // 礼仪之铃
    id: 25862,
    duration: 15,
    recast1000ms: 180,
    job: [24],
    minLevel: 90,
    mitigationScope: 'party',
  },
  {
    // 全大赦
    id: 7433,
    duration: 10,
    recast1000ms: 60,
    job: [24],
    minLevel: 70,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
  },
  {
    // 节制
    id: 16536,
    duration: 20,
    recast1000ms: 120,
    job: [24],
    minLevel: 80,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
  },

  {
    // 神名
    id: 3570,
    recast1000ms: 60,
    job: [24],
    minLevel: 60,
    mitigationScope: 'party',
    maxCharges: `(lv) => lv>=98 ? 2 : 1`,
  },
  {
    // 神祝祷
    id: 7432,
    recast1000ms: 30,
    job: [24],
    minLevel: 66,
    maxCharges: `(lv) => lv>=98 ? 2 : 1`,
  },
  {
    // 水流幕
    id: 25861,
    recast1000ms: 60,
    job: [24],
    minLevel: 86,
    duration: 8,
  },
  // 学者
  {
    // 秘策
    id: 16542,
    recast1000ms: 90,
    job: [28],
    minLevel: 70,
    mitigationScope: 'party',
  },
  {
    // 展开战术
    id: 3585,
    recast1000ms: 90,
    job: [28],
    minLevel: 56,
    mitigationScope: 'party',
  },
  {
    // 异想的幻光
    id: 16538,
    recast1000ms: 120,
    job: [28],
    minLevel: 40,
    duration: 20,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 1, magic: 0.95, darkness: 1 },
  },
  {
    // 野战治疗阵
    id: 188,
    recast1000ms: 30,
    job: [28],
    minLevel: 50,
    duration: 18,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
  },
  {
    // 不屈不挠之策
    id: 3583,
    recast1000ms: 30,
    job: [28],
    minLevel: 52,
    mitigationScope: 'party',
  },
  {
    // 深谋远虑之策
    id: 7434,
    recast1000ms: 45,
    job: [28],
    minLevel: 62,
  },
  {
    // 疾风怒涛之计
    id: 25868,
    duration: 20,
    recast1000ms: 120,
    job: [28],
    minLevel: 90,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
  },
  {
    // 炽天召唤
    id: 16545,
    recast1000ms: 120,
    job: [28],
    minLevel: 80,
    mitigationScope: 'party',
  },
  {
    // 生命回生法
    id: 25867,
    recast1000ms: 60,
    job: [28],
    minLevel: 86,
  },
  {
    // 炽天附体
    id: 37014,
    recast1000ms: 180,
    job: [28],
    minLevel: 100,
    mitigationScope: 'party',
  },
  // 占星
  {
    // 大宇宙
    id: 25874,
    duration: 15,
    recast1000ms: 180,
    job: [33],
    minLevel: 90,
    mitigationScope: 'party',
  },
  {
    // 先天禀赋
    id: 3614,
    recast1000ms: 40,
    job: [33],
    minLevel: 15,
    maxCharges: `(lv) => lv>=78 ? (lv>=98 ? 3 : 2) : 1`,
  },
  {
    // 命运之轮
    id: 3613,
    recast1000ms: 60,
    duration: 10,
    job: [33],
    minLevel: 58,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
  },
  {
    // 天星冲日
    id: 16553,
    recast1000ms: 60,
    duration: 15,
    job: [33],
    minLevel: 60,
    mitigationScope: 'party',
  },
  {
    // 地星
    id: 7439,
    recast1000ms: 60,
    duration: 10,
    job: [33],
    minLevel: 62,
    mitigationScope: 'party',
  },
  {
    // 天星交错
    id: 16556,
    recast1000ms: 30,
    job: [33],
    minLevel: 74,
    mitigationScope: 'party',
    maxCharges: `(lv) => lv>=88 ? 2 : 1`,
  },
  {
    // 天宫图
    id: 16557,
    recast1000ms: 60,
    job: [33],
    minLevel: 76,
    mitigationScope: 'party',
  },
  {
    // 中间学派
    id: 16559,
    recast1000ms: 120,
    job: [33],
    minLevel: 80,
    mitigationScope: 'party',
  },
  {
    // 擢升
    id: 25873,
    recast1000ms: 60,
    job: [33],
    minLevel: 86,
    duration: 8,
  },
  // 贤者
  {
    // 坚角清汁
    id: 24298,
    recast1000ms: 30,
    job: [40],
    minLevel: 50,
    duration: 15,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
  },
  {
    // 寄生清汁
    id: 24299,
    recast1000ms: 30,
    job: [40],
    minLevel: 52,
    mitigationScope: 'party',
  },
  {
    // 输血
    id: 24305,
    recast1000ms: 120,
    job: [40],
    minLevel: 70,
  },
  {
    // 泛输血
    id: 24311,
    recast1000ms: 120,
    job: [40],
    minLevel: 80,
    mitigationScope: 'party',
  },
  {
    // 整体论
    id: 24310,
    recast1000ms: 120,
    job: [40],
    duration: 20,
    minLevel: 76,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
  },
  {
    // 活化
    id: 24300,
    recast1000ms: `(lv) => lv>=88 ? 90 : 120`,
    job: [40],
    minLevel: 56,
  },
  {
    // 魂灵风息
    id: 24318,
    recast1000ms: 120,
    job: [40],
    minLevel: 90,
    mitigationScope: 'party',
  },
  {
    // 智慧之爱
    id: 37035,
    recast1000ms: 180,
    job: [40],
    minLevel: 100,
    mitigationScope: 'party',
  },
  // 武僧
  {
    // 金刚极意
    id: 7394,
    recast1000ms: 120,
    job: [20],
    minLevel: 64,
    mitigationScope: 'self',
  },
  {
    // 真言
    id: 65,
    recast1000ms: 90,
    job: [2, 20],
    minLevel: 42,
    mitigationScope: 'party',
  },
  // 龙骑士
  {
    // 残影
    id: 2241,
    recast1000ms: 120,
    job: [29, 30],
    minLevel: 2,
    mitigationScope: 'self',
  },
  // 武士
  {
    // 心眼 / 天眼通
    id: `(lv) => lv>=82 ? 36962 : 7498`,
    recast1000ms: 15,
    job: [34],
    minLevel: 6,
  },
  // 钐镰客
  {
    // 神秘纹
    id: 24404,
    recast1000ms: 30,
    job: [39],
    minLevel: 40,
    mitigationScope: 'self',
  },
  // 蝰蛇剑士
  {
    // 大地神的抒情恋歌
    id: 7408,
    recast1000ms: 120,
    job: [23],
    minLevel: 66,
    mitigationScope: 'party',
  },
  // 吟游诗人
  {
    // 行吟
    id: 7405,
    duration: 15,
    recast1000ms: `(lv) => lv>=88 ? 90 : 120`,
    job: [23],
    minLevel: 62,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.85, magic: 0.85, darkness: 1 },
  },
  // 机工士
  {
    // 武装解除
    id: 2887,
    duration: 10,
    recast1000ms: 120,
    job: [31],
    minLevel: 62,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.9, magic: 0.9, darkness: 1 },
  },
  {
    // 策动
    id: 16889,
    duration: 15,
    recast1000ms: `(lv) => lv>=88 ? 90 : 120`,
    job: [31],
    minLevel: 56,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.85, magic: 0.85, darkness: 1 },
  },

  // 舞者
  {
    // 防守之桑巴
    id: 16012,
    duration: 15,
    recast1000ms: `(lv) => lv>=88 ? 90 : 120`,
    job: [38],
    minLevel: 56,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 0.85, magic: 0.85, darkness: 1 },
  },
  {
    // 治疗之华尔兹
    id: 16015,
    recast1000ms: 60,
    job: [38],
    minLevel: 52,
    mitigationScope: 'party',
  },
  {
    // 即兴表演
    id: 16014,
    recast1000ms: 120,
    job: [38],
    minLevel: 80,
    mitigationScope: 'party',
  },
  // 黑魔法师
  {
    // 魔罩
    id: 157,
    recast1000ms: 120,
    job: [7, 25],
    minLevel: 40,
    mitigationScope: 'self',
  },
  // 召唤师
  {
    // 守护之光
    id: 25799,
    recast1000ms: 60,
    job: [26, 27],
    minLevel: 2,
    mitigationScope: 'self',
    maxCharges: `(lv) => lv>=88 ? 2 : 1`,
  },
  // 赤魔法师
  {
    // 抗死
    id: 25857,
    duration: 10,
    recast1000ms: 120,
    job: [35],
    minLevel: 86,
    mitigationScope: 'party',
    damageTakenMultiplier: { physics: 1, magic: 0.9, darkness: 1 },
  },
  // 绘灵法师
  {
    // 坦培拉涂层
    id: 34685,
    recast1000ms: 120,
    job: [42],
    minLevel: 10,
    mitigationScope: 'party',
  },
  {
    // 油性坦培拉涂层
    id: 34686,
    recast1000ms: 90,
    job: [42],
    minLevel: 88,
    mitigationScope: 'party',
  },
]
export { type MitigationKeigennSkill, mitigationKeigennSkills }
