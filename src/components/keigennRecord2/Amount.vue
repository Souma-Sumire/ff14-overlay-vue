<script setup lang="ts">
import type { RowVO } from '@/types/keigennRecord2'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { isLethal } from '@/utils/keigennRecord2'

const props = defineProps({
  row: { type: Object as () => RowVO, required: true },
})
const store = useKeigennRecord2Store()
const userOptions = store.userOptions

const shieldValue = computed(
  () => Math.round((props.row.maxHp * +props.row.shield) / 100),
)
const hpPercent = computed(
  () => Math.round((props.row.currentHp / props.row.maxHp) * 100),
)
const remainHp = computed(() => props.row.currentHp - props.row.amount)
const remainPercent = computed(
  () => Math.round((remainHp.value / props.row.maxHp) * 100),
)
</script>

<template>
  <el-popover
    append-to=".wrapper"
    :title="userOptions.actionCN ? props.row.actionCN : props.row.action"
    trigger="hover"
    :enterable="false"
    :hide-after="0"
  >
    <template #reference>
      <span class="amount">
        <span :class="props.row.type">
          <span :class="`${isLethal(row) ? 'lethal' : ''}`">
            {{ row.amount.toLocaleString().padStart(3, "\u3000") }}
          </span>
        </span>
      </span>
    </template>
    <ul class="row-info">
      <li>来源: {{ props.row.source }}</li>
      <li>目标: {{ props.row.target }}</li>
      <li>护盾: {{ shieldValue }} ({{ props.row.shield }}%)</li>
      <li>血量: {{ props.row.currentHp }}/{{ props.row.maxHp }} ({{ hpPercent }}%)</li>
      <li>
        伤害: <span :class="props.row.type">{{ props.row.amount }}</span>
      </li>
      <li>剩余: {{ remainHp }} ({{ remainPercent }}%)</li>
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
