<script setup lang="ts">
import type { RowVO } from '@/pages/raidbuffRecord.vue'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { handleImgError } from '@/utils/xivapi'

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
    <span v-for="(raidbuff, index) in (props.row.raidbuffs)" :key="index">
      <span
        class="status"
        :title="`${raidbuff.name}(${raidbuff.source})`"
        :data-duration="raidbuff.remainingDuration"
        :data-sourcePov="raidbuff.isPov"
      >
        <img
          class="statusIcon"
          :src="`//cafemaker.wakingsands.com/i/${raidbuff.fullIcon}${icon4k}.png`"
          :alt="raidbuff.effect"
          loading="lazy"
          @error="handleImgError"
        >
      </span>
    </span>
  </div>
</template>

<style scoped lang="scss"></style>
