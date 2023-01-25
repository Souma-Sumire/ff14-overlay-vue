<script setup lang="ts">
import zhCn from "element-plus/es/locale/lang/zh-cn";
</script>

<template>
  <el-config-provider :locale="zhCn">
    <router-view></router-view>
  </el-config-provider>
</template>

<style lang="scss">
@font-face {
  font-family: "SmartisanHei";
  src: url("https://ffxiv-res.diemoe.net/SmartisanHei.woff2") format("woff2"),
    url("https://ffxiv-res.diemoe.net/SmartisanHei.ttf"),
    url("https://cdn.diemoe.net/files/fonts/SmartisanHei.woff2") format("woff2"),
    url("https://cdn.diemoe.net/files/fonts/SmartisanHei.ttf");
  font-weight: normal;
  font-style: normal;
}
</style>
