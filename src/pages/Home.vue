<template>
  <ul>
    <li>
      <router-link to="/timeline">时间轴悬浮窗</router-link>
      <router-link to="/timeline/settings?OVERLAY_WS=ws://127.0.0.1:10501/ws">时间轴悬浮窗设置</router-link>
      <router-link to="/instancedAreaInfo">副本区信息显示</router-link>
      <router-link to="/DSRP6">绝龙诗P6双目标</router-link>
      <router-link to="/obs">OBS自动录制</router-link>
      <router-link to="/instancedAreaInfo">副本区信息显示</router-link>
      <!-- <router-link to="/stageProgramme">舞台节目单</router-link> -->
    </li>
    <br />
    <li>
      <a href="https://souma.diemoe.net/dist/">其他悬浮窗</a>
      <a href="https://souma.diemoe.net/ffxiv_zhpatch/">国际服汉化补丁</a>
    </li>
  </ul>
</template>

<script lang="ts" setup></script>
<style lang="scss" scoped>
li {
  a {
    display: block;
    padding: 5px;
  }
}
</style>
