import type { RowVO } from '@/types/keigennRecord2'

export const invincibleEffect = [
  Number(409)
    .toString(16)
    .toUpperCase(), // 死斗
  Number(810)
    .toString(16)
    .toUpperCase(), // 行尸走肉
  Number(811)
    .toString(16)
    .toUpperCase(), // 死而不僵
  Number(1836)
    .toString(16)
    .toUpperCase(), // 超火流星
]

export function isLethal(row: RowVO): boolean {
  return (
    row.currentHp - row.amount < 0
    && !row.keigenns.find(k => invincibleEffect.includes(k.effectId))
  )
}
