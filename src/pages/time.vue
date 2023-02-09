<script setup lang="ts">
import moment from "moment";
const time = ref("");

requestAnimationFrame(function update() {
  time.value = moment().format("YYYY/MM/DD HH:mm:ss.SSS");
  requestAnimationFrame(update);
});
</script>

<template>
  <span class="time">
    {{ time }}
  </span>
</template>

<style lang="scss" scoped>
.time {
  background-color: rgba(0, 0, 0, 0.4);
  color: white;
  font-size: 24px;
  font-weight: bold;
  padding: 2px 5px;
}
</style>
