<template>
  <div v-show="show" class="unlocked">
    <h3>🔓 已解除锁定 (你需要将此悬浮窗锁定后使用)</h3>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

let show = ref(false);

document.addEventListener("onOverlayStateUpdate", (e: any) => (show.value = !e.detail.isLocked));
startOverlayEvents();
</script>

<style lang="scss" scoped>
.unlocked {
  overflow: hidden;
  height: 100%;
  width: 100%;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 150, 0.2);
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  flex-direction: column;
  color: white;
  text-shadow: 1px 1px 2px black;
  font-size: 11px;
  font-weight: bold;
}
</style>
