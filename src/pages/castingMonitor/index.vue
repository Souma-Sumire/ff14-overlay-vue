<script setup lang="ts">
import { useCastingMonitorStore } from "@/store/castingMonitor";
const castingMonitorStore = useCastingMonitorStore();
onMounted(() => {
  addOverlayListener("ChangePrimaryPlayer", castingMonitorStore.handleChangePrimaryPlayer);
  addOverlayListener("LogLine", castingMonitorStore.handleLogLine);
  addOverlayListener("PartyChanged", castingMonitorStore.handlePartyChanged);
  addOverlayListener("BroadcastMessage", castingMonitorStore.handleBroadcastMessage);
  startOverlayEvents();
});
onBeforeUnmount(() => {
  removeOverlayListener("ChangePrimaryPlayer", castingMonitorStore.handleChangePrimaryPlayer);
  removeOverlayListener("LogLine", castingMonitorStore.handleLogLine);
  removeOverlayListener("PartyChanged", castingMonitorStore.handlePartyChanged);
  removeOverlayListener("BroadcastMessage", castingMonitorStore.handleBroadcastMessage);
});
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-header height="0px" p-0>
        <casting-monitor-header />
      </el-header>
      <el-main>
        <casting-monitor-main />
      </el-main>
    </el-container>
  </div>
</template>
