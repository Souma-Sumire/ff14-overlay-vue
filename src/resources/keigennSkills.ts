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
    .filter((v) => v.line === 1 || v.line === 2)
    .map(({ tts, duration, key, line, ...rest }) => ({
      ...rest,
      scope: PARTY,
    })),
  {
    // 铁壁
    id: 7531,
    recast1000ms: 90,
    job: [1, 3, 19, 21, 32, 37],
    minLevel: 8,
    scope: SELF,
  },
  {
    // 预警 / 极致防御
    id: `(lv) => lv>=92 ? 36920 : 17`,
    recast1000ms: 120,
    job: [19],
    minLevel: 38,
    scope: SELF,
  },
  {
    // 复仇 / 戮罪
    id: `(lv) => lv>=92 ? 36923 : 44`,
    recast1000ms: 120,
    job: [21],
    minLevel: 38,
    scope: SELF,
  },
  {
    // 暗影墙 / 暗影卫
    id: `(lv) => lv>=92 ? 36927 : 3636`,
    recast1000ms: 120,
    job: [32],
    minLevel: 38,
    scope: SELF,
  },
  {
    // 星云 / 大星云
    id: `(lv) => lv>=92 ? 36935 : 16148`,
    recast1000ms: 120,
    job: [37],
    minLevel: 38,
    scope: SELF,
  },
  {
    // 壁垒
    id: 22,
    recast1000ms: 90,
    job: [19],
    minLevel: 52,
    scope: SELF,
  },
  {
    // 战栗
    id: 40,
    recast1000ms: 90,
    job: [21],
    minLevel: 30,
    scope: SELF,
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
    // 弃明投暗
    id: 3634,
    recast1000ms: 60,
    job: [32],
    minLevel: 45,
    scope: SELF,
  },
  {
    // 献奉
    id: 25754,
    recast1000ms: 30,
    job: [32],
    minLevel: 82,
    scope: SELF,
    maxCharges: 2,
  },
  {
    // 至黑之夜
    id: 7393,
    recast1000ms: 15,
    job: [32],
    minLevel: 70,
    scope: PARTY,
  },
  {
    // 原初的血气
    id: `(lv) => lv>=82 ? 25751 : 3551`,
    recast1000ms: 25,
    job: [21],
    minLevel: 56,
    scope: SELF,
  },
  {
    // 原初的勇猛
    id: 16464,
    recast1000ms: 25,
    job: [21],
    minLevel: 76,
    scope: OTHER,
  },
  {
    // 刚玉之心
    id: `(lv) => lv>=92 ? 25758 : 16161`,
    recast1000ms: 25,
    job: [37],
    minLevel: 68,
    scope: SELF,
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
  },
  {
    // 干预
    id: 7382,
    recast1000ms: 5,
    job: [19],
    minLevel: 62,
    scope: OTHER,
    showResource: true,
    resourceCost: 50,
  },
  {
    // 内丹
    id: 7541,
    recast1000ms: 120,
    job: [2, 4, 5, 20, 22, 23, 29, 30, 31, 34, 38, 39, 41],
    minLevel: 1,
    scope: SELF,
  },
  {
    // 浴血
    id: 7542,
    recast1000ms: 90,
    job: [2, 20, 4, 22, 29, 30, 34, 39, 41],
    minLevel: 12,
    scope: SELF,
  },
  // {
  //   // 庇护所
  //   id: 3569,
  //   recast1000ms: 90,
  //   job: [24],
  //   minLevel: 52,
  //   scope: PARTY,
  // },
  // {
  //   // 法令
  //   id: 3571,
  //   recast1000ms: 40,
  //   job: [24],
  //   minLevel: 56,
  //   scope: PARTY,
  // },
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
    // 即刻咏唱（只关心治疗职业）
    id: 7561,
    recast1000ms: `(lv) => lv>=94 ? 40 : 60`,
    job: [6, 24, 28, 33, 40],
    minLevel: 18,
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
] as const

export { keigennSkills }
