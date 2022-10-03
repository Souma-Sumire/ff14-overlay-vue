<script setup lang="ts">
import { useCastingMonitorStore } from "@/store/castingMonitor";
import Util from "@/utils/util";
const castingMonitorStore = useCastingMonitorStore();
</script>

<template>
  <div>
    <el-button-group>
      <el-button
        v-for="(item, index) in castingMonitorStore.partyData"
        :key="index"
        plain
        size="small"
        @click="castingMonitorStore.changeTarget(item.id)"
      >
        {{ Util.nameToCN(Util.jobEnumToJob(item.job as number)).simple2 }}
      </el-button>
    </el-button-group>
  </div>
</template>
