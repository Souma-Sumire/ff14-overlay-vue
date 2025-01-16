<script setup lang="ts">
import { useCastingMonitorStore } from '@/store/castingMonitor'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

const castingMonitorStore = useCastingMonitorStore()
const dev = location.href.includes('localhost')
onMounted(() => {
  addOverlayListener(
    'ChangePrimaryPlayer',
    castingMonitorStore.handleChangePrimaryPlayer,
  )
  addOverlayListener('LogLine', castingMonitorStore.handleLogLine)
  addOverlayListener('PartyChanged', castingMonitorStore.handlePartyChanged)
  addOverlayListener('BroadcastMessage', (e) => {
    if (e.source === 'castMonitorOverlay') {
      castingMonitorStore.focusTargetId = (
        e.msg as { targetId: string }
      ).targetId
    }
  })
  // startOverlayEvents();
})
// const show = ref(false)
// setInterval(() => {
//   show.value
//     = Date.now() - castingMonitorStore.lastPush
//     < castingMonitorStore.config.duration * 2 * 1000
// }, 1000)

setInterval(() => {
  castingMonitorStore.cleanUpExpired()
}, 1000)
</script>

<template>
  <div class="common-layout">
    <el-container items-center>
      <el-header class="header-layout">
        <casting-monitor-header />
      </el-header>
      <el-main>
        <casting-monitor-main />
      </el-main>
    </el-container>
    <footer v-if="dev">
      <el-button @click="castingMonitorStore.testParty(true)">
        虚假小队
      </el-button>
      <el-button @click="castingMonitorStore.testParty(false)">
        单人
      </el-button>
      <el-button @click="castingMonitorStore.testAction()">
        Action
      </el-button>
      <!-- <el-button @click="castingMonitorStore.testItem()">
        Item
      </el-button>
      <el-button @click="castingMonitorStore.testItemHQ()">
        ItemHQ
      </el-button> -->
    </footer>
  </div>
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
  :deep(.el-main){
    padding:0;
  }
}
.header-layout{
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
  filter: opacity(0);
  transition: filter 0.5s;
  &:hover {
    filter: none;
  }
}
</style>
