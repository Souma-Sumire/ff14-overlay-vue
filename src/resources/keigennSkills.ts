import type { KeigennSkill, Scope } from '@/types/keigennRecord2'
import { raidbuffs } from './raidbuffs'

const SOLO: Scope = 'solo'
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
    scope: SOLO,
  },
  {
    // 预警 / 极致防御
    id: `(lv) => lv>=92 ? 36920 : 17`,
    recast1000ms: 120,
    job: [19],
    minLevel: 38,
    scope: SOLO,
  },
  {
    // 复仇 / 戮罪
    id: `(lv) => lv>=92 ? 36923 : 44`,
    recast1000ms: 120,
    job: [21],
    minLevel: 38,
    scope: SOLO,
  },
  {
    // 暗影墙 / 暗影卫
    id: `(lv) => lv>=92 ? 36927 : 3636`,
    recast1000ms: 120,
    job: [32],
    minLevel: 38,
    scope: SOLO,
  },
  {
    // 星云 / 大星云
    id: `(lv) => lv>=92 ? 36935 : 16148`,
    recast1000ms: 120,
    job: [37],
    minLevel: 38,
    scope: SOLO,
  },
  {
    // 壁垒
    id: 22,
    recast1000ms: 90,
    job: [19],
    minLevel: 52,
    scope: SOLO,
  },
  {
    // 战栗
    id: 40,
    recast1000ms: 90,
    job: [21],
    minLevel: 30,
    scope: SOLO,
  },
  {
    // 泰然自若
    id: 3552,
    recast1000ms: 60,
    job: [21],
    minLevel: 58,
    scope: SOLO,
  },
  {
    // 弃明投暗
    id: 3634,
    recast1000ms: 60,
    job: [32],
    minLevel: 45,
    scope: SOLO,
  },
  {
    // 献奉
    id: 25754,
    recast1000ms: 30,
    job: [32],
    minLevel: 82,
    scope: SOLO,
    maxCharges: 2,
  },
  {
    // 至黑之夜
    id: 7393,
    recast1000ms: 15,
    job: [32],
    minLevel: 70,
    scope: SOLO,
  },
  {
    // 原初的血气
    id: `(lv) => lv>=82 ? 25751 : 3551`,
    recast1000ms: 25,
    job: [21],
    minLevel: 56,
    scope: SOLO,
  },
  {
    // 刚玉之心
    id: `(lv) => lv>=92 ? 25758 : 16161`,
    recast1000ms: 25,
    job: [37],
    minLevel: 68,
    scope: SOLO,
  },
  {
    // 内丹
    id: 7541,
    recast1000ms: 120,
    job: [2, 4, 5, 20, 22, 23, 29, 30, 31, 34, 38, 39, 41],
    minLevel: 1,
    scope: SOLO,
  },
  {
    // 浴血
    id: 7542,
    recast1000ms: 90,
    job: [2, 20, 4, 22, 29, 30, 34, 39, 41],
    minLevel: 12,
    scope: SOLO,
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
] as const

export { keigennSkills }
