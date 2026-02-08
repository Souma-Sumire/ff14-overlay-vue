import type { KeigennSkill, Scope } from '@/types/keigennRecord2'
import { raidbuffs } from './raidbuffs'

// 目标是本人时显示
const SELF: Scope = 'self'
// 目标不是本人时显示
const OTHER: Scope = 'other'
// 全队显示
const PARTY: Scope = 'party'

const keigennSkills: KeigennSkill[] = [
  ...raidbuffs
    .filter(v => v.line === 1 || v.line === 2)
    .map(({ tts, duration, key, line, ...rest }) => ({
      ...rest,
      duration,
      scope: PARTY,
    })),
  // 职能技能
  {
    // 铁壁
    id: 7531,
    recast1000ms: 90,
    job: [1, 3, 19, 21, 32, 37],
    // minLevel: 8,
    minLevel: 1,
    scope: SELF,
    duration: 20,
  },
  {
    // 即刻咏唱（只关心治疗职业/召唤师）
    id: 7561,
    recast1000ms: `(lv) => lv>=94 ? 40 : 60`,
    job: [6, 24, 27, 28, 33, 40],
    minLevel: 18,
    scope: PARTY,
  },
  {
    // 浴血
    id: 7542,
    recast1000ms: 90,
    job: [2, 4, 20, 22, 29, 30, 34, 39, 41],
    // minLevel: 12,
    minLevel: 1,
    scope: SELF,
    duration: 20,
  },
  {
    // 内丹
    id: 7541,
    recast1000ms: 120,
    job: [2, 4, 5, 20, 22, 23, 29, 30, 31, 34, 38, 39, 41],
    // minLevel: 8,
    minLevel: 1,
    scope: SELF,
  },
  {
    // 亲疏自行
    id: 7548,
    recast1000ms: 120,
    job: [
      1,
      2,
      3,
      4,
      5,
      19,
      20,
      21,
      22,
      23,
      29,
      30,
      31,
      32,
      34,
      37,
      38,
      39,
      41,
    ],
    // minLevel: 32,
    minLevel: 1,
    scope: SELF,
    duration: 6,
  },
  {
    // 沉稳咏唱
    id: 7559,
    recast1000ms: `120`,
    job: [6, 7, 8, 24, 25, 26, 27, 28, 33, 35, 36, 40, 42],
    // minLevel: 44,
    minLevel: 1,
    scope: SELF,
    duration: 6,
  },

  // 职业技能
  // 骑士
  {
    // 预警（剑术师）
    id: 17,
    recast1000ms: 120,
    job: [1],
    minLevel: 38,
    scope: SELF,
    duration: 15,
  },
  {
    // 预警 / 极致防御
    id: `(lv) => lv>=92 ? 36920 : 17`,
    recast1000ms: 120,
    job: [19],
    minLevel: 38,
    scope: SELF,
    duration: 15,
  },
  {
    // 壁垒
    id: 22,
    recast1000ms: 90,
    job: [19],
    minLevel: 52,
    scope: SELF,
    duration: 10,
  },
  {
    // 圣盾阵
    id: `(lv) => lv>=82 ? 25746 : 3542`,
    recast1000ms: 5,
    job: [19],
    minLevel: 35,
    scope: SELF,
    showResource: true,
    resourceCost: 50,
    duration: 8,
  },
  {
    // 干预
    id: 7382,
    recast1000ms: 10,
    job: [19],
    minLevel: 62,
    scope: OTHER,
    showResource: true,
    resourceCost: 50,
    duration: 8,
  },
  // 战士
  {
    // 复仇（斧术士）
    id: 44,
    recast1000ms: 120,
    job: [3],
    minLevel: 38,
    scope: SELF,
    duration: 15,
  },
  {
    // 复仇 / 戮罪
    id: `(lv) => lv>=92 ? 36923 : 44`,
    recast1000ms: 120,
    job: [21],
    minLevel: 38,
    scope: SELF,
    duration: 15,
  },
  {
    // 战栗
    id: 40,
    recast1000ms: 90,
    job: [3, 21],
    minLevel: 30,
    scope: SELF,
    duration: 10,
  },
  {
    // 泰然自若
    id: 3552,
    recast1000ms: 60,
    job: [21],
    minLevel: 58,
    scope: SELF,
  },
  {
    // 原初的直觉 / 原初的血气
    id: `(lv) => lv>=82 ? 25751 : 3551`,
    recast1000ms: 25,
    job: [21],
    minLevel: 56,
    scope: SELF,
    duration: 8,
  },
  {
    // 原初的勇猛
    id: 16464,
    recast1000ms: 25,
    job: [21],
    minLevel: 76,
    scope: OTHER,
    duration: 8,
  },
  // 暗黑骑士
  {
    // 暗影墙 / 暗影卫
    id: `(lv) => lv>=92 ? 36927 : 3636`,
    recast1000ms: 120,
    job: [32],
    minLevel: 38,
    scope: SELF,
    duration: 15,
  },
  {
    // 弃明投暗
    id: 3634,
    recast1000ms: 60,
    job: [32],
    minLevel: 45,
    scope: SELF,
    duration: 10,
  },
  {
    // 至黑之夜
    id: 7393,
    recast1000ms: 15,
    job: [32],
    minLevel: 70,
    scope: PARTY,
    showResource: true,
    resourceCost: 3000,
    duration: 7,
  },
  {
    // 献奉
    id: 25754,
    recast1000ms: 60,
    job: [32],
    minLevel: 82,
    scope: PARTY,
    maxCharges: 2,
    duration: 7,
  },
  // 绝枪战士
  {
    // 星云 / 大星云
    id: `(lv) => lv>=92 ? 36935 : 16148`,
    recast1000ms: 120,
    job: [37],
    minLevel: 38,
    scope: SELF,
    duration: 15,
  },
  {
    // 伪装
    id: 16140,
    recast1000ms: 90,
    job: [37],
    minLevel: 6,
    scope: SELF,
    duration: 10,
  },
  {
    // 石之心 / 刚玉之心
    id: `(lv) => lv>=82 ? 25758 : 16161`,
    recast1000ms: 25,
    job: [37],
    minLevel: 68,
    scope: PARTY,
    duration: 8,
  },
  {
    // 极光
    id: 16151,
    recast1000ms: 60,
    job: [37],
    minLevel: 45,
    scope: PARTY,
    maxCharges: `(lv) => lv>=84 ? 2 : 1`,
  },
  // 白魔法师
  {
    // 神名
    id: 3570,
    recast1000ms: 60,
    job: [24],
    minLevel: 60,
    scope: PARTY,
    maxCharges: `(lv) => lv>=98 ? 2 : 1`,
  },
  {
    // 神祝祷
    id: 7432,
    recast1000ms: 30,
    job: [24],
    minLevel: 66,
    scope: PARTY,
    maxCharges: `(lv) => lv>=98 ? 2 : 1`,
  },
  {
    // 水流幕
    id: 25861,
    recast1000ms: 60,
    job: [24],
    minLevel: 86,
    scope: PARTY,
  },
  // 学者
  {
    // 秘策
    id: 16542,
    recast1000ms: 90,
    job: [28],
    minLevel: 70,
    scope: PARTY,
  },
  {
    // 展开战术
    id: 3585,
    recast1000ms: 90,
    job: [28],
    minLevel: 56,
    scope: PARTY,
  },
  {
    // 异想的幻光
    id: 16538,
    recast1000ms: 120,
    job: [28],
    minLevel: 40,
    scope: PARTY,
  },
  {
    // 野战治疗阵
    id: 188,
    recast1000ms: 30,
    job: [28],
    minLevel: 50,
    scope: PARTY,
    showResource: true,
    resourceCost: 1,
  },
  {
    // 不屈不挠之策
    id: 3583,
    recast1000ms: 30,
    job: [28],
    minLevel: 52,
    scope: PARTY,
    showResource: true,
    resourceCost: 1,
  },
  {
    // 深谋远虑之策
    id: 7434,
    recast1000ms: 45,
    job: [28],
    minLevel: 62,
    scope: PARTY,
    showResource: true,
    resourceCost: 1,
  },
  {
    // 炽天召唤
    id: 16545,
    recast1000ms: 120,
    job: [28],
    minLevel: 80,
    scope: PARTY,
  },
  {
    // 生命回生法
    id: 25867,
    recast1000ms: 60,
    job: [28],
    minLevel: 86,
    scope: PARTY,
  },
  {
    // 炽天附体
    id: 37014,
    recast1000ms: 180,
    job: [28],
    minLevel: 100,
    scope: PARTY,
  },
  // 占星
  {
    // 先天禀赋
    id: 3614,
    recast1000ms: 40,
    job: [33],
    minLevel: 15,
    scope: PARTY,
    maxCharges: `(lv) => lv>=78 ? (lv>=98 ? 3 : 2) : 1`,
  },
  {
    // 命运之轮
    id: 3613,
    recast1000ms: 60,
    job: [33],
    minLevel: 58,
    scope: PARTY,
  },
  {
    // 天星冲日
    id: 16553,
    recast1000ms: 60,
    job: [33],
    minLevel: 60,
    scope: PARTY,
  },
  {
    // 地星
    id: 7439,
    recast1000ms: 60,
    job: [33],
    minLevel: 62,
    scope: PARTY,
  },
  {
    // 天星交错
    id: 16556,
    recast1000ms: 30,
    job: [33],
    minLevel: 74,
    scope: PARTY,
    maxCharges: `(lv) => lv>=88 ? 2 : 1`,
  },
  {
    // 天宫图
    id: 16557,
    recast1000ms: 60,
    job: [33],
    minLevel: 76,
    scope: PARTY,
  },
  {
    // 中间学派
    id: 16559,
    recast1000ms: 120,
    job: [33],
    minLevel: 80,
    scope: PARTY,
  },
  {
    // 擢升
    id: 25873,
    recast1000ms: 60,
    job: [33],
    minLevel: 86,
    scope: PARTY,
  },
  // 贤者
  {
    // 坚角清汁
    id: 24298,
    recast1000ms: 30,
    job: [40],
    minLevel: 50,
    scope: PARTY,
    showResource: true,
    resourceCost: 1,
  },
  {
    // 寄生清汁
    id: 24299,
    recast1000ms: 30,
    job: [40],
    minLevel: 52,
    scope: PARTY,
    showResource: true,
    resourceCost: 1,
  },
  // {
  //   // 灵橡清汁
  //   id: 24296,
  //   recast1000ms: 1,
  //   job: [40],
  //   minLevel: 45,
  //   scope: PARTY,
  //   showResource: true,
  //   resourceCost: 1,
  // },
  {
    // 白牛清汁
    id: 24303,
    recast1000ms: 45,
    job: [40],
    minLevel: 62,
    scope: PARTY,
    showResource: true,
    resourceCost: 1,
  },
  {
    // 输血
    id: 24305,
    recast1000ms: 120,
    job: [40],
    minLevel: 70,
    scope: PARTY,
  },
  {
    // 泛输血
    id: 24311,
    recast1000ms: 120,
    job: [40],
    minLevel: 80,
    scope: PARTY,
  },
  {
    // 整体论
    id: 24310,
    recast1000ms: 120,
    job: [40],
    minLevel: 76,
    scope: PARTY,
  },
  {
    // 活化
    id: 24300,
    recast1000ms: `(lv) => lv>=88 ? 90 : 120`,
    job: [40],
    minLevel: 56,
    scope: PARTY,
  },
  {
    // 魂灵风息
    id: 24318,
    recast1000ms: 120,
    job: [40],
    minLevel: 90,
    scope: PARTY,
  },
  {
    // 智慧之爱
    id: 37035,
    recast1000ms: 180,
    job: [40],
    minLevel: 100,
    scope: PARTY,
  },
  // 武僧
  {
    // 金刚极意
    id: 7394,
    recast1000ms: 120,
    job: [20],
    minLevel: 64,
    scope: SELF,
  },
  {
    // 金刚周天
    id: 7394,
    overrideIconId: 36944,
    recast1000ms: 120,
    job: [20],
    minLevel: 64,
    scope: OTHER,
  },
  {
    // 真言
    id: 65,
    recast1000ms: 90,
    job: [2, 20],
    minLevel: 42,
    scope: PARTY,
  },
  // 龙骑士
  // 忍者
  {
    // 残影
    id: 2241,
    recast1000ms: 120,
    job: [29, 30],
    minLevel: 2,
    scope: SELF,
  },
  // 武士
  {
    // 心眼 / 天眼通
    id: `(lv) => lv>=82 ? 36962 : 7498`,
    recast1000ms: 15,
    job: [34],
    minLevel: 6,
    scope: SELF,
  },
  // 钐镰客
  {
    // 神秘纹
    id: 24404,
    recast1000ms: 30,
    job: [39],
    minLevel: 40,
    scope: SELF,
  },
  // 蝰蛇剑士
  // 吟游诗人
  {
    // 大地神的抒情恋歌
    id: 7408,
    recast1000ms: 120,
    job: [23],
    minLevel: 66,
    scope: PARTY,
  },
  // 机工士
  // 舞者
  {
    // 治疗之华尔兹
    id: 16015,
    recast1000ms: 60,
    job: [38],
    minLevel: 52,
    scope: PARTY,
  },
  {
    // 即兴表演
    id: 16014,
    recast1000ms: 120,
    job: [38],
    minLevel: 80,
    scope: PARTY,
  },
  // 黑魔法师
  {
    // 魔罩
    id: 157,
    recast1000ms: 120,
    job: [7, 25],
    minLevel: 40,
    scope: SELF,
  },
  {
    // 以太步
    id: 155,
    recast1000ms: 10,
    job: [25],
    minLevel: 50,
    scope: SELF,
  },
  // 召唤师
  {
    // 守护之光
    id: 25799,
    recast1000ms: 60,
    job: [26, 27],
    minLevel: 2,
    scope: SELF,
    maxCharges: `(lv) => lv>=88 ? 2 : 1`,
  },
  // {
  //   // 不死鸟召唤（苏生之炎）需要模拟一整套召唤互锁机制，还要考虑低等级情况，太麻烦了先不管了。日光普照同理。
  //   id: 25831,
  //   overrideIconId: 25830,
  //   recast1000ms: 120,
  //   job: [27],
  //   minLevel: 80,
  //   scope: PARTY,
  // },
  // 赤魔法师
  // 绘灵法师
  {
    // 坦培拉涂层（按120秒算）
    id: 34685,
    recast1000ms: 120,
    job: [42],
    minLevel: 10,
    scope: PARTY,
  },
] as const

export { keigennSkills }
