<template>
  <el-container class="container">
    <el-header>
      <el-button type="primary" @click="newDemoTimeline()">新建</el-button>
      <el-button @click="fflogsImportClick()">从FFlogs导入</el-button>
      <el-button @click="showSettings = !showSettings" color="#626aef" style="color: white">样式设置</el-button>
      <el-button @click="importTimelines">导入</el-button>
      <el-button class="export" @click="exportTimeline(timelines)">全部导出</el-button>
      <el-button v-if="isWSMode" type="success" @click="broadcastData()">通过WS发送到悬浮窗</el-button>
      <!-- <el-button v-if="!isWSMode" type="success" @click="applyData()">应用</el-button> -->
    </el-header>
    <el-main>
      <FFlogsImport
        :settings="timelineStore.settings"
        :filters="timelineFilters"
        v-if="showFFlogs"
        @clearCurrentlyTimeline="clearCurrentlyTimeline"
        @showFFlogsToggle="() => (showFFlogs = !showFFlogs)"
        @newTimeline="timelineStore.newTimeline"
      >
      </FFlogsImport>
      <el-card class="box-card" v-show="showSettings">
        <el-descriptions title="时间轴参数" size="small" style="width: 100%" border>
          <el-descriptions-item
            v-for="(_value, key, index) in timelineStore.configValues"
            :key="index"
            :label="timelineStore.configTranslate[key]"
            label-align="right"
            align="center"
            width="16em"
          >
            <el-input-number :min="0" :step="0.1" v-model="timelineStore.configValues[key]" />
          </el-descriptions-item>
        </el-descriptions>
        <br />
        <el-descriptions size="small" title="时间轴样式" style="width: 100%" border>
          <el-descriptions-item
            v-for="(_value, key, index) in timelineStore.showStyle"
            :key="index"
            :label="timelineStore.showStyleTranslate[key]"
            label-align="right"
            align="center"
            width="16em"
          >
            <el-input-number :min="0" :step="0.01" v-model="timelineStore.showStyle[key]" />
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
      <br />
      <el-card v-show="timelineCurrentlyEditing.timeline.create !== '空'">
        <div class="slider-demo-block">
          <span>模拟时间：</span>
          <el-slider v-model="simulatedCombatTime" :min="-30" :max="1500" :step="0.1" show-input> </el-slider>
        </div>
        <el-row class="timeline-info">
          <div>
            <p class="timeline-info-config">
              <span>名称：</span> <el-input v-model="timelineCurrentlyEditing.timeline.name" class="timeline-info-name"></el-input>
            </p>
            <p class="timeline-info-config">
              <span>地图：</span>
              <el-select v-model="timelineCurrentlyEditing.timeline.condition.zoneId" filterable>
                <el-option v-for="zone in highDifficultZoneId" :key="zone.id" :label="zone.name" :value="zone.id"></el-option>
              </el-select>
            </p>
            <p class="timeline-info-config">
              <span>职业：</span>
              <el-select v-model="timelineCurrentlyEditing.timeline.condition.job" required placeholder="职业">
                <el-option v-for="job in Util.getBattleJobs2()" :key="job" :label="Util.nameToCN(job).full" :value="job"></el-option>
              </el-select>
            </p>
            <p class="timeline-info-config">
              <span>来源：</span>
              <el-input v-model="timelineCurrentlyEditing.timeline.codeFight" disabled />
            </p>
            <p class="timeline-info-config">
              <span>创建：</span>
              <el-input v-model="timelineCurrentlyEditing.timeline.create" disabled />
            </p>
            <el-button type="success" @click="checkTimelineRaw(timelineCurrentlyEditing.timeline)">检查</el-button>
            <el-button class="export" @click="exportTimeline([timelineCurrentlyEditing.timeline])">单独导出</el-button>
            <el-button type="danger" @click="deleteTimeline(timelineCurrentlyEditing.timeline)">删除</el-button>
          </div>
          <div style="flex: 1">
            <el-input
              class="timeline-timeline-raw"
              v-model="timelineCurrentlyEditing.timeline.timeline"
              type="textarea"
              :rows="12"
              wrap="off"
              placeholder="请键入时间轴文本"
            />
          </div>
          <div style="max-height: 353px">
            <div class="timeline-timeline-view">
              <TimelineShowVue
                :config="timelineStore.configValues"
                :lines="timelineStore.parseTimeline(timelineCurrentlyEditing.timeline.timeline)"
                :runtime="simulatedCombatTime"
                :show-style="timelineStore.showStyle"
              ></TimelineShowVue>
            </div>
          </div>
        </el-row>
        <br />
      </el-card>
      <br />
      <el-card v-if="timelines.length > 0">
        <el-table :data="timelines" stripe style="width: 100%" :default-sort="{ prop: 'conditon.job', order: 'descending' }">
          <el-table-column prop="name" label="名称" sortable> </el-table-column>
          <el-table-column prop="conditon" label="地图" sortable>
            <template #default="scope">
              {{ highDifficultZoneId.find((value) => value.id === scope.row.condition.zoneId)?.name }}
            </template>
          </el-table-column>
          <el-table-column prop="conditon" label="职业" sortable>
            <template #default="scope">
              {{ Util.nameToCN(scope.row.condition.job).simple2 }}
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="100">
            <template #default="scope">
              <el-button @click="editTimeline(scope.row)" type="text" size="small">编辑</el-button>
            </template>
          </el-table-column>
        </el-table></el-card
      >
      <el-card v-if="timelines.length === 0"> <el-empty description="点击上方新建或导入一个时间轴吧~"></el-empty></el-card>
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import Swal from "sweetalert2";
import "sweetalert2/src/sweetalert2.scss";
import { reactive, ref, toRef, watchEffect } from "vue";
import FFlogsImport from "./FFlogsImport.vue";
import TimelineShowVue from "./TimelineShow.vue";
import zoneInfo from "../../resources/zoneInfo";
import { useTimelineStore } from "../../store/timeline";
import { ITimeline } from "../../types/Timeline";
import Util from "../../utils/util";
import "animate.css";
import ClipboardJS from "clipboard";

const simulatedCombatTime = ref(-30);
const timelineStore = useTimelineStore();
const timelines = toRef(timelineStore, "allTimelines");
const timelineFilters = toRef(timelineStore, "filters");
const highDifficultZoneId: { id: string; name: string }[] = [{ id: "0", name: "任意" }];
const showFFlogs = ref(false);
const showSettings = ref(false);
let timelineCurrentlyEditing: { timeline: ITimeline } = reactive({
  timeline: { name: "空", condition: { zoneId: "0", job: "NONE" }, timeline: "空", codeFight: "空", create: "空" },
});
const isWSMode = location.href.includes("OVERLAY_WS=");

init();

function init(): void {
  for (const key in zoneInfo) {
    if (Object.prototype.hasOwnProperty.call(zoneInfo, key)) {
      const element = zoneInfo[key];
      switch (element.contentType) {
        case 4:
        case 5:
        case 28:
          highDifficultZoneId.push({ id: key, name: element.name?.cn ?? element.name?.ja ?? element.name?.ja ?? key });
      }
    }
  }
  loadTimelineStoreData();
  timelineStore.sortTimelines();
  saveTimelineStoreData();
}

function applyData(): void {
  callOverlayHandler({
    call: "broadcast",
    source: "soumuaTimelineSetting",
    msg: {
      store: timelineStore.$state,
    },
  });
}

//通信数据
function broadcastData(): void {
  if (!!urlTool({ url: location.href })?.OVERLAY_WS) {
    applyData();
    Swal.fire({
      title: "已尝试进行通信,请检查ACT悬浮窗是否接收",
      text: "若无法通信，可将本页面直接添加到ACT悬浮窗进行编辑，设置将会自动保存。（编辑后刷新一下时间轴网页）",
    });
  } else {
    Swal.fire({
      icon: "error",
      title: "目前与ACT断开了连接。",
      text: '请启用ACT OverlayPlugin WSServer，并使本页面url参数中的端口号与其保持一致：OVERLAY_WS=ws://127.0.0.1:端口号/ws"',
    });
  }
}

//获取URL参数
function urlTool({ url }: { url: string }): any {
  const array = url.split("?")!.pop()!.split("&");
  const data: any = {};
  array!.forEach((ele) => {
    let dataArr = ele.split("=");
    data[dataArr[0]] = dataArr[1];
  });
  return data;
}

function fflogsImportClick(): void {
  showFFlogs.value = !showFFlogs.value;
  clearCurrentlyTimeline();
}

function clearCurrentlyTimeline(): void {
  timelineCurrentlyEditing.timeline = {
    name: "空",
    condition: { zoneId: "0", job: "NONE" },
    timeline: "空",
    codeFight: "空",
    create: "空",
  };
}

function newDemoTimeline(): void {
  clearCurrentlyTimeline();
  timelineStore.newTimeline();
}

function editTimeline(timeline: ITimeline): void {
  timelineCurrentlyEditing.timeline = timeline;
}

//删除某时间轴 来自点击事件
function deleteTimeline(target: ITimeline): void {
  Swal.fire({
    title: `确定要删除${target.name}吗？`,
    text: "这将无法撤回！",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
  }).then((result) => {
    if (result.isConfirmed) {
      clearCurrentlyTimeline();
      timelines.value.splice(
        timelines.value.findIndex((v) => v === target),
        1
      );
    }
  });
}

//初始化时load
function loadTimelineStoreData(): void {
  timelineStore.loadTimelineSettings();
}

//开启watch去save
function saveTimelineStoreData(): void {
  watchEffect(
    () => {
      timelineStore.saveTimelineSettings();
    },
    { flush: "post" }
  );
}

function exportTimeline(timelineArr: ITimeline[]): void {
  let clipboard = new ClipboardJS(".export", {
    text: () => {
      return JSON.stringify(timelineArr);
    },
  });
  clipboard.on("success", () => {
    Swal.fire({
      position: "top-end",
      icon: "success",
      title: "复制成功，已写入剪切板。",
      showConfirmButton: false,
      timer: 1500,
    });
    clipboard.destroy();
  });
  clipboard.on("error", () => {
    Swal.fire("复制失败，请手动复制！", JSON.stringify([timelineArr]));
    clipboard.destroy();
  });
}

function importTimelines(): void {
  Swal.fire({
    title: "输入导出的字符串",
    input: "text",
    returnInputValueOnDeny: true,
    showDenyButton: true,
    denyButtonText: "覆盖",
    showConfirmButton: true,
    confirmButtonText: "追加",
    showCancelButton: true,
    cancelButtonText: "放弃",
  }).then((result) => {
    if (result.isConfirmed || result.isDenied) {
      try {
        if (result.isDenied) {
          Swal.fire({
            title: "这将丢失目前拥有的所有数据，你确定要覆盖吗？",
            showConfirmButton: false,
            showDenyButton: true,
            denyButtonText: "确定覆盖",
            showCancelButton: true,
            cancelButtonText: "取消",
          }).then((res) => {
            if (res.isDenied) {
              timelineStore.allTimelines.length = 0;
              timelineStore.allTimelines.push(...(JSON.parse(result.value) as ITimeline[]));
              timelineStore.sortTimelines();
            }
          });
        } else {
          timelineStore.allTimelines.push(...(JSON.parse(result.value) as ITimeline[]));
          timelineStore.sortTimelines();
        }
      } catch (e: any) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: e,
        });
      }
    }
  });
}

function checkTimelineRaw(timeline: ITimeline): void {
  const re = new RegExp(timelineStore.reg);
  let errorList: { t: string; index: number }[] = [];
  const everyLine = timeline.timeline.split("\n");
  everyLine.forEach((t, index) => {
    if (!re.test(t) && !/^#/.test(t)) {
      errorList.push({ t, index });
    }
  });
  Swal.fire({
    title: `正确：${everyLine.length - errorList.length}，错误：${errorList.length}。`,
    html: `${errorList.length > 0 ? errorList.map((v) => `<p style="white-space: nowrap;">第${v.index + 1}行：${v.t}</p>`).join("") : ""}`,
  });
  // return errorList.length > 0;
}
</script>

<style lang="scss" scoped>
.slider-demo-block {
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.slider-demo-block .el-slider {
  margin-top: 0;
  margin-left: 12px;
}
.container {
  max-width: 1080px;
  .timeline-info {
    display: flex;
    flex-wrap: nowrap;
    position: relative;
    box-sizing: border-box;
    flex-direction: row;
    justify-content: space-between;
    .timeline-info-config {
      display: flex;
      span {
        white-space: nowrap;
      }
    }
    :deep(.el-input) {
      max-width: 200px;
      margin-right: 5px;
    }
    .timeline-timeline-view {
      margin-top: 1em;
      overflow-x: auto;
    }
    :deep(.el-textarea__inner) {
      line-height: 2;
      margin-top: 1em;
      // overflow-x: hidden;
    }
  }
  .timelinesList {
    list-style: circle;
    padding: 0;
    margin: 0;
    margin-left: 1em;
    li {
      cursor: pointer;
      font-size: 16px;
      font-family: "Microsoft YaHei";
      padding: 5px;
      transition-duration: 0.5s;
      animation-duration: 1s;
      &:hover {
        background-color: rgba($color: gray, $alpha: 0.1);
      }
    }
  }
}
</style>
