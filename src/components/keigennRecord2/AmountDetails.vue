<script setup lang="ts">
import type { RowVO } from '@/types/keigennRecord2'

const props = defineProps({
  row: { type: Object as () => RowVO, required: true },
})
</script>

<template>
  <div>
    <span>来源:{{ props.row.source }}</span>
    <br>
    <span>目标:{{ props.row.target }}</span>
    <br>
    <span>
      护盾:{{ Math.round((props.row.maxHp * +props.row.shield) / 100) }} ({{
        props.row.shield
      }}%)
    </span>
    <br>
    <span>
      血量:{{ props.row.currentHp }}/{{ props.row.maxHp }} ({{
        Math.round((props.row.currentHp / props.row.maxHp) * 100)
      }}%)
    </span>
    <br>
    <span>伤害:<span :class="props.row.type">{{ props.row.amount }}</span></span>
    <br>
    <span>
      剩余:{{ props.row.currentHp - props.row.amount }} ({{
        Math.round(
          ((props.row.currentHp - props.row.amount) / props.row.maxHp) * 100,
        )
      }}%)
    </span>
  </div>
</template>

<style scoped lang="scss"></style>
