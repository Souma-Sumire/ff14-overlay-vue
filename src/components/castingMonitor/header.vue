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
  <div z-100 flex="~ gap0 wrap">
    <el-button
      v-for="(item, index) in castingMonitorStore.partyDataFormatted"
      :key="index"
      size="small"
      text
      :type="castingMonitorStore.focusTargetId === item.id ? 'primary' : ''"
      @click="castingMonitorStore.changeTarget(item.id)"
      :style="castingMonitorStore.focusTargetId === item.id ? { fontWeight: 'bold' } : {}"
      class="job-lists"
      :class="castingMonitorStore.focusTargetId === item.id ? 'job-lists-focus' : ''"
    >
      <div flex="~ nowrap items-end" style="align-items: flex-end; gap: 0.1rem">
        <img :src="item.src" style="height: 1.5em" />
        {{ Util.nameToCN(Util.jobEnumToJob(item.job as number)).simple2 }}
      </div>
    </el-button>
  </div>
</template>
