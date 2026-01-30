<script setup lang="ts">
import type { RowVO } from '@/types/keigennRecord2'
import { isLethal } from '@/utils/keigennRecord2'

const props = defineProps<{ row: RowVO }>()
const { amount, maxHp, currentHp, shield, source, type } = props.row
const shieldValue = Math.round((maxHp * +shield) / 100)
const hpPercent = Math.round((currentHp / maxHp) * 100)

const reduction = props.row.reduction
const originalDamage =
  (amount && Math.round((amount + shieldValue) / (1 - reduction))) || 0
const originalDamageDisplay = originalDamage.toLocaleString()
const displayAmount =
  amount > 999_999
    ? `${(amount / 10_000).toFixed(0)}万`
    : amount.toLocaleString()
const damageTypeClass = type
const isLethalHit = isLethal(props.row)
</script>

<template>
  <el-popover append-to=".wrapper" trigger="hover" :enterable="false" :hide-after="0" :width="180">
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
      <li>{{ $t('keigennRecord.source') }}: {{ source }}</li>
      <li>{{ $t('keigennRecord.playerShield') }}: {{ shield }}%</li>
      <li>{{ $t('keigennRecord.playerHp') }}: {{ currentHp.toLocaleString() }}({{ hpPercent }}%)</li>

      <template v-if="reduction < 1 && type !== 'dot'">
        <el-divider />
        <li>
          {{ $t('keigennRecord.reductionRate') }}:
          {{ (reduction * 100).toFixed(2) }}%
        </li>
        <li>
          {{ $t('keigennRecord.originalDamage') }}:
          <span :class="damageTypeClass">{{ originalDamageDisplay }}</span>
        </li>
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
// .amount {}

// 致命伤害
.lethal {
  border-bottom: 1px dashed red;
}

.el-divider {
  padding: 0;
  margin: 0.5em 0;
}
</style>
