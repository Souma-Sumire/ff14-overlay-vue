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
const userOptions = keigennRecord2Store.userOptions
const icon4k = keigennRecord2Store.icon4k
</script>

<template>
  <div v-if="props.row.type === 'dot'">
    （不支持）
  </div>
  <div v-else>
    <span v-for="(keigenn, index) in props.row.keigenns" :key="index">
      <span
        class="status"
        :title="`${userOptions.statusCN ? keigenn.name : keigenn.effect}(${keigenn.source})`"
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

<style scoped lang="scss">
// 图标整体上移
.status {
  position: relative;
  top: -2px;
  object-fit: cover;
}

// 图标大小
.statusIcon {
  width: 18px;
  object-fit: cover;
  vertical-align: middle;
}

// 持续时间
.status::before {
  content: attr(data-duration);
  height: 1em;
  line-height: 1em;
  z-index: 1;
  position: absolute;
  text-align: center;
  left: 50%;
  bottom: -1.1em;
  transform: translateX(-50%) scale(0.7);
  transform-origin: top center;
  font-family: emoji;
}

// 由玩家释放的状态
.status[data-sourcePov="true"]::before {
  color: aquamarine;
}

// 无效的减伤
.unuseful {
  filter: grayscale(100%);
}

// 半效的减伤
.half-useful {
  filter: grayscale(50%);
}

// 有用的减伤
.useful {
  filter: grayscale(0%);
}
</style>
