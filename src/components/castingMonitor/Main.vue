<script setup lang="ts">
import { useCastingMonitorStore } from '@/store/castingMonitor'
import { handleImgError } from '@/utils/xivapi'

const params = new URLSearchParams(window.location.href.split('?')[1])
const castingMonitorStore = useCastingMonitorStore()
const displayAA = Number(
  /^(?:1|true|yes|on|open|enabled)$/i.test(params.get('displayAA') ?? ''),
)
</script>

<template>
  <div w-100vw flex="~ nowrap" class="main" m-t-1>
    <div
      v-for="(item) in castingMonitorStore.castData.filter(v => v.key)" :key="item.key"
      :data-casterId="item.casterId"
      :class="`images ${item.class} logLine${item.logLine} displayAA${displayAA}`"
      :style="`--animeDuration: ${castingMonitorStore.config.duration}s;`"
    >
      <img :src="item.src" class="action-icon" height="40" loading="lazy" @error="handleImgError">
      <img class="frame" loading="lazy">
    </div>
  </div>
</template>

<style lang="scss" scoped>
@keyframes move {
  from {
    // right: calc(0% - 24px);
    transform: translateX(0);
  }

  to {
    // right: 100%;
    transform: translateX(calc(-100vw - 48px));
  }
}

.main {
  position: relative;
  top: -4px;
  min-height: 60px;
  height: calc(100vh);

  .images {
    position: absolute;
    bottom: 0px;
    height: 48px;
    right: calc(0% - 24px);
    width: 48px;
    display: flex;
    align-items: center;
    justify-content: center;

    &.logLine14 {
      filter: opacity(0.5);
    }

    &.logLine15,
    &.logLine16 {
      animation-name: move;
      animation-duration: var(--animeDuration);
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }

    .action-icon {
      position: absolute;
      z-index: 1;
    }

    &.action-category-2,
    &.action-category-3,
    &.action-category-13,
    &.action-category-17 {
      .action-icon {
        z-index: 3;
      }
    }

    .frame {
      z-index: 2;
    }

    &.action-category-2,
    &.action-category-3,
    &.action-category-13,
    &.action-category-17 {
      .frame {
        z-index: 4;
      }
    }

    .frame {
      position: absolute;
      height: 48px;
      width: 48px;
      //src有值之前隐藏默认img灰色边框
      opacity: 0;
    }

    &.action .frame,
    &.mount .frame {
      top: 1px;
      content: url(@/assets/frame.png);
      opacity: 1;
    }

    &.item .frame {
      content: url(@/assets/item_icon_frame.png);
      opacity: 1;
    }

    &.itemHQ .frame {
      content: url(@/assets/item_icon_frame.png);
      opacity: 1;
    }
  }

  //自动攻击
  .action-category-1 {
    top: 0px;

    img {
      transform: scale(0.25);
      transform-origin: top;
    }

    &.displayAA0 {
      display: none;
    }
  }

  //魔法 战技 特殊技能 弩炮
  // .action-category-2,
  // .action-category-3,
  // .action-category-13,
  // .action-category-17 {
  // }

  //能力 道具 采集能力 制作能力 任务 极限技 系统 系统 坐骑 道具操作 极限技 action的道具 action的道具HQ
  .action-category-4,
  .action-category-5,
  .action-category-6,
  .action-category-7,
  .action-category-8,
  .action-category-9,
  .action-category-10,
  .action-category-11,
  .action-category-12,
  .action-category-14,
  .action-category-15,
  .item,
  .itemHQ {
    img {
      transform: translateY(-15px) scale(0.8);
      transform-origin: top;
    }
  }

  .hide {
    opacity: 0 !important;
  }
}
</style>
