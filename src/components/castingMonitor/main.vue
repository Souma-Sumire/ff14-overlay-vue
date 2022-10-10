<script setup lang="ts">
import { useCastingMonitorStore } from "@/store/castingMonitor";
const castingMonitorStore = useCastingMonitorStore();
</script>

<template>
  <div w-100vw flex="~ nowrap" class="main">
    <div v-for="(actor, i1) in castingMonitorStore.castData" :key="i1">
      <div
        v-for="(item) in actor"
        :key="item.key"
        class="images"
        :class="item.class"
        :style="`--animeDuration: ${castingMonitorStore.config.duration}s;`"
      >
        <img src="@/assets/frame.png" class="frame" height="48" />
        <img :src="item.src" class="action" height="40" />
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
  z-index: -1;
  height: 80px;
  .images {
    position: absolute;
    bottom: 0px;
    height: 48px;
    right: calc(0% - 24px);
    width: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation-name: move;
    animation-duration: var(--animeDuration);
    animation-timing-function: linear;
    animation-fill-mode: forwards;
    .frame {
      z-index: 1;
      position: absolute;
    }
    .action {
      z-index: 0;
      position: absolute;
    }
  }

  //自动攻击
  .action-category-1 {
    transform: translateY(-30px) scale(0.2);
  }

  //魔法 战技 特殊技能 弩炮
  .action-category-2,
  .action-category-3,
  .action-category-13,
  .action-category-17 {
    transform: none;
  }

  //能力 道具 采集能力 制作能力 任务 极限技 系统 系统 坐骑 道具操作 极限技
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
  .action-category-15 {
    transform: translateY(-15px) scale(0.8);
  }
}
</style>
