<template>
  <div v-if="props.row.type === 'dot'">（不支持）</div>
  <div v-else>
    <span v-for="(keigenn, index) in props.row.keigenns" :key="index">
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
          :src="`//cafemaker.wakingsands.com/i/${keigenn.fullIcon}${icon4k}.png`"
          :alt="keigenn.effect"
          @error="handleImgError"
          loading="lazy"
        />
      </span>
    </span>
    <span>
      {{ row.effect === "damage done" ? "" : translationFlags(row.effect) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { RowVO } from "@/types/keigennRecord2";
import { multiplierEffect } from "@/resources/keigenn";
import type { PerformanceType } from "@/resources/keigenn";
import { useKeigennRecord2Store } from "@/store/keigennRecord2";
import { handleImgError } from "@/utils/xivapi";
import { translationFlags } from "@/utils/flags";
const keigennRecord2Store = useKeigennRecord2Store();
const icon4k = keigennRecord2Store.icon4k;

const props = defineProps({
  row: { type: Object as () => RowVO, required: true },
});
</script>

<style scoped lang="scss"></style>
