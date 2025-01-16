<script setup lang="ts">
import type { PerformanceType, RowVO } from '@/types/keigennRecord2'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { translationFlags } from '@/utils/flags'
import { multiplierEffect } from '@/utils/keigenn'
import { getImgSrc, handleImgError } from '@/utils/xivapi'

const props = defineProps({
  row: { type: Object as () => RowVO, required: true },
})
const keigennRecord2Store = useKeigennRecord2Store()
const icon4k = keigennRecord2Store.icon4k
</script>

<template>
  <div v-if="props.row.type === 'dot'">
    （不支持）
  </div>
  <div v-else>
    <span v-for="(keigenn, index) in (props.row.keigenns)" :key="index">
      <span
        class="status"
        :title="`${keigenn.name}(${keigenn.source})`"
        :data-duration="keigenn.remainingDuration"
        :data-sourcePov="keigenn.isPov"
      >
        <img
          :class="`statusIcon ${multiplierEffect(
            keigenn.performance[row.type as keyof PerformanceType],
          )}`"
          :src="getImgSrc(`/i/${keigenn.fullIcon}${icon4k}.png`)"
          :alt="keigenn.effect"
          loading="lazy"
          @error="handleImgError"
        >
      </span>
    </span>
    <span>
      {{ row.effect === "damage done" ? "" : translationFlags(row.effect) }}
    </span>
  </div>
</template>

<style scoped lang="scss"></style>
