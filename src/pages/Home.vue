<template>
  <div id="container">
    <ul>
      <li><router-link @click="pleaseUseACT()" to="/timeline">时间轴悬浮窗</router-link></li>
      <!-- <router-link to="/timeline/settings?OVERLAY_WS=ws://127.0.0.1:10501/ws">时间轴悬浮窗设置</router-link> -->
      <li><router-link @click="pleaseUseACT()" to="/instancedAreaInfo">副本区信息显示</router-link></li>
      <li><router-link @click="pleaseUseACT()" to="/DSRP6">绝龙诗P6双目标</router-link></li>
      <li><router-link @click="pleaseUseACT()" to="/obs">OBS自动录制</router-link></li>
      <li><router-link to="/zoneMacro?OVERLAY_WS=ws://127.0.0.1:10501/ws">副本宏整理</router-link></li>
      <!-- <router-link to="/stageProgramme">舞台节目单</router-link> -->
      <br />
      <li><a href="https://souma.diemoe.net/dist/">其他悬浮窗</a></li>
      <li><a href="https://souma.diemoe.net/ffxiv_zhpatch/">国际服汉化补丁</a></li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { pleaseUseACT } from '../utils/pleaseUseACT';
</script>
<style lang="scss" scoped>
#container {
  background-color: white;
  li {
    a {
      display: block;
      padding: 5px;
    }
  }
  // font-family: SmartisanHei;
}
</style>
