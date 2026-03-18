<script setup lang="ts">
import { computed } from "vue";
import { useDev } from "@/composables/useDev";
import { useCastingMonitorStore } from "@/store/castingMonitor";
import { addOverlayListener } from "../../cactbot/resources/overlay_plugin_api";

const castingMonitorStore = useCastingMonitorStore();
const dev = useDev();
const isPartyMode = computed(() => castingMonitorStore.type === "party");
const partyRowCount = computed(() => {
  if (castingMonitorStore.partyDataFormatted.length > 0)
    return castingMonitorStore.partyDataFormatted.length;
  return 1;
});
const commonLayoutStyle = computed(() => {
  if (!isPartyMode.value) return undefined;
  return {
    height: `${partyRowCount.value * 60 + 16}px`,
  };
});

onMounted(() => {
  addOverlayListener("ChangePrimaryPlayer", castingMonitorStore.handleChangePrimaryPlayer);
  addOverlayListener("LogLine", castingMonitorStore.handleLogLine);
  addOverlayListener("PartyChanged", castingMonitorStore.handlePartyChanged);
  addOverlayListener("BroadcastMessage", (e) => {
    if (e.source === "castMonitorOverlay") {
      castingMonitorStore.focusTargetId = (e.msg as { targetId: string }).targetId;
    }
  });
});

setInterval(() => {
  castingMonitorStore.cleanUpExpired();
}, 1000);
</script>

<template>
  <CommonActWrapper>
    <div class="common-layout" :style="commonLayoutStyle">
      <el-container items-center>
        <el-header class="header-layout">
          <casting-monitor-header />
        </el-header>
        <el-main>
          <casting-monitor-main />
        </el-main>
      </el-container>
      <footer v-if="dev">
        <el-button @click="castingMonitorStore.testPartyMode()">
          {{ $t("castingMonitor.testParty") }}
        </el-button>
        <el-button @click="castingMonitorStore.testFocusMode()">
          {{ $t("castingMonitor.testSolo") }}
        </el-button>
        <el-button @click="castingMonitorStore.testAction()">
          {{ $t("castingMonitor.testAction") }}
        </el-button>
        <el-button
          :type="castingMonitorStore.simulateSlowImageLoad ? 'warning' : 'info'"
          @click="castingMonitorStore.toggleSimulateSlowImageLoad()"
        >
          {{ castingMonitorStore.simulateSlowImageLoad ? "[ON] " : "[OFF] "
          }}{{ $t("castingMonitor.slowNetwork3s") }}
        </el-button>
        <div class="debug-party-slider">
          <span>Party: {{ castingMonitorStore.testPartySize }}</span>
          <el-slider
            :model-value="castingMonitorStore.testPartySize"
            :min="1"
            :max="8"
            :step="1"
            size="small"
            @update:model-value="(value) => castingMonitorStore.setTestPartySize(Number(value))"
          />
        </div>
        <!-- <el-button @click="castingMonitorStore.testItem()">
        Item
      </el-button>
      <el-button @click="castingMonitorStore.testItemHQ()">
        ItemHQ
      </el-button> -->
      </footer>
    </div>
  </CommonActWrapper>
</template>

<style lang="scss">
::-webkit-scrollbar {
  display: none !important;
}
</style>

<style lang="scss" scoped>
.common-layout {
  user-select: none;
  position: absolute;
  left: 0;
  top: 0;
  background-color: rgba($color: #000000, $alpha: 0.2);
  :deep(.el-main) {
    padding: 0;
  }
}
.header-layout {
  width: 100%;
  position: absolute;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.debug-party-slider {
  width: 220px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  text-shadow:
    -1px 0 2px #000,
    0 1px 2px #000,
    1px 0 2px #000,
    0 -1px 2px #000;
}

.debug-party-slider :deep(.el-slider) {
  flex: 1;
}
</style>
