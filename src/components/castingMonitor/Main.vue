<script setup lang="ts">
import { computed } from 'vue'
import { useCastingMonitorStore } from '@/store/castingMonitor'
import Util from '@/utils/util'
import { handleImgError } from '@/utils/xivapi'

const params = new URLSearchParams(window.location.href.split('?')[1])
const castingMonitorStore = useCastingMonitorStore()
const displayAA = Number(
  /^(?:1|true|yes|on|open|enabled)$/i.test(params.get('displayAA') ?? ''),
)
const isPartyMode = computed(() => castingMonitorStore.type === 'party')
const visibleCastData = computed(() =>
  castingMonitorStore.castData.filter(v => v.key),
)
const partyCasterRows = computed(() => {
  const rows = new Map<string, number>()
  for (const [index, member] of castingMonitorStore.partyDataFormatted.entries())
    rows.set(member.id, index)
  if (rows.size === 0 && castingMonitorStore.playerId)
    rows.set(castingMonitorStore.playerId, 0)
  return rows
})
const rowCount = computed(() => Math.max(partyCasterRows.value.size, 1))

function getCasterRowIndex(casterId: string): number {
  return partyCasterRows.value.get(casterId) ?? 0
}

function getClassjobIconSrc(jobEnum: number): string {
  const job = Util.jobEnumToJob(jobEnum)
  const fullName = Util.jobToFullName(job)
  return `https://souma.diemoe.net/resources/img/cj2/${fullName.en}.png`
}
</script>

<template>
  <div
    flex="~ nowrap"
    class="main"
    :class="{ 'party-mode': isPartyMode }"
    :style="`--rowCount: ${rowCount};`"
    m-t-1
    w-100vw
  >
    <div v-if="isPartyMode" class="party-row-icons">
      <div
        v-for="(member, index) in castingMonitorStore.partyDataFormatted"
        :key="member.id"
        class="party-row-icon"
        :style="`--rowIndex: ${index};`"
      >
        <img
          :src="getClassjobIconSrc(member.job)"
          class="party-job-icon"
          loading="lazy"
          @error="handleImgError"
        >
      </div>
    </div>
    <div
      v-for="(item) in visibleCastData"
      :key="item.key"
      :data-casterId="item.casterId"
      :class="`images ${item.class} logLine${item.logLine} displayAA${displayAA}`"
      :style="`--animeDuration: ${castingMonitorStore.config.duration}s; --rowIndex: ${isPartyMode ? getCasterRowIndex(item.casterId) : 0};`"
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
  &.party-mode {
    top: 0;
    margin-top: 16px;
    min-height: calc(var(--rowCount) * 60px);
    height: calc(var(--rowCount) * 60px);
  }
  &.party-mode .images {
    top: calc(var(--rowIndex) * 60px);
    bottom: auto;
  }

  .party-row-icons {
    position: absolute;
    left: 0;
    top: 0;
    width: 48px;
    pointer-events: none;
    z-index: 6;
  }

  .party-row-icon {
    position: absolute;
    top: calc(var(--rowIndex) * 60px);
    left: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;

    .party-job-icon {
      width: 38px;
      height: 38px;
      filter: drop-shadow(0 0 1px rgb(0 0 0 / 55%));
    }
  }

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
