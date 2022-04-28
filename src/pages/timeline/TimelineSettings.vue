<template>
  <el-container class="container">
    <el-header>
      <el-button type="primary" @click="timelineStore.newTimeline()">新建</el-button>
      <el-button type="success" @click="broadcastData()">发送到悬浮窗</el-button>
      <el-button @click="showFflogs = !showFflogs">从FFlogs导入</el-button>
      <el-button @click="showSettings = !showSettings" color="#626aef" style="color: white">样式设置</el-button>
      <el-button @click="exportAllTimelines">导出</el-button>
      <el-button @click="importTimelines">导入</el-button>
      <div class="slider-demo-block">
        <span>预览时间：</span>
        <el-slider v-model="simulatedCombatTime" :min="-30" :max="1000" :step="0.1" show-input> </el-slider>
      </div>
    </el-header>
    <el-main>
      <FflogsVue
        :settings="timelineStore.settings"
        :filters="timelineFilters"
        v-if="showFflogs"
        @showFflogsToggle="() => (showFflogs = !showFflogs)"
        @newTimeline="timelineStore.newTimeline"
      ></FflogsVue>
      <el-descriptions title="时间轴参数" size="small" style="width: 100%" border v-show="showSettings">
        <el-descriptions-item
          v-for="(value, key, index) in timelineStore.configValues"
          :key="index"
          :label="timelineStore.configTranslate[key]"
          label-align="right"
          align="center"
          width="16em"
        >
          <el-input-number :min="0" :step="0.1" v-model="timelineStore.configValues[key]" />
        </el-descriptions-item>
      </el-descriptions>
      <el-descriptions size="small" title="时间轴样式" style="width: 100%" border v-show="showSettings">
        <el-descriptions-item
          v-for="(value, key, index) in timelineStore.showStyle"
          :key="index"
          :label="timelineStore.showStyleTranslate[key]"
          label-align="right"
          align="center"
          width="16em"
        >
          <el-input-number :min="0" :step="0.01" v-model="timelineStore.showStyle[key]" />
        </el-descriptions-item>
      </el-descriptions>
      <br />
      <el-empty v-if="!timelines.length" description="当前无数据"></el-empty>
      <el-collapse v-if="timelines.length">
        <el-collapse-item
          class="timeline-timelines"
          v-for="(item, index) in timelines"
          :key="index"
          :title="`${item.name} - ${Util.nameToCN(item.condition.job).full} - ${
            highDifficultZoneId.find((value) => value.id === item.condition.zoneId)?.name
          } `"
        >
          <el-row class="timeline-info">
            <el-col :span="8">
              <p>名称： <el-input v-model="item.name" class="timeline-info-name"></el-input></p>
              <p>
                地图：
                <el-select v-model="item.condition.zoneId" filterable>
                  <el-option v-for="zone in highDifficultZoneId" :key="zone.id" :label="zone.name" :value="zone.id"></el-option>
                </el-select>
              </p>
              <p>
                职业：
                <el-select v-model="item.condition.job" required placeholder="职业">
                  <el-option v-for="job in Util.getBattleJobs()" :key="job" :label="Util.nameToCN(job).full" :value="job"></el-option>
                </el-select>
              </p>
              <p>
                来源：
                <el-input v-model="item.codeFight" disabled />
              </p>
              <p>
                创建：
                <el-input v-model="item.create" disabled />
              </p>
              <el-button type="danger" @click="deleteTimeline(timelines, index)">删除</el-button>
              <el-button @click="exportTimeline(item)">导出</el-button>
            </el-col>
            <el-col :span="10">
              <span>编辑：</span>
              <el-input
                class="timeline-timeline-raw"
                v-model="item.timeline"
                type="textarea"
                :rows="10"
                wrap="off"
                placeholder="请键入时间轴文本"
            /></el-col>
            <el-col :span="6">
              <span>预览：</span>
              <div class="timeline-timeline-view">
                <TimelineShowVue
                  :config="timelineStore.configValues"
                  :lines="timelineStore.parseTimeline(item.timeline)"
                  :runtime="simulatedCombatTime"
                  :show-style="timelineStore.showStyle"
                ></TimelineShowVue>
              </div>
            </el-col>
          </el-row>
        </el-collapse-item>
      </el-collapse>
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import Swal from "sweetalert2";
import "sweetalert2/src/sweetalert2.scss";
import { ref, toRef, watchEffect } from "vue";
import FflogsVue from "../../components/timeline/Fflogs.vue";
import TimelineShowVue from "../../components/timeline/TimelineShow.vue";
import zoneInfo from "../../resources/zoneInfo";
import { useTimelineStore } from "../../store/timeline";
import { ITimeline } from "../../types/Timeline";
import Util from "../../utils/util";

const simulatedCombatTime = ref(-30);
const timelineStore = useTimelineStore();
const timelines = toRef(timelineStore, "allTimelines");
const timelineFilters = toRef(timelineStore, "filters");
const highDifficultZoneId: { id: string; name: string }[] = [{ id: "0", name: "任意" }];
const showFflogs = ref(false);
const showSettings = ref(false);

init();

function init() {
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

//通信数据
function broadcastData() {
  // console.log(window.hasOwnProperty("OverlayPluginApi"));
  if (!!urlTool(location.href)?.OVERLAY_WS) {
    callOverlayHandler({
      call: "broadcast",
      source: "soumuaTimelineSetting",
      msg: {
        store: timelineStore.$state,
        // store: timelineStore, //直接传的话国服ACT会报错
      },
    });
    Swal.fire({
      title: "已尝试进行通信",
      text: "请检查ACT悬浮窗是否成功接收",
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
function urlTool(url: string) {
  const array = url.split("?")!.pop()!.split("&");
  const data: any = {};
  array!.forEach((ele) => {
    let dataArr = ele.split("=");
    data[dataArr[0]] = dataArr[1];
  });
  return data;
}

//删除某时间轴 来自点击事件
function deleteTimeline(parent: ITimeline[], targetIndex: number) {
  Swal.fire({
    title: `确定要删除${parent[targetIndex].name}吗？`,
    text: "这将无法撤回！",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
  }).then((result) => {
    if (result.isConfirmed) {
      parent.splice(targetIndex, 1);
    }
  });
}

//初始化时load
function loadTimelineStoreData() {
  timelineStore.loadTimelineSettings();
}

//开启watch去save
function saveTimelineStoreData() {
  watchEffect(
    () => {
      timelineStore.saveTimelineSettings();
    },
    { flush: "post" }
  );
}

function exportTimeline(timeline: ITimeline) {
  Swal.fire({ text: JSON.stringify([timeline]) });
}

function exportAllTimelines() {
  Swal.fire({ text: JSON.stringify(timelineStore.allTimelines) });
}

function importTimelines() {
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
              // timelineStore.allTimelines.push(...(JSON.parse(decodeURIComponent(window.atob(result.value))) as ITimeline[]));
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
  .timeline-timelines {
    :deep(.el-collapse-item__header) {
      padding-left: 12px;
      font-weight: bold;
      font-size: 16px;
      background-color: rgba($color: rgb(245, 247, 250), $alpha: 1);
      transition: 0.2s;
      &:hover {
        color: rgb(64, 158, 255);
        background-color: rgba($color: rgb(236, 245, 255), $alpha: 0.5);
      }
    }
    :deep(.el-collapse-item__wrap) {
      padding-left: 24px;
    }
    .timeline-info {
      :deep(.el-input) {
        width: 275px !important;
      }

      .timeline-timeline-view {
        margin-top: 7px;
        overflow-x: auto;
      }
      :deep(.el-textarea__inner) {
        line-height: 1.929;
        // overflow-x: hidden;
      }
    }
  }
}
</style>
