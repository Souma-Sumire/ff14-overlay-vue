<template>
  <div id="wrapper">
    <!-- 通用引导界面 -->
    <!-- <UnlockedTextVue></UnlockedTextVue> -->
    <!--时间轴选择列表 -->
    <ul
      v-if="timelinePageData.optionalTimeline.length && runtimeTimeSeconds <= -timelineStore.configValues.preBattle"
      class="optionalTimelines"
    >
      <li v-for="(item, index) in timelinePageData.optionalTimeline" :key="index" @click="selectedTimeline(item)">
        {{ item.name }}
      </li>
    </ul>
    <!-- 时间轴本体 -->
    <TimelineShow
      :config="timelineStore.configValues"
      :lines="timelinePageData.loadedTimeline"
      :runtime="runtimeTimeSeconds"
      :show-style="timelineStore.showStyle"
    ></TimelineShow>
  </div>
</template>

<script lang="ts" setup>
import TimelineShow from "../components/timeline/TimelineShow.vue";
// import UnlockedTextVue from "../components/UnlockedText.vue";
import { reactive, ref } from "vue";
import { useTimelineStore } from "../store/timeline";
import { Job } from "../types/Job";
import { ITimelineLine, ITimeline, ITimelineCondition, TimelineConfigValues, ShowStyle } from "../types/Timeline";
import Swal from "sweetalert2";
import "sweetalert2/src/sweetalert2.scss";

const timelineStore = useTimelineStore();
const timelinePageData = reactive({
  loadedTimeline: [] as ITimelineLine[], //显示在页面上的时间轴
  optionalTimeline: [] as ITimeline[], //有多个供选择的时间轴
});
let baseTimeMs = ref(0); //战斗开始时间 每场战斗中这个值应该是固定的
let runtimeTimeSeconds = ref(0 - timelineStore.configValues.preBattle); //当前进行到多少秒了 相对与baseTime来说 （战斗时间）  时间轴时间将以他为基准进行计算
let offsetTimeMS = ref(0); //sync产生的时间轴偏移 会在baseTimeMs后附加 以影响runtimeTime
let runtimeTimer: NodeJS.Timer; //计时器用以循环刷新界面
let ttsSuppressFlag = true; //防止tts重复
let ttsSuppressMs = 300; // tts重复阈值
let ttsSuppressTimer: NodeJS.Timer; // tts的timeout计时器
//每次get时间轴时被传入的条件对象
let condition: ITimelineCondition = {
  zoneId: "0",
  jobList: ["NONE"],
};
//保存最后一次选择的时间轴，用于团灭时重新加载
let lastUsedTimeline: ITimeline;
let inACTCombat = false;

init();

//页面初始化
function init() {
  addOverlayListener("onLogEvent", handleLogEvent);
  addOverlayListener("onPartyWipe", handlePartyWipe);
  addOverlayListener("onPlayerChangedEvent", handlePlayerChangedEvent);
  addOverlayListener("ChangeZone", handleChangeZone);
  addOverlayListener("BroadcastMessage", handleBroadcastMessage);
  addOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
  startOverlayEvents();
  timelineStore.loadTimelineSettings();
  setTimeout(() => {
    if (!timelinePageData.loadedTimeline.length && !timelinePageData.optionalTimeline.length) {
      getTimeline(condition);
      Swal.fire({
        text: `${timelineStore.allTimelines.length}条时间轴已就绪`,
        timer: 1500,
        showConfirmButton: false,
        backdrop: false,
      });
      if (!window.hasOwnProperty("OverlayPluginApi")) {
        Swal.fire({
          title: "未检测到OverlayPlugin环境",
          text: "请在ACT的悬浮窗插件中添加本网页",
          icon: "warning",
          confirmButtonColor: "#d33",
          confirmButtonText: "我就要在这用！",
        });
      }
    }
  }, 1000);
}

//从数据列表中根据玩家职业与地区获得一个或多个时间轴
function getTimeline(condition: ITimelineCondition) {
  stopTimeline();
  const candidate: ITimeline[] = timelineStore.getTimeline(condition);
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
function mountTimeline(timeline: ITimeline) {
  if (timeline && timeline?.timeline) {
    timelinePageData.loadedTimeline = timelineStore.parseTimeline(timeline.timeline);
    timelinePageData.loadedTimeline.sort((a, b) => a.time - b.time);
    Swal.fire({
      position: "top-end",
      icon: "success",
      text: `加载了${timeline.name}~`,
      showConfirmButton: false,
      timer: 1000,
      backdrop: false,
    });
    lastUsedTimeline = timeline;
  }
}

//停止当前
function stopTimeline() {
  clearInterval(Number(runtimeTimer));
  baseTimeMs.value = 0;
  runtimeTimeSeconds.value = 0 - timelineStore.configValues.preBattle;
  offsetTimeMS.value = 0;
}

//页面时间轴开始播放
function startTimeline(countdownSeconds: number) {
  baseTimeMs.value = new Date().getTime() + countdownSeconds * 1000;
  clearInterval(Number(runtimeTimer));
  runtimeTimer = setInterval(() => {
    runtimeTimeSeconds.value = (new Date().getTime() - baseTimeMs.value + offsetTimeMS.value) / 1000;
    let nextTTSText: string | undefined;
    timelinePageData.loadedTimeline
      .filter((line) => line.tts && !line.alertAlready && line.time - timelineStore.configValues.ttsAdvance <= runtimeTimeSeconds.value)
      .forEach((iLine) => {
        iLine.alertAlready = true;
        if (iLine.tts && ttsSuppressFlag) {
          nextTTSText = iLine.tts;
          ttsSuppressFlag = false;
        }
        if (nextTTSText) cactbotSay(nextTTSText);
      });
  }, timelineStore.configValues.refreshRateMs);
}

//日志
function handleLogEvent(e: any) {
  for (const log of e.detail.logs) {
    let regex: RegExpMatchArray | null;
    if (
      (regex = log.match(/^.{14} (\w+ |)00:(?:00b9|0139)::?(?:距离战斗开始还有|Battle commencing in |戦闘開始まで)(?<cd>\d+)[^（(]+[（(]/i))
    ) {
      //倒计时
      startTimeline(parseInt(regex!.groups!.cd));
      // } else if (
      //   runtimeTimeSeconds.value <= -timelineStore.configValues.preBattle &&
      //   (regex = log.match(/^.{14} (?:LimitBreak|) 24:0000:/))
      // ) {
      //   //LB变空槽且尚未进入播放状态
      //   startTimeline(0);
    } else {
      //是否触发了某行的sync
      const timelineSync = timelinePageData.loadedTimeline.find(
        (item) =>
          item.sync &&
          item.windowBefore &&
          item.windowAfter &&
          item.sync.test(log) &&
          runtimeTimeSeconds.value >= item.time - item.windowBefore &&
          runtimeTimeSeconds.value <= item.time + item.windowAfter
      );
      //如果匹配sync则同步到time，有jump则同步至jump
      if (timelineSync) syncTimeline(timelineSync.jump || timelineSync.time);
    }
  }
}

//同步页面时间轴
function syncTimeline(targetTime: number) {
  offsetTimeMS.value += (targetTime - runtimeTimeSeconds.value) * 1000;
}

//团灭
function handlePartyWipe() {
  mountTimeline(lastUsedTimeline);
}

//玩家状态
function handlePlayerChangedEvent(e: any) {
  condition.jobList = [e.detail.job] as Job[];
}

//切换场景
function handleChangeZone(e: any) {
  condition.zoneId = String(e.zoneID);
  getTimeline(condition);
}

//调用TTS
function cactbotSay(text: string) {
  ttsSuppressFlag = false;
  clearTimeout(Number(ttsSuppressTimer));
  callOverlayHandler({ call: "cactbotSay", text: text });
  ttsSuppressTimer = setTimeout(() => {
    ttsSuppressFlag = true;
  }, ttsSuppressMs);
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
        getTimeline(condition); //获取新数据之后查询一次
        timelineStore.saveTimelineSettings();
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
  if (!inACTCombat && ev.detail.inACTCombat) startTimeline(0);
  if (inACTCombat && !ev.detail.inACTCombat) mountTimeline(lastUsedTimeline);
  inACTCombat = ev.detail.inACTCombat;
}
</script>

<style lang="scss" scoped>
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  user-select: none;
}

#wrapper {
  overflow: hidden;
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
        font-size: 24px;
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
