<script setup lang="ts">
import UnlockedTextVue from "./components/UnlockedText.vue";
</script>

<template>
  <UnlockedTextVue></UnlockedTextVue>
  <router-view></router-view>
</template>

<style lang="scss">
@font-face {
  font-family: "SmartisanHei";
  src: url("//ffxiv-res.diemoe.net/SmartisanHei.woff2") format("woff2"), url("//ffxiv-res.diemoe.net/SmartisanHei.ttf");
  font-weight: normal;
  font-style: normal;
}
</style>
