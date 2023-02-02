<script setup lang="ts"></script>

<template>
  <el-container>
    <el-main>
      <el-row>
        <el-col :span="24" flex justify-end><div>倒计时占位</div></el-col>
      </el-row>
      <el-progress :percentage="50" :stroke-width="8" :indeterminate="false" :show-text="false" color="#fbfff9" />
      <el-row>
        <el-col :span="24" flex justify-end><div>技能名占位</div></el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<style lang="scss" scoped>
::-webkit-scrollbar {
  display: none !important;
}
@font-face {
  font-family: "SmartisanHei";
  src: url("//ffxiv-res.diemoe.net/SmartisanHei.woff2") format("woff2"), url("//ffxiv-res.diemoe.net/SmartisanHei.ttf"),
    url("//cdn.diemoe.net/files/fonts/SmartisanHei.woff2") format("woff2"),
    url("//cdn.diemoe.net/files/fonts/SmartisanHei.ttf");
  font-weight: normal;
  font-style: normal;
}
.el-main {
  font-size: 20px;
  font-family: "SmartisanHei";
  color: rgb(254, 254, 253);
  text-shadow: -1px 0 3px #b38915, 0 1px 3px #b38915, 1px 0 3px #b38915, 0 -1px 3px #b38915;
  .el-progress {
    :deep(.el-progress-bar) {
      .el-progress-bar__outer,
      .el-progress-bar__inner {
        border-radius: 0;
      }
      box-sizing: content-box;
      box-shadow: 0 0 4px #f8a100, 0 0 2px #b28815, 0 0 1px #38260b;
      .el-progress-bar__outer {
        background-color: #38260b;
      }
    }
  }
}
</style>
