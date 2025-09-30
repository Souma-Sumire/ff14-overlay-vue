<script setup lang="ts">
import type { RowVO } from '@/types/keigennRecord2'
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
  <div v-if="props.row.type === 'dot'">（不支持）</div>
  <div v-else class="status-container">
    <span v-for="(keigenn, index) in props.row.keigenns" :key="index">
      <span
        class="status"
        :title="`${userOptions.statusCN ? keigenn.name : keigenn.effect}(${
          keigenn.source
        })`"
        :data-duration="keigenn.remainingDuration"
        :data-sourcePov="keigenn.isPov"
      >
        <img
          :class="`statusIcon ${multiplierEffect(keigenn, props.row.type)}`"
          :src="getImgSrc(`/i/${keigenn.fullIcon}${icon4k}.png`)"
          :alt="keigenn.effect"
          loading="lazy"
          @error="handleImgError"
        />
      </span>
    </span>
    <span class="flags">
      {{
        props.row.effect === 'damage done'
          ? ''
          : translationFlags(props.row.effect)
      }}
    </span>
  </div>
</template>

<style scoped lang="scss">
.status-container {
  display: flex;
  flex-wrap: nowrap;
  flex-direction: row;
  align-items: center;
  align-content: center;
  justify-content: flex-start;
}

// 图标整体
.status {
  object-fit: cover;
  position: relative;
  top: -2px;
  object-fit: cover;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: flex-end;
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
  z-index: 1;
  position: absolute;
  bottom: -8px;
  font-family: emoji;
  transform: scale(0.6);
}

// 由玩家释放的状态
.status[data-sourcePov='true']::before {
  color: aquamarine;
}

// 无效的减伤
.unuseful {
  filter: grayscale(100%);
}

// 半效的减伤
.half-useful {
  filter: grayscale(60%);
}

// 有用的减伤
.useful {
  filter: grayscale(0%);
}
</style>
