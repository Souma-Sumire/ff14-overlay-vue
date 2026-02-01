import type { RowVO } from '@/types/keigennRecord2'

export const invincibleEffect = [
  Number(409).toString(16).toUpperCase(), // 死斗
  Number(810).toString(16).toUpperCase(), // 行尸走肉
  Number(811).toString(16).toUpperCase(), // 死而不僵
  Number(1836).toString(16).toUpperCase(), // 超火流星
]

export function isLethal(row: RowVO): boolean {
  // 2%血量以下才算，因为有时候伤害判定的瞬间如果有奶（自动回血？）导致没死，会误报为致死攻击。
  return (
    row.currentHp - row.amount < -row.maxHp * 0.02
    && !row.keigenns.find(k => invincibleEffect.includes(k.effectId))
  )
}
