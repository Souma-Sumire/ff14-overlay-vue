<template>
  <ul>
    <li>
      <router-link to="/timeline">timeline</router-link>
      <router-link to="/timeline/settings?OVERLAY_WS=ws://127.0.0.1:10501/ws">timelineSettings</router-link>
    </li>
  </ul>
</template>

<script lang="ts" setup></script>
<style lang="scss" scoped>
a {
  padding: 5px;
}
</style>
