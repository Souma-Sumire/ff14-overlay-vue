<script lang="ts" setup>
import ClipboardJS from 'clipboard'
import Swal from 'sweetalert2'
import moment from 'moment'
import type { EventMap } from 'cactbot/types/event'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import { addOverlayListener, callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'
import zoneInfo from '@/resources/zoneInfo'
import { parseTimeline, useTimelineStore } from '@/store/timeline'
import type { ITimeline, ITimelineLine } from '@/types/timeline'
import Util from '@/utils/util'
import '@sweetalert2/theme-bootstrap-4/bootstrap-4.scss'
import 'animate.css'
// import { p8sTimeline } from "@/resources/timelineTemplate";
import router from '@/router'
import { useWebSocket } from '@/utils/useWebSocket'

const { wsConnected } = useWebSocket()
const simulatedCombatTime = ref(0)
const timelineStore = useTimelineStore()
const timelines = toRef(timelineStore, 'allTimelines')
const timelineFilters = toRef(timelineStore, 'filters')
const highDifficultZoneId: { id: string, name: string }[] = [
  { id: '0', name: '任意' },
]
const showFFlogs = ref(false)
const showSettings = ref(false)
const timelineCurrentlyEditing: { timeline: ITimeline } = reactive({
  timeline: {
    name: '空',
    condition: { zoneId: '0', job: 'NONE' },
    timeline: '空',
    codeFight: '空',
    create: '空',
  },
})
const transmissionTimeline = ref([] as ITimelineLine[])
let loading: any = null
let keepRetrying = false

resetCurrentlyTimeline()

async function updateTransmissionTimeline() {
  transmissionTimeline.value = [
    {
      time: 0,
      action: '正在加载...',
      show: true,
      windowBefore: 0,
      windowAfter: 0,
      alertAlready: true,
    },
  ]
  transmissionTimeline.value = await parseTimeline(
    timelineCurrentlyEditing.timeline.timeline,
  )
}
const debounceJobCN = useDebounce(
  computed(() => Util.getBattleJobs2()),
  500,
  { maxWait: 5000 },
)
init()

function init(): void {
  for (const key in zoneInfo) {
    if (Object.prototype.hasOwnProperty.call(zoneInfo, key)) {
      const element = zoneInfo[key]
      switch (element.contentType) {
        case 4:
        case 5:
        case 28:
          highDifficultZoneId.push({
            id: key,
            name:
              element.name?.cn ?? element.name?.ja ?? element.name?.ja ?? key,
          })
      }
    }
  }
  loadTimelineStoreData()
  timelineStore.sortTimelines()
}

// 发送数据
function sendBroadcastData(type: 'get' | 'post', data: any = {}): void {
  callOverlayHandler({
    call: 'broadcast',
    source: 'soumaTimelineSettings',
    msg: {
      type,
      data,
    },
  })
}

function fflogsImportClick(): void {
  showFFlogs.value = !showFFlogs.value
  resetCurrentlyTimeline()
}

function openDocs(): void {
  const href = 'https://docs.qq.com/sheet/DTWxKT3lFbmpDV3Fm?tab=5ovrc8'
  window.open(href, '_blank')
}

function resetCurrentlyTimeline(): void {
  simulatedCombatTime.value = -30
  timelineCurrentlyEditing.timeline = {
    name: '空',
    condition: { zoneId: '0', job: 'NONE' },
    timeline: '空',
    codeFight: '空',
    create: '空',
  }
}

function newDemoTimeline(): void {
  // clearCurrentlyTimeline();
  timelineCurrentlyEditing.timeline
    = timelineStore.allTimelines[timelineStore.newTimeline()]
  updateTransmissionTimeline()
}

function editTimeline(timeline: ITimeline): void {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
  timelineCurrentlyEditing.timeline = timeline
  updateTransmissionTimeline()
}

// 删除某时间轴 来自点击事件
function deleteTimeline(target: ITimeline): void {
  Swal.fire({
    title: `确定要删除${target.name}吗？`,
    text: '这将无法撤回！',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
  }).then((result) => {
    if (result.isConfirmed) {
      resetCurrentlyTimeline()
      timelines.value.splice(
        timelines.value.findIndex(v => v === target),
        1,
      )
    }
  })
}

// 初始化时load
function loadTimelineStoreData(): void {
  timelineStore.loadTimelineSettings()
}

function exportTimeline(timelineArr: ITimeline[]): void {
  const clipboard = new ClipboardJS('.export', {
    text: () => {
      return JSON.stringify(timelineArr)
    },
  })
  clipboard.on('success', () => {
    Swal.fire({
      position: 'top-end',
      icon: 'success',
      title: '复制成功，已写入剪切板。',
      showConfirmButton: false,
      timer: 1500,
    })
    clipboard.destroy()
  })
  clipboard.on('error', () => {
    Swal.fire('复制失败，请手动复制！', JSON.stringify([timelineArr]))
    clipboard.destroy()
  })
}

function importTimelines(): void {
  Swal.fire({
    title: '输入导出的字符串',
    input: 'text',
    returnInputValueOnDeny: true,
    showDenyButton: true,
    denyButtonText: '覆盖',
    showConfirmButton: true,
    confirmButtonText: '追加',
    showCancelButton: true,
    cancelButtonText: '放弃',
  }).then((result) => {
    if (result.isConfirmed || result.isDenied) {
      try {
        if (result.isDenied) {
          Swal.fire({
            title: '这将丢失目前拥有的所有数据，你确定要覆盖吗？',
            showConfirmButton: false,
            showDenyButton: true,
            denyButtonText: '确定覆盖',
            showCancelButton: true,
            cancelButtonText: '取消',
          }).then((res) => {
            if (res.isDenied) {
              timelineStore.allTimelines.length = 0
              timelineStore.allTimelines.push(
                ...(JSON.parse(result.value) as ITimeline[]),
              )
              timelineStore.sortTimelines()
            }
          })
        }
        else {
          timelineStore.allTimelines.push(
            ...(JSON.parse(result.value) as ITimeline[]),
          )
          timelineStore.sortTimelines()
        }
      }
      catch (e) {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: e as string,
        })
      }
    }
  })
}

// function createP8STimeline(): void {
//   timelineCurrentlyEditing.timeline =
//     timelineStore.allTimelines[timelineStore.newTimeline("门神模板", { zoneId: "1088", job: "NONE" }, p8sTimeline, "P8S门神模板V6")];
// }
const timeMinuteSecondDisplay = computed(() => {
  return `${
    (simulatedCombatTime.value < 0 ? '-' : '')
    + (
      Array(2).join('0')
      + (Math.floor(simulatedCombatTime.value / 60)
      + (simulatedCombatTime.value < 0 ? 1 : 0))
    ).slice(-2)
  }:${(Array(2).join('0') + Math.floor(simulatedCombatTime.value % 60)).slice(
    -2,
  )}`
})
function timelineTimeFormat() {
  timelineCurrentlyEditing.timeline.timeline
    = timelineCurrentlyEditing.timeline.timeline.replaceAll(
      /(?<=^|#\s*)(?<time>[:：\d.]+)/gm,
      (searchValue: string | RegExp, _replaceValue: string): string => {
        if (/^\d+:\d+(?:\.\d{1,2})?$/.test(searchValue.toString())) {
          // mm:ss 转 seconds
          return moment
            .duration(`00:${searchValue.toString()}`)
            .as('seconds')
            .toString()
        }
        // seconds 转 mm:ss
        return moment
          .utc(Number.parseFloat(searchValue.toString()) * 1000)
          .format('mm:ss.S')
      },
    )
}
// function clearLocalStorage() {
//   Swal.fire({
//     title: "确定删除相关LocalStorage吗？",
//     text: "仅有当图片/技能缓存需要强制刷新时你才需要这样做。",
//     icon: "warning",
//     showCancelButton: true,
//     confirmButtonColor: "#3085d6",
//     cancelButtonColor: "gray",
//     confirmButtonText: "确定",
//     cancelButtonText: "取消",
//   }).then((v) => {
//     if (v.isConfirmed) {
//       localStorage.removeItem("souma-img-cache");
//       localStorage.removeItem("souma-action-cache");
//       Swal.fire({
//         position: "top-end",
//         icon: "success",
//         title: "已清理",
//         showConfirmButton: false,
//         timer: 1500,
//       });
//     }
//   });
// }

function openMarkdown() {
  const href = router.resolve({ path: '/timelineHelp' }).href
  window.open(href, '_blank')
}

function handleSettingsSave(settings: typeof timelineStore) {
  timelineStore.configValues = settings.configValues
  timelineStore.showStyle = settings.showStyle
}

const handleBroadcastMessage: EventMap['BroadcastMessage'] = (e) => {
  if (e.source !== 'soumaTimeline') {
    return
  }
  if ((e.msg as any).type === 'post') {
    keepRetrying = false
    loading.close()
    const data = (e.msg as { data: typeof timelineStore.$state }).data
    if (timelineStore.allTimelines.length === 0 && data.allTimelines.length > timelineStore.allTimelines.length) {
      timelineStore.allTimelines = data.allTimelines
      timelineStore.configValues = data.configValues
      timelineStore.showStyle = data.showStyle
      ElMessage.closeAll()
      ElMessage({
        message: '数据获取成功',
        type: 'success',
        duration: 3000,
      })
    }
  }
}

function requestACTData() {
  keepRetrying = true
  loading = ElLoading.service({
    lock: true,
    text: `正在请求数据，请确保ACT与时间轴悬浮窗已开启...，若 3 秒内仍未获取到数据，请检查ACT状态，且确认 timeline 悬浮窗已开启。`,
    background: 'rgba(0, 0, 0, 0.7)',
  })

  sendBroadcastData('get')
  setTimeout(() => {
    if (keepRetrying) {
      ElMessage.info('重新尝试获取数据...')
      requestACTData()
    }
  }, 5000)
}

function sendDataToACT() {
  ElMessageBox.confirm('你确定要将当前数据发送至 ACT 悬浮窗吗？悬浮窗中的内容将会被覆盖！', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    sendBroadcastData('post', timelineStore.$state)
  })
}

onMounted(() => {
  addOverlayListener('BroadcastMessage', handleBroadcastMessage)
  const unwatch = watch(wsConnected, (val) => {
    if (val) {
      requestACTData()
      unwatch()
    }
  })
})
</script>

<template>
  <el-container class="container">
    <el-header>
      <el-row m-b-5>
        <el-alert title="为防止用户数据意外丢失，在编辑完成后，你需要手动点击右侧绿色「将改动应用到 ACT 悬浮窗中」按钮，才会使得改动应用到悬浮窗中。" type="info" />
      </el-row>
      <el-row :gutter="10" align="middle" justify="space-between">
        <el-col :span="20">
          <el-space wrap>
            <el-button-group>
              <el-button type="primary" @click="fflogsImportClick()">
                从 FFlogs 生成
              </el-button>
              <el-button type="primary" @click="openDocs()">
                从 在线文档 获取
              </el-button>
              <el-button type="primary" @click="newDemoTimeline()">
                手动编写
              </el-button>
            </el-button-group>

            <el-button-group>
              <el-button @click="importTimelines()">
                导入字符串
              </el-button>
              <el-button class="export" @click="exportTimeline(timelines)">
                导出全部
              </el-button>
            </el-button-group>

            <el-button-group>
              <el-button @click="openMarkdown()">
                时间轴语法
              </el-button>
            </el-button-group>

            <el-button-group>
              <el-button type="success" @click="sendDataToACT()">
                将改动应用到 ACT 悬浮窗中
              </el-button>
            </el-button-group>
          </el-space>
        </el-col>
        <el-col :span="4" style="text-align: right;">
          <el-button
            color="#626aef"
            style="color: white"
            @click="showSettings = true"
          >
            设置
          </el-button>
        </el-col>
      </el-row>
    </el-header>
    <timeline-settings-dialog v-model="showSettings" @save="handleSettingsSave" />
    <el-main>
      <timeline-fflogs-import
        v-if="showFFlogs"
        :filters="timelineFilters"
        @clear-currently-timeline="resetCurrentlyTimeline"
        @show-f-flogs-toggle="() => (showFFlogs = !showFFlogs)"
        @new-timeline="timelineStore.newTimeline"
        @update-filters="timelineStore.updateFilters"
      />
      <br>
      <el-card v-show="timelineCurrentlyEditing.timeline.create !== '空'">
        <div class="slider-demo-block">
          <span>模拟时间：</span>
          <el-slider
            v-model="simulatedCombatTime"
            :min="-30"
            :max="1500"
            :step="0.1"
            show-input
          />
          <div>{{ timeMinuteSecondDisplay }}</div>
        </div>
        <el-row class="timeline-info">
          <div>
            <p class="timeline-info-config">
              <span>显示名称：</span>
              <el-input
                v-model="timelineCurrentlyEditing.timeline.name"
                class="timeline-info-name"
              />
            </p>
            <p class="timeline-info-config">
              <span>限定地图：</span>
              <el-select
                v-model="timelineCurrentlyEditing.timeline.condition.zoneId"
                filterable
              >
                <el-option
                  v-for="zone in highDifficultZoneId"
                  :key="zone.id"
                  :label="zone.name"
                  :value="zone.id"
                />
              </el-select>
            </p>
            <p class="timeline-info-config">
              <span>限定职业：</span>
              <el-select
                v-model="timelineCurrentlyEditing.timeline.condition.job"
                required
                placeholder="职业"
              >
                <el-option
                  v-for="job in debounceJobCN"
                  :key="job"
                  :label="Util.nameToFullName(job).cn"
                  :value="job"
                />
              </el-select>
            </p>
            <p class="timeline-info-config">
              <span>战斗来源：</span>
              <el-input
                v-model="timelineCurrentlyEditing.timeline.codeFight"
                disabled
              />
            </p>
            <p class="timeline-info-config">
              <span>创建时间：</span>
              <el-input
                v-model="timelineCurrentlyEditing.timeline.create"
                disabled
              />
            </p>
            <el-row m-b-10px>
              <el-button
                :span="12"
                class="export"
                @click="exportTimeline([timelineCurrentlyEditing.timeline])"
              >
                单独导出
              </el-button>
              <el-button type="primary" :span="12" @click="timelineTimeFormat()">
                切换时间
              </el-button>
            </el-row>
            <el-row>
              <el-button
                :span="12"
                type="danger"
                @click="deleteTimeline(timelineCurrentlyEditing.timeline)"
              >
                删除
              </el-button>
              <el-button :span="12" @click="resetCurrentlyTimeline()">
                隐藏编辑界面
              </el-button>
            </el-row>
          </div>
          <div style="flex: 1">
            <el-input
              v-model="timelineCurrentlyEditing.timeline.timeline"
              class="timeline-timeline-raw"
              type="textarea"
              :rows="12"
              wrap="off"
              placeholder="请键入时间轴文本"
              style="max-width: 569px"
              @change="updateTransmissionTimeline()"
            />
          </div>
          <div style="max-height: 353px">
            <div class="timeline-timeline-view">
              <timeline-timeline-show
                :config="timelineStore.configValues"
                :lines="transmissionTimeline"
                :runtime="simulatedCombatTime"
                :show-style="timelineStore.showStyle"
              />
            </div>
          </div>
        </el-row>
        <br>
      </el-card>
      <br>
      <el-card v-if="timelines.length > 0">
        <el-table :data="timelines" style="width: 100%" stripe>
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="conditon" label="地图" sortable>
            <template #default="scope">
              {{
                highDifficultZoneId.find(
                  (value) => value.id === scope.row.condition.zoneId,
                )?.name
              }}
            </template>
          </el-table-column>
          <el-table-column prop="conditon" label="职业">
            <template #default="scope">
              {{ Util.nameToFullName(scope.row.condition.job).cn }}
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="100">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="editTimeline(scope.row)"
              >
                编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      <el-card v-if="timelines.length === 0">
        <el-empty description="点击上方新建或导入一个时间轴吧~" />
      </el-card>
    </el-main>
  </el-container>
</template>

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
  max-width: 1200px;
  margin: 0 auto;
  .timeline-info {
    display: flex;
    flex-wrap: nowrap;
    position: relative;
    box-sizing: border-box;
    flex-direction: row;
    justify-content: space-between;
    .timeline-info-config {
      display: flex;
      margin-right: 10px;
      span {
        white-space: nowrap;
      }
    }
    :deep(.el-input) {
      max-width: 160px;
      // margin-right: 5px;
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
