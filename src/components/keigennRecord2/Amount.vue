<script setup lang="ts">
import type { RowVO } from '@/types/keigennRecord2'
import { isLethal } from '@/utils/keigennRecord2'

const props = defineProps({
  row: { type: Object as () => RowVO, required: true },
})
</script>

<template>
  <el-popover
    append-to=".wrapper"
    effect="dark"
    placement="right-start"
    title=""
    trigger="hover"
    :enterable="false"
    :hide-after="0"
    popper-class="my-el-popover"
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
    <KeigennRecord2AmountDetails :row="row" />
  </el-popover>
</template>

<style scoped lang="scss"></style>
