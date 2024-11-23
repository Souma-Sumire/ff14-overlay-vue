<script setup lang="ts">
import { useCastingMonitorStore } from '@/store/castingMonitor'
import Util from '@/utils/util'
import { getClassjobIconSrc, handleImgError } from '@/utils/xivapi'

const params = new URLSearchParams(window.location.href.split('?')[1])

const castingMonitorStore = useCastingMonitorStore()
watchEffect(() => {
  for (const item of castingMonitorStore.partyData)
    item.src = getClassjobIconSrc(item.job)
})
const showHeader = /^(?:1|true|yes|on|open|enabled|undefined)$/i.test(
  params.get('showHeader') || 'true',
)
</script>

<template>
  <div v-if="showHeader && castingMonitorStore.partyData.length > 1" z-100 flex="~ gap0 wrap" class="header-layout">
    <button
      v-for="(item, index) in castingMonitorStore.partyDataFormatted"
      :key="index"
      class="job-lists"
      :class=" castingMonitorStore.focusTargetId === item.id ? 'job-lists-focus' : '' "
      m-0 p-0 @click="castingMonitorStore.handleClickChangeTarget(item.id)"
    >
      <div flex="~ nowrap items-end" style="align-items: flex-end; gap: 0.1rem">
        <img :src="item.src" style="height: 1.25em" loading="lazy" :onerror="handleImgError">
        {{ Util.nameToFullName(Util.jobEnumToJob(item.job as number)).simple2 }}
      </div>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.header-layout {
  padding: 0;
  height: 0px;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  .job-lists {
    padding: 0.25em 0.5em;
    transition: all 0.3s ease-in-out;
    border: none;
    background-color: transparent;
    cursor: pointer;
    color: white;
    font-family: "微软雅黑";
    text-shadow: -1px 0 2px #000, 0 1px 2px #000, 1px 0 2px #000,
      0 -1px 2px #000;
    &:hover {
      transition-duration: 0.05s !important;
      color: lightskyblue;
    }
    &:not(.job-lists-focus) {
      transform: translateY(-35px);
      opacity: 0;
    }
    &.job-lists-focus {
      transform: translateY(-0px);
      opacity: 0.75;
      color: lightskyblue;
    }
  }
}
</style>
