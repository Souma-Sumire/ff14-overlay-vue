<script lang="ts" setup>
import Swal from "sweetalert2";
import "@sweetalert2/theme-bootstrap-4/bootstrap-4.scss";
import { useTimelineStore, parseTimeline } from "@/store/timeline";
import { ITimeline, ITimelineCondition, ITimelineLine, ShowStyle, TimelineConfigValues } from "@/types/timeline";

const timelineStore = useTimelineStore();
const timelinePageData = reactive({
  loadedTimeline: [] as ITimelineLine[], //显示在页面上的时间轴
  optionalTimeline: [] as ITimeline[], //有多个供选择的时间轴
});
const baseTimeMs = ref(0); //战斗开始时间 每场战斗中这个值应该是固定的
const runtimeTimeSeconds = ref(0 - timelineStore.configValues.preBattle); //当前进行到多少秒了 相对与baseTime来说 （战斗时间）  时间轴时间将以他为基准进行计算
const offsetTimeMS = ref(0); //sync产生的时间轴偏移 会在baseTimeMs后附加 以影响runtimeTime
// let runtimeTimer: NodeJS.Timer; //计时器用以循环刷新界面
let doTTS = false; //防止tts重复
// let ttsSuppressMs = 300; // tts重复阈值
//每次get时间轴时被传入的条件对象
const condition = useStorage("timeline-condition", {
  zoneId: "0",
  job: "NONE",
} as ITimelineCondition);
const devMode = ref(window.location.href.match(/localhost/) || new URLSearchParams(location.hash.split("?")[1]).get("dev") === "1");
//保存最后一次选择的时间轴，用于团灭时重新加载
// let lastUsedTimeline: ITimeline;

const syncLines = computed(() => timelinePageData.loadedTimeline.filter((item) => item.sync));
const loadedTimelineTTS = computed(() => timelinePageData.loadedTimeline.filter((v) => v.tts));
init();

//页面初始化
function init() {
  addOverlayListener("onLogEvent", handleLogEvent);
  addOverlayListener("onPlayerChangedEvent", handlePlayerChangedEvent);
  addOverlayListener("ChangeZone", handleChangeZone);
  addOverlayListener("BroadcastMessage", handleBroadcastMessage);
  addOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
  startOverlayEvents();
  timelineStore.loadTimelineSettings();
  if (!Swal.isVisible()) {
    Swal.fire({
      text: `${timelineStore.allTimelines.length}条时间轴已就绪`,
      showConfirmButton: false,
      timer: 1500,
      backdrop: false,
    });
  }
  getTimeline(condition.value);
}
function openSettings() {
  const windowsOpen = window.open("/ff14-overlay-vue/#/timelineSettings?timestamp=" + new Date().getTime(), "_blank", "width=1200,height=800");
  const loop = setInterval(function () {
    if (windowsOpen?.closed) {
      clearInterval(loop);
      timelineStore.loadTimelineSettings();
      getTimeline(condition.value);
    }
  }, 500);
}

//从数据列表中根据玩家职业与地区获得一个或多个时间轴
function getTimeline(condition: ITimelineCondition) {
  stopTimeline();
  timelinePageData.loadedTimeline.length = 0;
  timelinePageData.optionalTimeline.length = 0;
  let candidate: ITimeline[] = timelineStore.getTimeline(condition);
  if (candidate.length === 1) {
    //单个结果
    mountTimeline(candidate[0]);
  } else if (candidate.length > 1) {
    //多个结果
    timelinePageData.optionalTimeline = candidate;
  }
}

//用户选择了某个时间轴
function selectedTimeline(timeline: ITimeline) {
  mountTimeline(timeline);
}

//载入时间轴页面
async function mountTimeline(timeline: ITimeline, stopLoadedTimeline: boolean = true) {
  stopLoadedTimeline && stopTimeline();
  doTTS = false;
  if (timeline && timeline?.timeline) {
    timelinePageData.loadedTimeline = await parseTimeline(timeline.timeline);
    timelinePageData.loadedTimeline.sort((a, b) => a.time - b.time);
    Swal.fire({
      position: "top-end",
      icon: "success",
      text: `加载了${timeline.name}~`,
      showConfirmButton: false,
      timer: 1000,
      backdrop: false,
    });
    // lastUsedTimeline = timeline;
  }
  setTimeout(() => (doTTS = true), 1000);
}

//停止当前
function stopTimeline() {
  // clearInterval(Number(runtimeTimer));
  baseTimeMs.value = 0;
  runtimeTimeSeconds.value = 0 - timelineStore.configValues.preBattle;
  offsetTimeMS.value = 0;
  timelinePageData.loadedTimeline.map((v) => (v.alertAlready = false));
}

//页面时间轴开始播放
function startTimeline(countdownSeconds: number, preventTTS = true) {
  if (preventTTS) {
    doTTS = false;
    setTimeout(() => (doTTS = true), 1000);
  }
  runtimeTimeSeconds.value = 0;
  offsetTimeMS.value = 0;
  baseTimeMs.value = new Date().getTime() + countdownSeconds * 1000;
  loadedTimelineTTS.value.map((v) => (v.alertAlready = false));
  play();
}

function play() {
  if (baseTimeMs.value === 0) return;
  runtimeTimeSeconds.value = (new Date().getTime() - baseTimeMs.value + offsetTimeMS.value) / 1000;
  const l = loadedTimelineTTS.value.find((v) => !v.alertAlready && v.time - timelineStore.configValues.ttsAdvance <= runtimeTimeSeconds.value);
  if (l) {
    l.alertAlready = true;
    cactbotSay(l.tts!);
  }
  requestAnimationFrame(play);
}
//日志
function handleLogEvent(e: { detail: { logs: string[] } }) {
  for (const log of e.detail.logs) {
    let regex = log.match(/^.{14} \w+ 00:(?:00b9|0[12]39)::?(?:距离战斗开始还有|Battle commencing in |戦闘開始まで)(?<cd>\d+)[^（(]+[（(]/i);
    if (regex) {
      //倒计时
      startTimeline(parseInt(regex!.groups!.cd));
    } else if (/^.{14} Director 21:.{8}:4000000F/.test(log) || /^.{14} ChatLog 00:0038::end$/.test(log) || /^.{14} SystemLogMessage 29:.{8}:B1C:/.test(log)) {
      //团灭
      stopTimeline();
      // mountTimeline(lastUsedTimeline);
    } else {
      //是否触发了某行的sync
      const timelineSync = syncLines.value.find((item) => {
        // console.log(item.sync, log);
        return (
          item.sync!.test(log) && runtimeTimeSeconds.value >= item.time - item.windowBefore && runtimeTimeSeconds.value <= item.time + Number(item.windowAfter)
        );
      });
      //如果匹配sync则同步到time，有jump则同步至jump
      if (timelineSync) syncTimeline(timelineSync.jump || timelineSync.time);
    }
    if (/^.{14} ChatLog 00:0038::/.test(log)) {
      //echo
      const name = log.match(/^.{14} ChatLog 00:0038::(?<name>.+)$/)?.groups?.name;
      if (name) {
        const timeline = timelineStore.getTimeline(condition.value).find((c) => c.name === name);
        timeline && mountTimeline(timeline, false);
      }
    }
  }
}

//测试用
function fakeJump(time: number) {
  syncTimeline(time);
}

//同步页面时间轴
function syncTimeline(targetTime: number) {
  if (baseTimeMs.value === 0) startTimeline(0, false);
  offsetTimeMS.value += (targetTime - runtimeTimeSeconds.value) * 1000;
  loadedTimelineTTS.value.map((v) => {
    if (v.time < targetTime) v.alertAlready = true;
  });
}

//玩家状态（职业）
function handlePlayerChangedEvent(e: any) {
  if (e.detail.job !== condition.value.job) {
    condition.value.job = e.detail.job;
    getTimeline(condition.value);
  } else {
    condition.value.job = e.detail.job;
  }
}

//切换场景
function handleChangeZone(e: any) {
  condition.value.zoneId = String(e.zoneID);
  // lastUsedTimeline = { name: "", condition: { zoneId: "", job: "NONE" }, timeline: "", codeFight: "", create: "" };
  getTimeline(condition.value);
}

//调用TTS
function cactbotSay(text: string, force: boolean = false) {
  if (!text) return;
  if (doTTS || force) callOverlayHandler({ call: "cactbotSay", text: text });
}

//接受广播
function handleBroadcastMessage(e: {
  type: string;
  source: string;
  msg: {
    store: {
      allTimelines: ITimeline[];
      configValues: TimelineConfigValues;
      showStyle: ShowStyle;
    };
  };
}) {
  if (e.source === "soumuaTimelineSetting" && e.msg.store) {
    Swal.fire({
      text: `接受到${e.msg.store.allTimelines.length}个时间轴`,
      showDenyButton: true,
      denyButtonText: "覆盖",
      showConfirmButton: true,
      confirmButtonText: "追加",
      showCancelButton: true,
      cancelButtonText: "放弃",
      backdrop: false,
    }).then((result) => {
      if (result.isConfirmed || result.isDenied) {
        if (result.isDenied) timelineStore.allTimelines.length = 0;
        timelineStore.allTimelines = e.msg.store.allTimelines;
        timelineStore.configValues = e.msg.store.configValues;
        timelineStore.showStyle = e.msg.store.showStyle;
        timelineStore.saveTimelineSettings();
        Swal.fire("接受成功");
        getTimeline(condition.value); //获取新数据之后查询一次
      }
    });
  }
}
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
</script>
<template>
  <div id="wrapper">
    <svg
      v-show="baseTimeMs === 0"
      @click="openSettings()"
      t="1652767124032"
      class="icon"
      viewBox="0 0 1030 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="2215"
      width="16"
      height="16"
    >
      <path
        d="M943.321212 577.163636c12.412121 18.618182 31.030303 31.030303 55.854546 37.236364 6.206061 0 12.412121 6.206061 12.412121 6.206061 6.206061 6.206061 18.618182 18.618182 18.618182 31.030303v24.824242c-6.206061 24.824242-12.412121 43.442424-24.824243 62.060606l-6.20606 12.412121c-6.206061 12.412121-12.412121 18.618182-24.824243 24.824243-6.206061 6.206061-18.618182 6.206061-24.824242 6.20606-6.206061 0-12.412121 0-18.618182-6.20606-18.618182-6.206061-37.236364-6.206061-55.854546-6.206061h6.206061-12.412121c-18.618182 0-31.030303 6.206061-43.442424 12.412121 0 0-12.412121 6.206061-24.824243 18.618182-12.412121 12.412121-24.824242 37.236364-24.824242 62.060606 0 18.618182 0 37.236364 12.412121 62.060606 6.206061 12.412121 6.206061 31.030303-6.206061 43.442425-12.412121 12.412121-24.824242 18.618182-37.236363 24.824242-6.206061 6.206061-37.236364 18.618182-68.266667 24.824242 37.236364-6.206061 12.412121 0-12.412121 0h-6.206061c-6.206061 0-12.412121 0-18.618182-6.20606-6.206061-6.206061-12.412121-12.412121-12.412121-24.824243v6.206061c-12.412121-31.030303-31.030303-55.854545-55.854545-68.266667 0-6.206061-24.824242-12.412121-49.648485-12.412121s-49.648485 6.206061-68.266667 24.824243c-24.824242 18.618182-43.442424 43.442424-49.648485 74.472727 0-6.206061-6.206061 0-12.412121 0 0 0-12.412121 6.206061-18.618182 6.20606-12.412121 0-18.618182 0-37.236363-6.20606-12.412121-6.206061-24.824242-6.206061-37.236364-12.412121l-37.236364-18.618182c-12.412121-6.206061-18.618182-12.412121-24.824242-24.824243-6.206061-6.206061-6.206061-12.412121-6.206061-18.618181 0-6.206061 0-18.618182 6.206061-31.030304 6.206061-6.206061 12.412121-24.824242 12.412121-49.648484s-12.412121-43.442424-31.030303-62.060606c-12.412121-12.412121-24.824242-18.618182-43.442424-24.824243h-24.824242-6.206061c-12.412121 0-31.030303 6.206061-49.648485 6.206061h-12.412121c-6.206061 0-12.412121 0-18.618182-6.206061-6.206061 0-12.412121-12.412121-24.824242-18.618182-18.618182-31.030303-31.030303-68.266667-37.236364-105.50303v-6.206061c0-18.618182 12.412121-24.824242 24.824242-31.030303 24.824242-6.206061 43.442424-24.824242 62.060606-43.442424 18.618182-6.206061 24.824242-31.030303 24.824243-55.854545s-6.206061-49.648485-24.824243-68.266667C62.060606 415.806061 31.030303 397.187879 0 390.981818c18.618182 6.206061 12.412121 0 12.412121-6.20606-6.206061-6.206061-6.206061-18.618182-6.20606-24.824243 0-6.206061 0-18.618182 6.20606-31.030303 6.206061-24.824242 18.618182-49.648485 31.030303-68.266667-12.412121 24.824242-6.206061 12.412121 0 6.206061 0-12.412121 6.206061-18.618182 12.412121-24.824242 6.206061 0 6.206061-6.206061 12.412122-6.206061s12.412121 0 18.618181 6.206061c24.824242 6.206061 49.648485 12.412121 74.472728 6.20606 24.824242 0 43.442424-12.412121 62.060606-31.030303 12.412121-12.412121 18.618182-24.824242 18.618182-43.442424 6.206061 0 6.206061-12.412121 6.20606-24.824242v-18.618182-18.618182c0-18.618182-6.206061-43.442424-12.412121-62.060606 6.206061 31.030303 0 18.618182 0 6.20606v0c12.412121-6.206061 18.618182-12.412121 31.030303-18.618181l37.236364-18.618182c12.412121-6.206061 24.824242-6.206061 37.236363-12.412121 12.412121-6.206061 24.824242-6.206061 31.030303-6.206061 12.412121 0 18.618182 0 24.824243 12.412121 6.206061 6.206061 12.412121 18.618182 12.412121 31.030303 6.206061 12.412121 18.618182 24.824242 37.236364 43.442424s37.236364 24.824242 62.060606 24.824243 49.648485-6.206061 68.266666-18.618182c24.824242-24.824242 37.236364-43.442424 43.442425-68.266667 0-6.206061 6.206061-12.412121 12.412121-18.618181 6.206061 0 12.412121-6.206061 18.618182-6.206061 12.412121 0 18.618182 0 31.030303 6.206061 12.412121 0 24.824242 6.206061 37.236363 12.412121 12.412121 6.206061 24.824242 12.412121 31.030303 18.618182 12.412121 6.206061 18.618182 18.618182 24.824243 24.824242 0 6.206061 6.206061 6.206061 6.20606 12.412121v6.206061c0 6.206061-6.206061 18.618182-6.20606 24.824242 0 6.206061-6.206061 24.824242-6.206061 37.236364v18.618182c6.206061 24.824242 12.412121 43.442424 31.030303 62.060606 18.618182 18.618182 37.236364 24.824242 62.060606 31.030303 24.824242 0 49.648485 0 68.266667-12.412121 6.206061 0 12.412121-6.206061 18.618182-6.206061h6.20606c6.206061 0 18.618182 6.206061 24.824243 12.412121 12.412121 12.412121 18.618182 24.824242 31.030303 43.442424 6.206061 18.618182 12.412121 43.442424 18.618182 62.060607 0 12.412121 0 24.824242-6.206061 31.030303-6.206061 6.206061-12.412121 12.412121-24.824242 18.618181-24.824242 6.206061-49.648485 31.030303-62.060606 55.854546-6.206061 6.206061-12.412121 24.824242-12.412122 49.648485-6.206061 24.824242 0 49.648485 18.618182 68.266666zM682.666667 341.333333c-43.442424-43.442424-105.50303-68.266667-167.563637-68.266666-31.030303 0-62.060606 6.206061-93.090909 18.618181-43.442424 18.618182-80.678788 49.648485-105.50303 86.884849-6.206061-6.206061-24.824242 37.236364-37.236364 80.678788 0-18.618182-6.206061 12.412121-6.20606 49.648485 0 31.030303 6.206061 62.060606 18.618181 93.090909 12.412121 31.030303 31.030303 55.854545 49.648485 74.472727 18.618182 24.824242 49.648485 37.236364 74.472728 49.648485 31.030303 12.412121 62.060606 18.618182 93.090909 18.618182s62.060606-6.206061 93.090909-18.618182c43.442424-18.618182 80.678788-49.648485 105.50303-86.884849-6.206061 12.412121 12.412121-12.412121 24.824243-43.442424 12.412121-31.030303 18.618182-62.060606 18.618181-93.090909s-6.206061-62.060606-18.618181-93.090909C713.69697 372.363636 682.666667 335.127273 645.430303 310.30303l37.236364 31.030303z"
        p-id="2216"
      ></path>
    </svg>
    <ul v-if="timelinePageData.optionalTimeline.length && runtimeTimeSeconds <= -timelineStore.configValues.preBattle" class="optionalTimelines">
      <li v-for="(item, index) in timelinePageData.optionalTimeline" :key="index" @click="selectedTimeline(item)">
        {{ item.condition.job }} - {{ item.name }}
      </li>
    </ul>
    <timeline-timeline-show
      :config="timelineStore.configValues"
      :lines="timelinePageData.loadedTimeline"
      :runtime="runtimeTimeSeconds"
      :show-style="timelineStore.showStyle"
    ></timeline-timeline-show>
    <button v-if="devMode" @click="startTimeline(30)">开始从-30</button>
    <button v-if="devMode" @click="startTimeline(0)">开始从0</button>
    <button v-if="devMode" @click="stopTimeline()">团灭</button>
    <button v-if="devMode" @click="fakeJump(1000)">跳转1000测试</button>
    <button v-if="devMode" @click="cactbotSay('今天天气真不错', true)">TTS测试</button>
    <span v-if="devMode" style="color: white; background-color: black">{{ runtimeTimeSeconds }}</span>
  </div>
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
  .icon {
    background-color: rgba($color: #000000, $alpha: 0.01);
    cursor: pointer;
    // filter: brightness(0.8);
    filter: drop-shadow(1px 2px 1px black);
    fill: blueviolet;
    opacity: 0.8;
    transition-duration: 0.2s;
    position: fixed;
    top: 0;
    right: 0;
    margin: 5px;
    &:hover {
      opacity: 1;
      transform-origin: center center;
      transform: scale(1.2);
    }
  }
  .optionalTimelines {
    display: flex;
    list-style: none;
    flex-direction: column;
    font-size: 16px;
    font-weight: bold;
    line-height: 2em;
    li {
      background-color: lightblue;
      margin: 2px;
      padding-left: 12px;
      &:hover {
        cursor: pointer;
        transition-duration: 0.2s;
        font-size: 20px;
      }
    }
  }
  footer {
    position: fixed;
    bottom: 0;
    right: 0;
  }
}
</style>
