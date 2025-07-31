<script setup lang="ts">
import { useActReady } from '@/composables/useActReady'
import { useDemo } from '@/composables/useDemo'

const actReady = useActReady()
const demo = useDemo()
</script>

<template>
  <el-card v-if="!actReady" class="act-not-ready">
    <h1> 在 ACT 中添加本页面作为数据统计悬浮窗</h1>
  </el-card>
  <div v-show="actReady">
    <!-- 默认插槽内容 -->
    <slot />

    <!-- 悬浮窗未锁定时，显示的内容 -->
    <slot v-if="demo" name="readme" />
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
