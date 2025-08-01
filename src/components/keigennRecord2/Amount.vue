<script setup lang="ts">
import type { PerformanceType, RowVO } from '@/types/keigennRecord2'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { isLethal } from '@/utils/keigennRecord2'

const props = defineProps<{ row: RowVO }>()
const store = useKeigennRecord2Store()
const userOptions = store.userOptions

const { amount, maxHp, currentHp, shield, source, target, type, keigenns, effect } = props.row

const shieldValue = Math.round((maxHp * +shield) / 100)
const hpPercent = Math.round((currentHp / maxHp) * 100)
const remainHp = currentHp - amount
const remainPercent = Math.round((remainHp / maxHp) * 100)

let damageReduction = 0
// 即死、闪避
if (effect !== 'instant death' && effect !== 'dodge') {
  let flagMultiplier = 1
  // 格挡20%
  if (effect === 'blocked damage')
    flagMultiplier = 0.8
  // 招架15%
  else if (effect === 'parried damage')
    flagMultiplier = 0.85

  let reductionMultiplier = 1
  for (const k of keigenns) {
    if (k.type !== 'absorbed') {
      reductionMultiplier *= k.performance[type as keyof PerformanceType] ?? 1
    }
  }

  damageReduction = 1 - reductionMultiplier * flagMultiplier
}

const originalDamage = amount && Math.round((amount + shieldValue) / (1 - damageReduction)) || 0
const originalDamageDisplay = originalDamage.toLocaleString()
const damageReductionDisplay = (damageReduction * 100).toFixed(2)
const displayAmount = computed(() => amount.toLocaleString())
const displayTitle = computed(() => userOptions.actionCN ? props.row.actionCN : props.row.action)
const damageTypeClass = type
const isLethalHit = isLethal(props.row)
const hint = (() => {
  const shieldText = shieldValue > 0 ? '有盾不准' : ''
  const debuffText = keigenns.find(k => k.name.includes('受伤加重')) ? '不算易伤' : ''
  const parts = [shieldText, debuffText].filter(Boolean)
  return parts.length ? `（${parts.join('、')}）` : ''
})()
</script>

<template>
  <el-popover
    append-to=".wrapper" :title="displayTitle" trigger="hover" :enterable="false" :hide-after="0"
    :width="220"
  >
    <template #reference>
      <span class="amount">
        <span :class="damageTypeClass">
          <span :class="{ lethal: isLethalHit }">
            {{ displayAmount }}
          </span>
        </span>
      </span>
    </template>
    <ul class="row-info">
      <li>来源: {{ source }}</li>
      <li>目标: {{ target }}</li>
      <li>护盾: {{ shieldValue }} ({{ shield }}%)</li>
      <li>血量: {{ currentHp }}/{{ maxHp }} ({{ hpPercent }}%)</li>
      <li>
        伤害: <span :class="damageTypeClass">{{ displayAmount }}</span>
      </li>
      <li>血量剩余: {{ remainHp }} ({{ remainPercent }}%)</li>
      <template v-if="damageReduction < 1 && type !== 'dot'">
        <hr class="divider">
        <li>玩家减伤率: <strong>{{ damageReductionDisplay }}%</strong></li>
        <li>
          倒推裸吃伤害:
          <span :class="damageTypeClass">{{ originalDamageDisplay }}</span>
        </li>
        <li> {{ hint }}</li>
      </template>
    </ul>
  </el-popover>
</template>

<style scoped lang="scss">
.row-info {
  font-size: 12px;
  line-height: 1.2;
  list-style: none;
  padding: 0;
  margin: 0;
}

.row-info li {
  margin-bottom: 2px;
  // 不换行
}

// 物理
.physics {
  color: rgb(255, 100, 100);
}

// 魔法
.magic {
  color: rgb(100, 200, 255);
}

// 暗黑
.darkness {
  color: rgb(255, 100, 255);
}

// 伤害数值
.amount {
  display: flex;
  justify-content: flex-end;
}

// 致命伤害
.lethal {
  border-bottom: 1px dashed red;
}
</style>
