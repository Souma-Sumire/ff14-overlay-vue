<script lang="ts" setup>
import type { EventMap } from "cactbot/types/event";
import type { ITimeline, ITimelineCondition, ITimelineLine } from "@/types/timeline";
import { Check } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useDev } from "@/composables/useDev";
import { bossPhase } from "@/resources/bossPhase";
import { parseTimeline, useTimelineStore } from "@/store/timeline";
import { tts } from "@/utils/tts";
import {
  addOverlayListener,
  callOverlayHandler,
  removeOverlayListener,
} from "../../cactbot/resources/overlay_plugin_api";
import { useDemo } from "@/composables/useDemo";
import { openExternalUrl } from "@/utils/overlayPlugin";
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useStorage } from "@vueuse/core";
import CommonActWrapper from "@/components/common/ActWrapper.vue";
import { ElIcon } from "element-plus";
import TimelineTimelineShow from "@/components/timeline/TimelineShow.vue";

const timelineStore = useTimelineStore();
const timelinePageData = reactive({
  loadedTimeline: [] as ITimelineLine[], // 显示在页面上的时间轴
  optionalTimeline: [] as ITimeline[], // 有多个供选择的时间轴
  selectedOptionalTimeline: null as ITimeline | null, // 用户选择的可选时间轴
});
const baseTimeMs = ref(0); // 战斗开始时间 每场战斗中这个值应该是固定的
const runtimeTimeSeconds = ref(0 - timelineStore.configValues.preBattle); // 当前进行到多少秒了 相对与baseTime来说 （战斗时间）  时间轴时间将以他为基准进行计算
const offsetTimeMS = ref(0); // sync产生的时间轴偏移 会在baseTimeMs后附加 以影响runtimeTime
let doTTS = false; // 防止tts重复
let playRafId: number | null = null;

// 每次get时间轴时被传入的条件对象
const playerState = useStorage("timeline-condition-2", {
  zoneID: "0",
  jobs: ["NONE"],
  phase: undefined,
} as ITimelineCondition);
const selectedTimelineMemory = useStorage<Record<string, string>>("timeline-selected-memory", {});
const dev = useDev();
const demo = useDemo();

function getTimelineMemoryKey(): string {
  const job = playerState.value.jobs[0] ?? "NONE";
  const phase = playerState.value.phase ?? "";
  return `${playerState.value.zoneID}:${job}:${phase}`;
}

const syncLines = computed(() => timelinePageData.loadedTimeline.filter((item) => item.sync));
const loadedTimelineTTS = computed(() => timelinePageData.loadedTimeline.filter((v) => v.tts));
let nextTTSIndex = 0;

onMounted(() => {
  init();
  sendBroadcastData("hello");
});

// 从数据列表中根据玩家职业与地区获得一个或多个时间轴
function getTimeline() {
  stopTimeline();
  timelinePageData.loadedTimeline.length = 0;
  timelinePageData.optionalTimeline.length = 0;
  const candidate: ITimeline[] = timelineStore.getTimeline(playerState.value);
  if (candidate.length === 1) {
    // 单个结果
    mountTimeline(candidate[0]!);
  } else if (candidate.length > 1) {
    // 多个结果
    timelinePageData.optionalTimeline = candidate;
    const savedName = selectedTimelineMemory.value[getTimelineMemoryKey()];
    const matched = savedName ? candidate.find((t) => t.name === savedName) : undefined;
    mountTimeline(matched ?? candidate[0]!);
  }
}

// 用户选择了某个时间轴
function selectedTimeline(timeline: ITimeline) {
  selectedTimelineMemory.value[getTimelineMemoryKey()] = timeline.name;
  mountTimeline(timeline);
}

// 载入时间轴页面
async function mountTimeline(timeline: ITimeline, stopLoadedTimeline = true) {
  timelinePageData.selectedOptionalTimeline = timeline;
  if (stopLoadedTimeline) {
    stopTimeline();
  }
  doTTS = false;
  if (timeline?.timeline) {
    timelinePageData.loadedTimeline = await parseTimeline(timeline.timeline);
    timelinePageData.loadedTimeline.sort((a, b) => a.time - b.time);
  }
  setTimeout(() => {
    doTTS = true;
  }, 1000);
}

// 停止当前
function stopTimeline() {
  if (playRafId !== null) {
    cancelAnimationFrame(playRafId);
    playRafId = null;
  }
  baseTimeMs.value = 0;
  runtimeTimeSeconds.value = 0 - timelineStore.configValues.preBattle;
  offsetTimeMS.value = 0;
  nextTTSIndex = 0;
  for (const v of timelinePageData.loadedTimeline) v.alertAlready = false;

  for (const v of syncLines.value) v.syncAlready = false;
}

// 页面时间轴开始播放
function startTimeline(countdownSeconds: number, preventTTS = true) {
  if (preventTTS) {
    doTTS = false;
    setTimeout(() => {
      doTTS = true;
    }, 1000);
  }
  runtimeTimeSeconds.value = 0;
  offsetTimeMS.value = 0;
  baseTimeMs.value = Date.now() + countdownSeconds * 1000;
  nextTTSIndex = 0;
  loadedTimelineTTS.value.forEach((v) => {
    v.alertAlready = false;
  });
  if (playRafId === null) play();
}

function play() {
  if (baseTimeMs.value === 0) {
    playRafId = null;
    return;
  }
  runtimeTimeSeconds.value = (Date.now() - baseTimeMs.value + offsetTimeMS.value) / 1000;
  const ttsLines = loadedTimelineTTS.value;
  while (nextTTSIndex < ttsLines.length) {
    const line = ttsLines[nextTTSIndex]!;
    if (line.alertAlready) {
      nextTTSIndex++;
      continue;
    }
    if (line.time - timelineStore.configValues.ttsAdvance > runtimeTimeSeconds.value) break;
    line.alertAlready = true;
    if (line.tts) cactbotSay(line.tts);
    nextTTSIndex++;
    break;
  }
  playRafId = requestAnimationFrame(play);
}
let lastCheckTime = 0;
const handleEnmityTargetData: EventMap["EnmityTargetData"] = (e) => {
  const now = Date.now();
  if (now - lastCheckTime < 1000) return;
  lastCheckTime = now;
  if (!e.Target) return;

  const boss = e.Target.BNpcID;
  const finalIds = bossPhase[Number(playerState.value.zoneID)];
  if (!finalIds) return;
  if (finalIds.bNpcId.includes(boss)) {
    // 选到本体了，以后不会再变回门神了
    removeOverlayListener("EnmityTargetData", handleEnmityTargetData);
    playerState.value.phase = "final";
    getTimeline();
  }
};

const regexes = {
  countdown: /^.{14} 268 10C:.{8}:[^:]+:(?<cd>\d+):00:/i,
  countdownCancel: /^.{14} 269 10D:/i,
  wipe1: /^.{14} Director 21:.{8}:400000(?:0F|10|03)/,
  wipe2: /^.{14} ChatLog 00:0038::end$/,
};

// 日志
function handleLogEvent(e: { detail: { logs: string[] } }) {
  const logs = e.detail.logs;
  const lines = syncLines.value;
  let currentRuntimeSeconds = runtimeTimeSeconds.value;
  for (const log of logs) {
    const countdown = regexes.countdown.exec(log);
    if (countdown) {
      // 倒计时
      startTimeline(Number.parseInt(countdown?.groups?.cd || "0"));
      currentRuntimeSeconds = runtimeTimeSeconds.value;
    } else if (
      regexes.countdownCancel.test(log) ||
      regexes.wipe1.test(log) ||
      regexes.wipe2.test(log)
    ) {
      // 取消倒计时 / 团灭 / 胜利
      stopTimeline();
      currentRuntimeSeconds = runtimeTimeSeconds.value;
    } else {
      // 是否触发了某行的sync
      for (const item of lines) {
        const sync = item.sync;
        if (!sync) continue;
        if (item.syncOnce && item.syncAlready) continue;
        if (currentRuntimeSeconds < item.time - item.windowBefore) continue;
        if (currentRuntimeSeconds > item.time + item.windowAfter) continue;
        if (!sync.test(log)) continue;
        // 如果匹配sync则同步到time，有jump则同步至jump
        item.syncAlready = true;
        syncTimeline(item.jump || item.time);
        currentRuntimeSeconds = runtimeTimeSeconds.value;
        break;
      }
    }
  }
}

// 测试用
function fakeJump(time: number) {
  syncTimeline(time);
}

// 同步页面时间轴
function syncTimeline(targetTime: number) {
  if (baseTimeMs.value === 0) startTimeline(0, false);
  offsetTimeMS.value += (targetTime - runtimeTimeSeconds.value) * 1000;
  loadedTimelineTTS.value.forEach((v) => {
    if (v.time < targetTime) v.alertAlready = true;
  });
  while (
    nextTTSIndex < loadedTimelineTTS.value.length &&
    loadedTimelineTTS.value[nextTTSIndex]?.alertAlready
  ) {
    nextTTSIndex++;
  }
}

// 玩家状态（职业）
const handlePlayerChangedEvent: EventMap["onPlayerChangedEvent"] = (e) => {
  if (playerState.value.jobs[0] !== e.detail.job) {
    playerState.value.jobs[0] = e.detail.job;
    getTimeline();
  }
};

// 切换场景
const handleChangeZone: EventMap["ChangeZone"] = (e) => {
  playerState.value.phase = undefined;
  // 防止重复订阅
  removeOverlayListener("EnmityTargetData", handleEnmityTargetData);
  // 副本有门神本体之分
  if (bossPhase[e.zoneID]) {
    // 直接设定为门神
    playerState.value.phase = "door";
    // 订阅目标事件
    addOverlayListener("EnmityTargetData", handleEnmityTargetData);
  }
  playerState.value.zoneID = e.zoneID.toString();
  getTimeline();
};

// 调用TTS
function cactbotSay(text: string, force = false) {
  if (!text) return;
  if (doTTS || force) tts(text);
}

function testAlert() {
  ElMessage.closeAll();
  ElMessage({
    message: "弹窗测试",
    type: "success",
    duration: 0,
    showClose: true,
  });
}

// 发送数据
function sendBroadcastData(type: "get" | "post" | "success" | "hello", data: any = {}): void {
  callOverlayHandler({
    call: "broadcast",
    source: "soumaTimeline",
    msg: {
      type,
      data,
    },
  });
}

// 接受广播
const handleBroadcastMessage: EventMap["BroadcastMessage"] = (e) => {
  if (e.source !== "soumaTimelineSettings") {
    return;
  }
  const msg = e.msg as { type: string; data?: any };
  if (msg.type === "post") {
    const data = (msg as { data: typeof timelineStore.$state }).data;
    for (const v of data.allTimelines) {
      timelineStore.normalizeTimeline(v);
    }
    timelineStore.allTimelines = data.allTimelines;
    timelineStore.configValues = data.configValues;
    timelineStore.showStyle = data.showStyle;
    timelineStore.saveTimelineSettings();
    ElMessage.closeAll();
    ElMessage({
      message: "已更新数据",
      type: "success",
      duration: 3000,
      showClose: false,
    });
    getTimeline(); // 获取新数据之后查询一次
    sendBroadcastData("success");
  }
  if (msg.type === "get") {
    sendBroadcastData("post", timelineStore.$state); // 发送数据
  }
};
function handleInCombatChanged(ev: {
  type: "onInCombatChangedEvent";
  detail: {
    inGameCombat: boolean;
    inACTCombat: boolean;
  };
}) {
  if (ev.detail.inGameCombat && ev.detail.inACTCombat && baseTimeMs.value === 0) startTimeline(0);
  else if (!ev.detail.inGameCombat && !ev.detail.inACTCombat) stopTimeline();
}

async function handleOpenSettings() {
  try {
    await openExternalUrl("#/timelineSettings");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ElMessage.closeAll();
    if (message.includes("WSServer")) {
      ElMessage({
        message:
          "打开编辑页面失败：请先在 OverlayPlugin 的「OverlayPlugin WSServer」设置（「直播/本地共享悬浮窗」）中点击「启动」以启用服务",
        type: "error",
        duration: 8000,
        showClose: true,
      });
    } else {
      ElMessage({
        message: `打开编辑页面失败：${message}`,
        type: "error",
        duration: 8000,
        showClose: true,
      });
    }
  }
}

function init() {
  addOverlayListener("onLogEvent", handleLogEvent);
  addOverlayListener("onPlayerChangedEvent", handlePlayerChangedEvent);
  addOverlayListener("ChangeZone", handleChangeZone);
  addOverlayListener("BroadcastMessage", handleBroadcastMessage);
  addOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
  timelineStore.loadTimelineSettings();
  ElMessage({
    message: `${timelineStore.allTimelines.length}条时间轴已就绪`,
    type: "info",
    duration: 1000,
    showClose: false,
  });
}

onUnmounted(() => {
  stopTimeline();
  removeOverlayListener("onLogEvent", handleLogEvent);
  removeOverlayListener("onPlayerChangedEvent", handlePlayerChangedEvent);
  removeOverlayListener("ChangeZone", handleChangeZone);
  removeOverlayListener("BroadcastMessage", handleBroadcastMessage);
  removeOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
  removeOverlayListener("EnmityTargetData", handleEnmityTargetData);
});
</script>

<template>
  <CommonActWrapper>
    <div id="wrapper">
      <section
        v-if="
          timelinePageData.optionalTimeline.length &&
          runtimeTimeSeconds <= -timelineStore.configValues.preBattle
        "
        class="optional-timelines"
        aria-label="选择时间轴"
      >
        <div class="optional-header">选择一个时间轴</div>
        <ul class="optional-list">
          <li
            v-for="(item, index) in timelinePageData.optionalTimeline"
            :key="index"
            class="optional-item"
            :class="{ active: timelinePageData.selectedOptionalTimeline === item }"
          >
            <button
              type="button"
              class="optional-btn"
              :aria-pressed="timelinePageData.selectedOptionalTimeline === item"
              @click="selectedTimeline(item)"
            >
              <span class="optional-name">{{ item.name }}</span>
              <el-icon
                v-if="timelinePageData.selectedOptionalTimeline === item"
                class="optional-check"
              >
                <Check />
              </el-icon>
            </button>
          </li>
        </ul>
      </section>
      <timeline-timeline-show
        :config="timelineStore.configValues"
        :lines="timelinePageData.loadedTimeline"
        :runtime="runtimeTimeSeconds"
        :show-style="timelineStore.showStyle"
      />
      <div v-if="dev" class="dev-toolbar">
        <button type="button" @click="getTimeline()">获取时间轴</button>
        <button type="button" @click="startTimeline(30)">开始从-30</button>
        <button type="button" @click="startTimeline(0)">开始从0</button>
        <button type="button" @click="stopTimeline()">团灭</button>
        <button type="button" @click="fakeJump(1000)">跳转1000测试</button>
        <button type="button" @click="tts('今天天气真不错')">TTS测试</button>
        <button type="button" @click="testAlert">弹窗测试</button>
        <span class="dev-runtime">{{ runtimeTimeSeconds.toFixed(1) }}s</span>
      </div>
    </div>
    <template #readme>
      <div v-if="demo" class="unlocked-toolbar">
        <button type="button" class="open-settings-btn" @click="handleOpenSettings">
          打开时间轴设置
        </button>
        <p v-if="playerState.jobs[0] === 'NONE'" class="overlay-hint">
          未检测到职业：请在 ACT 中启用 <code>CactbotOverlay.dll</code>
        </p>
      </div>
    </template>
  </CommonActWrapper>
</template>

<style lang="scss">
::-webkit-scrollbar {
  display: none !important;
}
</style>

<style lang="scss" scoped>
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  user-select: none;
}

#wrapper {
  overflow: hidden;
  user-select: none;
  min-height: 100px;
}

.optional-timelines {
  width: fit-content;
  min-width: 176px;
  max-width: 280px;
  margin: 4px 6px 8px;
  background-color: rgba(18, 20, 26, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  font-family: "PingFang SC", "Microsoft YaHei UI", sans-serif;
}

.optional-header {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.78);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.04);
}

.optional-list {
  list-style: none;
  display: flex;
  flex-direction: column;
}

.optional-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &:last-child {
    border-bottom: none;
  }

  &.active .optional-btn {
    background-color: rgba(64, 158, 255, 0.24);
    color: #ffffff;
    font-weight: 600;
  }
}

.optional-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  &:focus-visible {
    outline: 2px solid #409eff;
    outline-offset: -2px;
  }
}

.optional-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.optional-check {
  flex-shrink: 0;
  color: #79bbff;
}

.dev-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin: 6px;

  button {
    padding: 3px 8px;
    font-size: 12px;
    color: #f3f4f6;
    background-color: rgba(24, 27, 34, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background-color: rgba(45, 51, 64, 0.95);
    }
  }

  .dev-runtime {
    padding: 2px 6px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: #ffffff;
    background-color: rgba(0, 0, 0, 0.85);
    border-radius: 4px;
  }
}

.unlocked-toolbar {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 9999;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  font-family: "PingFang SC", "Microsoft YaHei UI", sans-serif;
}

.open-settings-btn {
  padding: 5px 12px;
  cursor: pointer;
  background-color: rgba(22, 25, 32, 0.92);
  color: #f9fafb;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease;

  &:hover {
    background-color: rgba(38, 43, 54, 0.96);
    border-color: rgba(121, 187, 255, 0.7);
  }

  &:active {
    background-color: rgba(15, 17, 22, 0.98);
  }

  &:focus-visible {
    outline: 2px solid #409eff;
    outline-offset: 2px;
  }
}

.overlay-hint {
  max-width: 240px;
  padding: 5px 9px;
  font-size: 11px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.9);
  background-color: rgba(20, 22, 28, 0.88);
  border: 1px solid rgba(230, 162, 60, 0.45);
  border-radius: 5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #f3d19e;
  }
}
</style>
