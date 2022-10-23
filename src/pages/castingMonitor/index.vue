<script setup lang="ts">
import { useCastingMonitorStore } from "@/store/castingMonitor";
const castingMonitorStore = useCastingMonitorStore();
const dev = location.href.indexOf("localhost") > -1;
const random = () => {
  return String(Math.floor(Math.random() * 1) + 10000001);
};
onMounted(() => {
  addOverlayListener("ChangePrimaryPlayer", castingMonitorStore.handleChangePrimaryPlayer);
  addOverlayListener("LogLine", castingMonitorStore.handleLogLine);
  addOverlayListener("PartyChanged", castingMonitorStore.handlePartyChanged);
  addOverlayListener("BroadcastMessage", castingMonitorStore.handleBroadcastMessage);
  startOverlayEvents();
  (function test() {
    if (!dev) return;
    castingMonitorStore.partyData = [
      { id: "10000001", name: "测试张三", job: 24, inParty: true, src: "" },
      { id: "10000002", name: "测试李四", job: 25, inParty: true, src: "" },
      { id: "10000004", name: "测试王五", job: 19, inParty: true, src: "" },
      { id: "10000005", name: "测试赵六", job: 23, inParty: true, src: "" },
      { id: "10000006", name: "测试孙七", job: 39, inParty: true, src: "" },
      { id: "10000007", name: "测试周八", job: 40, inParty: true, src: "" },
      { id: "10000008", name: "测试吴九", job: 37, inParty: true, src: "" },
      { id: "10000009", name: "测试郑十", job: 38, inParty: true, src: "" },
    ];
  })();
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
    <el-container items-center>
      <el-header class="header-layout">
        <casting-monitor-header />
      </el-header>
      <el-main p-0>
        <casting-monitor-main />
      </el-main>
    </el-container>
  </div>
  <footer style="position: fixed; bottom: 0%">
    <el-button v-if="dev" @click="castingMonitorStore.testAction(random(), 14, 2.5)">14</el-button>
    <el-button v-if="dev" @click="castingMonitorStore.testAction(random(), 15)">15</el-button>
  </footer>
</template>
<style lang="scss" scoped>
.common-layout {
  user-select: none;
  position: absolute;
  left: 0;
  top: 0;
  background-color: rgba($color: #000000, $alpha: 0.2);
  z-index: -999;
}
.common-layout :hover {
  ::v-deep(.header-layout .job-lists) {
    transform: translateY(0px);
    opacity: 1;
  }
}
</style>
