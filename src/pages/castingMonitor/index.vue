<script setup lang="ts">
import { useCastingMonitorStore } from "@/store/castingMonitor";
const castingMonitorStore = useCastingMonitorStore();
const dev = location.href.indexOf("localhost") > -1;
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
const show = ref(false);
setInterval(() => {
  show.value = Date.now() - castingMonitorStore.lastPush < castingMonitorStore.config.duration * 2 * 1000;
}, 1000);
</script>

<template>
  <div class="common-layout" v-show="show">
    <el-container items-center>
      <el-header class="header-layout">
        <casting-monitor-header />
      </el-header>
      <el-main p-0>
        <casting-monitor-main />
      </el-main>
    </el-container>
    <footer v-if="dev">
      <el-button @click="castingMonitorStore.testParty(true)">虚假小队</el-button>
      <el-button @click="castingMonitorStore.testParty(false)">单人</el-button>
      <el-button @click="castingMonitorStore.testAction()">Action</el-button>
      <el-button @click="castingMonitorStore.testItem()">Item</el-button>
      <el-button @click="castingMonitorStore.testItemHQ()">ItemHQ</el-button>
    </footer>
  </div>
</template>
<style lang="scss" scoped>
.common-layout {
  user-select: none;
  position: absolute;
  left: 0;
  top: 0;
  background-color: rgba($color: #000000, $alpha: 0.2);
}
.common-layout :hover {
  ::v-deep(.header-layout .job-lists) {
    transform: translateY(0px);
    opacity: 1;
  }
}
footer {
  position: fixed;
  bottom: 0%;
  filter: opacity(0);
  transition: filter 0.5s;
  &:hover {
    filter: none;
  }
}
</style>
