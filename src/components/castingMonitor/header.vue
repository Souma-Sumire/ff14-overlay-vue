<script setup lang="ts">
import { useCastingMonitorStore } from "@/store/castingMonitor";
import Util from "@/utils/util";
const castingMonitorStore = useCastingMonitorStore();
</script>

<template>
  <div>
    <el-button-group>
      <el-button
        v-for="(item, index) in castingMonitorStore.partyDataFormatted"
        :key="index"
        plain
        size="small"
        @click="castingMonitorStore.changeTarget(item.id)"
      >
        <div flex="~ nowrap items-end" style="align-items: flex-end">
          <img :src="castingMonitorStore.getClassjobIconSrc(item.job, 'companion')" style="height: 1.5em" />
          {{ Util.nameToCN(Util.jobEnumToJob(item.job as number)).simple2 }}
        </div>
      </el-button>
    </el-button-group>
  </div>
</template>
