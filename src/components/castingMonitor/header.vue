<script setup lang="ts">
import { useCastingMonitorStore } from "@/store/castingMonitor";
import Util from "@/utils/util";
import { getClassjobIconSrc } from "@/utils/xivapi";
const castingMonitorStore = useCastingMonitorStore();
watchEffect(() => {
  castingMonitorStore.partyData.forEach(async (item) => {
    item.src = await getClassjobIconSrc(item.job);
  });
});
</script>

<template>
  <div z-100 flex="~ gap0 wrap" class="header-layout">
    <button
      v-for="(item, index) in castingMonitorStore.partyDataFormatted"
      :key="index"
      @click="castingMonitorStore.handleClickChangeTarget(item.id)"
      class="job-lists"
      :class="castingMonitorStore.focusTargetId === item.id ? 'job-lists-focus' : ''"
      p-0
      m-0
    >
      <div flex="~ nowrap items-end" style="align-items: flex-end; gap: 0.1rem">
        <img :src="item.src" style="height: 1.25em" />
        {{ Util.nameToCN(Util.jobEnumToJob(item.job as number)).simple2 }}
      </div>
    </button>
  </div>
</template>
<stype lang="scss" scoped>
.header-layout {
  padding: 0;
  height: 0px;
  .job-lists {
    margin: 0;
    padding: 0.25em 0.5em;
    transition: all 0.3s ease-in-out;
    border: none;
    background-color: transparent;
    cursor: pointer;
    color: white;
    font-family: "微软雅黑";
    text-shadow: -1px 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, 0 -1px 2px #000;
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
</stype>
