<script setup lang="ts">
import { useCastingMonitorStore } from "@/store/castingMonitor";
import { params } from "@/utils/queryParams";
const castingMonitorStore = useCastingMonitorStore();
const displayAA = Number(/^(?:1|true|yes|on|open|enabled)$/i.test(params.displayAA));
const displayGCD = Number(/^(?:1|true|yes|on|open|enabled)$/i.test(params.displayGCDSpace));
</script>

<template>
  <div w-100vw flex="~ nowrap" class="main">
    <div v-for="(casts, castersId) in castingMonitorStore.castData" :key="castersId" :data-casterId="castersId">
      <div
        v-for="cast in casts"
        :key="cast.key"
        :class="`images ${cast.class} logLine${cast.logLine} displayAA${displayAA} displayGCD${displayGCD}`"
        :style="`--animeDuration: ${castingMonitorStore.config.duration}s;opacity:${Number(
          castingMonitorStore.focusTargetId === castersId,
        )}`"
      >
        <img :src="cast.src" class="action-icon" height="40" />
        <img :class="`frame`" />
        <span v-if="displayGCD === 1" class="GCDCast" :class="cast.GCDClass">{{ cast?.GCDCast ?? "" }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@keyframes move {
  from {
    right: calc(0% - 24px);
  }
  to {
    right: 100%;
  }
}
.main {
  position: relative;
  min-height: 60px;
  height: 100vh;
  .images {
    position: absolute;
    bottom: 0px;
    &.displayGCD1 {
      bottom: 18px;
    }
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
      z-index: 1;
    }
    .action-category-2,
    .action-category-3,
    .action-category-13,
    .action-category-17 {
      .action-icon {
        z-index: 3;
      }
    }
    .frame {
      z-index: 2;
    }
    .action-category-2,
    .action-category-3,
    .action-category-13,
    .action-category-17 {
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
    .action-icon {
      position: absolute;
    }
  }

  //自动攻击
  .action-category-1 {
    transform: scale(0.25);
    transform-origin: top;
    top: 0px;
    &.displayAA0 {
      display: none;
    }
  }
  .GCDCast {
    display: none;
    z-index: 20;
  }
  //魔法 战技 特殊技能 弩炮
  .action-category-2,
  .action-category-3,
  .action-category-13,
  .action-category-17 {
    transform: none;
    .GCDCast {
      display: inline-block;
      color: whitesmoke;
      font-family: monospace;
      transform: translateY(30px);
      text-shadow: -1px 0 1px #000, 0 1px 1px #000, 1px 0 1px #000, 0 -1px 1px #000;
      font-size: 12px;
      &.wasted {
        color: yellow;
      }
    }
  }

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
    transform: translateY(-15px) scale(0.8);
  }
}
</style>
