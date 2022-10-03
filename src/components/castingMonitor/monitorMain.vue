<script setup lang="ts">
import { useCastingMonitorStore } from "@/store/castingMonitor";
const castingMonitorStore = useCastingMonitorStore();
</script>

<template>
  <div>
    <div v-for="(item, index) in castingMonitorStore.castData">
      <div>item</div>
    </div>
  </div>
</template>
