<script setup lang="ts">
// import Swal from "sweetalert2";
// import "@sweetalert2/theme-bootstrap-4/bootstrap-4.scss";
// onErrorCaptured((err) => {
//   console.trace(err);
//   Swal.fire({
//     icon: "error",
//     title: "未知错误",
//     text: err.message,
//     footer: `<a href="javascript:void(0);" onclick="(()=>{localStorage.clear();location.reload()})()">尝试清空本地存储数据</a>`,
//   });
//   return false;
// });
</script>

<template>
  <router-view></router-view>
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
