<script setup lang="ts">
import { useActReady } from '@/composables/useActReady'

const actReady = useActReady()
</script>

<template>
  <el-card v-if="!actReady" class="act-not-ready">
    <h1> 在 ACT 中添加本页面作为数据统计悬浮窗</h1>
  </el-card>
  <div v-else>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.act-not-ready {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  border: 1px solid #444;

  h1 {
    color: #eee;
    font-size: 1.2rem;
    margin: 0;
  }
}
</style>
