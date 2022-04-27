<template>
  <ul>
    <li>
      <router-link to="/timeline">时间轴</router-link>
      <router-link to="/timeline/settings?OVERLAY_WS=ws://127.0.0.1:10501/ws">时间轴设置</router-link>
    </li>
    <li>
      <a href="https://souma.diemoe.net/dist/">旧导航页面</a>
      <a href="https://soumasumire.gitee.io/ffxiv-overlay/">(备用地址)</a>
    </li>
  </ul>
</template>

<script lang="ts" setup></script>
<style lang="scss" scoped>
a {
  padding: 5px;
}
</style>
