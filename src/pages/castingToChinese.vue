<script setup lang="ts">
import { getActionChinese } from "@/resources/actionChinese";

class Cast {
  name: string;
  startTime: number;
  castTime: number;
  overTime: number;
  actionId: number;
  constructor(line: string[]) {
    this.name = getActionChinese(parseInt(line[4], 16)) ?? line[4];
    this.startTime = Date.now();
    this.castTime = Number(line[8]) * 1000;
    this.overTime = this.startTime + this.castTime;
    this.actionId = parseInt(line[4], 16);
  }
}

const data: { targetCast?: Cast } = reactive({ targetCast: undefined });
// localStorage.removeItem("castingToChinese");
const settings = useStorage(
  "castingToChinese",
  {
    width: 283,
    showCountdown: true,
    showProgress: true,
    showActionChinese: true,
    offsetCountdownX: 2,
    offsetCountdownY: 0,
    offsetActionChineseX: 0,
    offsetActionChineseY: -2,
    ping: 80,
    keep: 100,
    fontSizeCountDown: 17,
    fontSizeActionName: 20,
    fontFamily: "SmartisanHei",
  },
  localStorage,
  { mergeDefaults: true },
);
const windowWidth = computed(() => settings.value.width + "px");
const opacityCountdown = computed(() => (settings.value.showCountdown ? 1 : 0));
const opacityProgress = computed(() => (settings.value.showProgress ? 1 : 0));
const opacityActionChinese = computed(() => (settings.value.showActionChinese ? 1 : 0));
const offsetCountdownX = computed(() => settings.value.offsetCountdownX + "px");
const offsetCountdownY = computed(() => settings.value.offsetCountdownY + "px");
const offsetActionChineseX = computed(() => settings.value.offsetActionChineseX + "px");
const offsetActionChineseY = computed(() => settings.value.offsetActionChineseY + "px");
const casting = new Map();
const now = ref(0);
const ping = settings.value.ping;
const showSettings = ref(document.getElementById("unlocked")?.style?.display === "flex");

addOverlayListener("EnmityTargetData", (e: { Target: { ID: number } | null; Focus: { ID: number } | null }) => {
  data.targetCast = casting.get(e.Target?.ID);
});

addOverlayListener("LogLine", (e: { line: string[] }) => {
  if (e.line[0] === "20") casting.set(parseInt(e.line[2], 16), new Cast(e.line));
  else if (e.line[0] === "23") casting.delete(parseInt(e.line[2], 16));
});

addOverlayListener("ChangeZone", () => casting.clear());

startOverlayEvents();

requestAnimationFrame(function update() {
  now.value = Date.now();
  requestAnimationFrame(update);
});

document.addEventListener("onOverlayStateUpdate", (e: any) => {
  showSettings.value = e?.detail?.isLocked === false;
});
</script>

<template>
  <el-container>
    <el-header v-show="showSettings" class="settings">
      <form>宽度: <el-input-number v-model="settings.width" :min="20" :max="1000" size="small" controls-position="right" /></form>
      <form>显示倒计时: <el-switch v-model="settings.showCountdown" /></form>
      <form>显示进度条: <el-switch v-model="settings.showProgress" /></form>
      <form>显示中文: <el-switch v-model="settings.showActionChinese" /></form>
      <form>延迟(ms): <el-input-number v-model="settings.ping" :min="0" :max="10000" size="small" controls-position="right" /></form>
      <form>保留(ms): <el-input-number v-model="settings.keep" :min="0" :max="10000" size="small" controls-position="right" /></form>
      <form>倒计时偏移X: <el-input-number v-model="settings.offsetCountdownX" :min="-1000" :max="1000" size="small" /></form>
      <form>倒计时偏移Y: <el-input-number v-model="settings.offsetCountdownY" :min="-1000" :max="1000" size="small" controls-position="right" /></form>
      <form>中文偏移X: <el-input-number v-model="settings.offsetActionChineseX" :min="-1000" :max="1000" size="small" /></form>
      <form>中文偏移Y: <el-input-number v-model="settings.offsetActionChineseY" :min="-1000" :max="1000" size="small" controls-position="right" /></form>
      <form>倒计时字号(px): <el-input-number v-model="settings.fontSizeCountDown" :min="1" :max="100" size="small" controls-position="right" /></form>
      <form>中文字号(px): <el-input-number v-model="settings.fontSizeActionName" :min="1" :max="100" size="small" controls-position="right" /></form>
      <form style="width: 10rem">字体: <el-input v-model="settings.fontFamily" size="small" clearable @clear="settings.fontFamily = 'SmartisanHei'" /></form>
    </el-header>
    <el-main v-show="data.targetCast && now - data.targetCast.overTime + ping < settings.keep" :style="{ fontFamily: settings.fontFamily }">
      <el-row>
        <el-col :span="24" flex justify-end
          ><div :style="{ fontSize: settings.fontSizeCountDown + 'px' }" class="countdown">
            {{ Math.max(((data.targetCast?.overTime ?? 1) - now - ping) / 1000, 0).toFixed(2) }}
          </div></el-col
        >
      </el-row>
      <el-progress
        :percentage="Math.min(((now - (data.targetCast?.startTime ?? 1) + ping) / (data.targetCast?.castTime ?? 1)) * 100, 100)"
        :stroke-width="8"
        :indeterminate="false"
        :show-text="false"
        color="#fbfff9"
        class="progress"
      />
      <el-row>
        <el-col :span="24" flex justify-end
          ><div :style="{ fontSize: settings.fontSizeActionName + 'px' }" class="actionChinese">{{ data.targetCast?.name }}</div></el-col
        >
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
    url("//cdn.diemoe.net/files/fonts/SmartisanHei.woff2") format("woff2"), url("//cdn.diemoe.net/files/fonts/SmartisanHei.ttf");
  font-weight: normal;
  font-style: normal;
}
.settings {
  overflow: visible;
  position: fixed;
  right: 5px;
  z-index: 999999;
  height: 90vh;
  color: white;
  text-shadow: -1px 0 1px #000, 0 1px 1px #000, 1px 0 1px #000, 0 -1px 1px #000;
  font-weight: bold;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-content: flex-end;
  > form {
    white-space: nowrap;
    padding: 0px 3px;
  }
  padding-bottom: 25px;
}
.countdown {
  opacity: v-bind(opacityCountdown);
  transform: translateX(v-bind(offsetCountdownX)) translateY(calc(v-bind(offsetCountdownY) * -1));
}
.progress {
  opacity: v-bind(opacityProgress);
}
.actionChinese {
  opacity: v-bind(opacityActionChinese);
  transform: translateX(v-bind(offsetActionChineseX)) translateY(calc(v-bind(offsetActionChineseY) * -1));
}
.el-main {
  width: v-bind(windowWidth);
  color: rgb(254, 254, 253);
  text-shadow: -1px 0 3px #b38915, 0 1px 3px #b38915, 1px 0 3px #b38915, 0 -1px 3px #b38915;
  padding: 10px;
  margin: 0px;
  > * {
    overflow: visible;
  }
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
    :deep(.el-progress-bar__inner) {
      transition-duration: 0s !important;
    }
  }
}
</style>
