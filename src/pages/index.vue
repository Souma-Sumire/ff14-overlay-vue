<script setup lang="ts">
import { pleaseUseACT } from "../utils/pleaseUseACT";
</script>
<template>
  <div id="container">
    <ul>
      <!-- <li><router-link to="/stageProgramme">舞台节目单</router-link></li> -->
      <li><router-link @click="pleaseUseACT()" to="/timeline">时间轴悬浮窗</router-link></li>
      <li><router-link @click="pleaseUseACT()" to="/instancedAreaInfo">副本区信息显示</router-link></li>
      <li><router-link @click="pleaseUseACT()" to="/dsrP6">绝龙诗P6双目标</router-link></li>
      <li><router-link @click="pleaseUseACT()" to="/obs">OBS自动录制</router-link></li>
      <li><router-link to="/zoneMacro?OVERLAY_WS=ws://127.0.0.1:10501/ws">副本宏整理</router-link></li>
      <li><a href="https://souma.diemoe.net/dist/">其他悬浮窗</a></li>
      <li><a href="https://souma.diemoe.net/ffxiv_zhpatch/">国际服汉化补丁</a></li>
    </ul>
  </div>
</template>
<style lang="scss" scoped>
#container {
  * {
    padding: 0;
    margin: 0;
    box-sizing: border-box;
  }
  background-color: white;
  ul {
    list-style: none;
  }
}
</style>
