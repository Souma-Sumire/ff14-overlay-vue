<template>
  <div>
    <span>
      盾:{{ Math.round((props.row.maxHp * +props.row.shield) / 100) }} ({{
        props.row.shield
      }}%)
    </span>
    <br />
    <span>
      HP:{{ props.row.currentHp }}/{{ props.row.maxHp }} ({{
        Math.round((props.row.currentHp / props.row.maxHp) * 100)
      }}%)
    </span>
    <br />
    <span>来源:{{ props.row.source }}</span>
    <br />
    <span>受到伤害:{{ props.row.amount }}</span>
    <br />
    <span>
      剩余HP:{{ props.row.currentHp - props.row.amount }} ({{
        Math.round(
          ((props.row.currentHp - props.row.amount) / props.row.maxHp) * 100
        )
      }}%)
    </span>
  </div>
</template>

<script setup lang="ts">
import type { RowVO } from "@/types/keigennRecord2";
const props = defineProps({
  row: { type: Object as () => RowVO, required: true },
});
</script>

<style scoped lang="scss"></style>
