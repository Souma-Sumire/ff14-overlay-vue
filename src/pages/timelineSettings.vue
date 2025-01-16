<script lang="ts" setup>
import type { ITimeline, ITimelineLine } from '@/types/timeline'
import type { EventMap } from 'cactbot/types/event'
import type { Job } from 'cactbot/types/job'
import zoneInfo from '@/resources/zoneInfo'
// import { p8sTimeline } from "@/resources/timelineTemplate";
import router from '@/router'
import { parseTimeline, useTimelineStore } from '@/store/timeline'
import { copyToClipboard } from '@/utils/clipboard'
import { useWebSocket } from '@/utils/useWebSocket'
import Util from '@/utils/util'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import * as LZString from 'lz-string'
import moment from 'moment'
import { addOverlayListener, callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'
import '@sweetalert2/theme-bootstrap-4/bootstrap-4.scss'
import 'animate.css'

const { wsConnected } = useWebSocket({ allowClose: true, addWsParam: true })
const simulatedCombatTime = ref(0)
const timelineStore = useTimelineStore()
const timelines = toRef(timelineStore, 'allTimelines')
const timelineFilters = toRef(timelineStore, 'filters')
const highDifficultZoneId: { id: string, name: string }[] = [
  { id: '0', name: '任意' },
]
const showFFlogsDialog = ref(false)
const showSettings = ref(false)
const timelineCurrentlyEditing: { timeline: ITimeline } = reactive({
  timeline: {
    name: '空',
    condition: { zoneId: '0', jobs: ['NONE'] },
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
  showFFlogsDialog.value = true
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
    condition: { zoneId: '0', jobs: ['NONE'] },
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
  ElMessageBox.confirm(
    `确定要删除「${target.name}」吗？`,
    '删除时间轴',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  ).then(() => {
    resetCurrentlyTimeline()
    timelines.value.splice(
      timelines.value.findIndex(v => v === target),
      1,
    )
  }).catch(() => {
    // 用户取消操作
  })
}

// 初始化时load
function loadTimelineStoreData(): void {
  timelineStore.loadTimelineSettings()
}

function exportTimeline(timelineArr: ITimeline[]) {
  const text = JSON.stringify(timelineArr)
  const zip = JSON.parse(text)
  for (const timeline of zip) {
    // 去除所有#开头的注释行
    timeline.timeline = timeline.timeline.replace(/^#.*\n/gm, '')
  }
  const ziped = JSON.stringify(zip)

  // 压缩原始数据和去除注释后的数据
  const compressedText = LZString.compressToBase64(text)
  const compressedZiped = LZString.compressToBase64(ziped)

  const fullSize = compressedText.length
  const optimizedSize = compressedZiped.length

  // 如果两种方案大小相同，直接导出完整版本
  if (fullSize === optimizedSize) {
    copyToClipboard(compressedText)
      .then(() => {
        ElMessage({
          message: '数据复制成功，已写入剪切板。',
          type: 'success',
          duration: 2000,
        })
      })
      .catch(() => {
        ElMessage({
          message: '复制失败，请手动复制！',
          type: 'error',
          duration: 3000,
        })
      })
    return
  }

  const sizeReduction = ((fullSize - optimizedSize) / fullSize * 100).toFixed(2)

  ElMessageBox.confirm(
    `
     1. 完整版本（包含注释）<br>
     &nbsp;&nbsp;&nbsp;- 大小：${fullSize} 字节<br>
     &nbsp;&nbsp;&nbsp;- 包含所有时间轴信息和注释<br><br>
     2. 优化版本（不含注释）<br>
     &nbsp;&nbsp;&nbsp;- 大小：${optimizedSize} 字节<br>
     &nbsp;&nbsp;&nbsp;- 节省 ${sizeReduction}% 的空间<br>
     &nbsp;&nbsp;&nbsp;- 仅包含必要的时间轴数据`,
    '请选择导出版本：',
    {
      confirmButtonText: '导出优化版本',
      cancelButtonText: '导出完整版本',
      distinguishCancelAndClose: true,
      closeOnClickModal: false,
      closeOnPressEscape: false,
      dangerouslyUseHTMLString: true,
      showClose: true,
      type: 'info',
      callback: (action: string) => {
        if (action === 'cancel' || action === 'confirm') {
          const finalCompressed = action === 'confirm' ? compressedZiped : compressedText
          copyToClipboard(finalCompressed)
            .then(() => {
              ElMessage({
                message: '压缩数据复制成功，已写入剪切板。',
                type: 'success',
                duration: 2000,
              })
            })
            .catch(() => {
              ElMessage({
                message: '复制失败，请手动复制！',
                type: 'error',
                duration: 3000,
              })
            })
        }
      },
    },
  )
}

function importTimelines(): void {
  ElMessageBox.prompt('请输入导出的字符串（支持多行导入）', '导入时间轴', {
    confirmButtonText: '解析',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputValidator: (value) => {
      if (!value) {
        return '请输入导出的字符串'
      }

      const lines = value.split('\n').filter(line => line.trim() !== '')
      let allParsedData: ITimeline[] = []

      for (const line of lines) {
        let parsedData: ITimeline[]
        try {
          // 首先尝试作为JSON解析
          parsedData = JSON.parse(line)
        }
        catch {
          // 如果JSON解析失败，尝试解压缩
          try {
            const decompressed = LZString.decompressFromBase64(line)
            parsedData = JSON.parse(decompressed)
          }
          catch {
            return `无法解析输入的数据：${line}，请确保每行都是正确的JSON或压缩后的字符串。`
          }
        }

        // 验证解析后的数据
        if (!Array.isArray(parsedData)) {
          return `导入的数据格式不正确：${line}`
        }

        allParsedData = allParsedData.concat(parsedData)
      }

      if (allParsedData.length === 0) {
        return '导入的数据不包含任何时间轴。'
      }

      // 验证通过，返回true
      return true
    },
    inputErrorMessage: '无效的输入',
  }).then(({ value }) => {
    const lines = value.split('\n').filter(line => line.trim() !== '')
    let allParsedData: ITimeline[] = []

    for (const line of lines) {
      let parsedData: ITimeline[]
      try {
        parsedData = JSON.parse(line)
      }
      catch {
        const decompressed = LZString.decompressFromBase64(line)
        parsedData = JSON.parse(decompressed)
      }
      allParsedData = allParsedData.concat(parsedData)
    }

    const timelineCount = allParsedData.length
    const titles = allParsedData.map(timeline => `「${timeline.name}」`).join(', ')

    ElMessageBox({
      title: '确认',
      message: `导入 ${timelineCount} 个时间轴：\n${titles}\n？`,
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: '追加',
      cancelButtonText: '覆盖',
      distinguishCancelAndClose: true,
      type: 'warning',
      callback: (action: string) => {
        if (action === 'cancel') {
          ElMessageBox.prompt(
            '覆盖操作将删除所有现有的时间轴。请输入"我确认"以继续。',
            '二次确认',
            {
              confirmButtonText: '确定覆盖',
              cancelButtonText: '取消',
              inputPattern: /^我确认$/,
              inputErrorMessage: '请输入"我确认"以确认覆盖操作',
              type: 'warning',
            },
          ).then(({ value }) => {
            if (value === '我确认') {
              // 用户确认覆盖
              performImport(allParsedData, true)
            }
          }).catch(() => {
            // 用户取消覆盖操作或输入不正确
          })
        }
        else if (action === 'confirm') {
          // 直接执行追加操作
          performImport(allParsedData, false)
        }
        // 如果 action 是 'close'，用户关闭了对话框，不执行任何操作
      },
    })
  }).catch(() => {
    // 用户取消输入
  })
}

function performImport(parsedData: ITimeline[], overwrite: boolean): void {
  if (overwrite) {
    timelineStore.allTimelines.length = 0
  }
  timelineStore.allTimelines.push(...parsedData)
  timelineStore.sortTimelines()

  for (const timeline of timelineStore.allTimelines) {
    if (timeline.condition.jobs === undefined) {
      timeline.condition.jobs = [(timeline.condition as any).job]
    }
  }
  resetCurrentlyTimeline()

  if (overwrite) {
    ElMessage({
      type: 'success',
      message: '覆盖成功！',
      duration: 2000,
    })
    return
  }

  // 追加操作

  const uniqueTimelines: ITimeline[] = []
  const seen = new Set()

  for (const timeline of timelineStore.allTimelines) {
    const timelineString = JSON.stringify({
      name: timeline.name,
      condition: timeline.condition,
      timeline: timeline.timeline,
      codeFight: timeline.codeFight,
      create: timeline.create,
    })

    if (!seen.has(timelineString)) {
      seen.add(timelineString)
      uniqueTimelines.push(timeline)
    }
  }
  const removedCount = timelineStore.allTimelines.length - uniqueTimelines.length

  timelineStore.allTimelines = uniqueTimelines

  ElMessage({
    message: `追加成功！共导入 ${parsedData.length} 个时间轴${removedCount > 0 ? `，但其中 ${removedCount} 个重复，已自动移除。` : ''}`,
    type: 'success',
    duration: 3000,
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
      Array.from({ length: 2 }).join('0')
      + (Math.floor(simulatedCombatTime.value / 60)
        + (simulatedCombatTime.value < 0 ? 1 : 0))
    ).slice(-2)
  }:${(Array.from({ length: 2 }).join('0') + Math.floor(simulatedCombatTime.value % 60)).slice(
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
    for (const v of data.allTimelines) {
      if (v.condition.jobs === undefined) {
        v.condition.jobs = [(v.condition as any).job]
      }
      v.condition.jobs.sort((a, b) => timelineStore.jobList.indexOf(a) - timelineStore.jobList.indexOf(b))
      Reflect.deleteProperty(v.condition, 'job')
    }
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

function requestACTData() {
  keepRetrying = true
  loading = ElLoading.service({
    lock: true,
    text: `正在请求数据，请确保 ACT 与悬浮窗已开启...，若 10 秒内仍未获取到数据，请检查 ACT 状态，且确认 timeline 悬浮窗已开启，或刷新页面重连。`,
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

function revertTimeline() {
  // timelineStore.allTimelines.length = 0
  resetCurrentlyTimeline()
  requestACTData()
}

onMounted(() => {
  addOverlayListener('BroadcastMessage', handleBroadcastMessage)
  const unwatch = watch(wsConnected, (val) => {
    if (val) {
      if (timelineStore.allTimelines.length === 0) {
        requestACTData()
      }
      unwatch()
    }
  })
})
</script>

<template>
  <el-container class="container">
    <timeline-settings-dialog v-model="showSettings" @save="handleSettingsSave" />
    <el-header class="flex-header">
      <el-row justify="space-between" align="middle" m-b-2>
        <el-space wrap :size="10">
          <el-button-group>
            <el-button type="primary" size="small" @click="fflogsImportClick">
              从 FFlogs 生成
            </el-button>
            <el-button type="primary" size="small" @click="openDocs">
              从 在线文档 获取
            </el-button>
            <el-button type="primary" size="small" @click="newDemoTimeline">
              手动编写
            </el-button>
          </el-button-group>

          <el-button-group>
            <el-button size="small" @click="importTimelines">
              导入字符串
            </el-button>
            <el-button size="small" class="export" @click="exportTimeline(timelines)">
              导出全部
            </el-button>
          </el-button-group>

          <el-button size="small" @click="openMarkdown">
            时间轴语法
          </el-button>

          <el-button type="success" size="small" @click="sendDataToACT">
            应用
          </el-button>
        </el-space>

        <el-space>
          <el-button color="#a0d911" style="color: white" size="small" @click="revertTimeline">
            恢复至之前的时间轴
          </el-button>
          <el-button color="#626aef" style="color: white" size="small" @click="showSettings = true">
            设置
          </el-button>
        </el-space>
      </el-row>
      <div class="alerts-container">
        <el-alert
          title="编辑完成后，需手动点击「应用」按钮"
          show-icon
          type="info"
          :closable="false"
          class="alert-item"
        />
        <el-alert
          title="当你误操作或数据与 ACT 悬浮窗中的数据不符，且尚未点击「应用」时，可点击「恢复至之前的时间轴」，则会恢复到当前 ACT 悬浮窗中保存的数据"
          show-icon
          type="warning"
          :closable="false"
          class="alert-item"
        />
      </div>
    </el-header>
    <el-main>
      <el-dialog
        v-model="showFFlogsDialog"
        title="从 FFlogs 生成时间轴"
        width="80%"
        :before-close="() => showFFlogsDialog = false"
      >
        <timeline-fflogs-import
          :filters="timelineFilters"
          @clear-currently-timeline="resetCurrentlyTimeline"
          @show-f-flogs-toggle="() => (showFFlogsDialog = false)"
          @new-timeline="timelineStore.newTimeline"
          @update-filters="timelineStore.updateFilters"
        />
      </el-dialog>
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
                v-model="timelineCurrentlyEditing.timeline.condition.jobs"
                multiple
                required
                placeholder="职业"
                collapse-tags
                collapse-tags-tooltip
              >
                <el-option
                  v-for="job in timelineStore.jobList"
                  :key="job"
                  :label="(Util.nameToFullName(job)?.cn ?? job).replace('冒险者', '全部职业')"
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
              <el-button :span="24" @click="resetCurrentlyTimeline()">
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
              {{ scope.row.condition.jobs.map((v: Job) => Util.nameToFullName((v.toUpperCase() as Job))?.cn ?? v).join('、').replace('冒险者', '全部职业') }}
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="150">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="editTimeline(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="deleteTimeline(scope.row)"
              >
                删除
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
.flex-header {
  display: flex;
  flex-direction: column;
  height: auto;
}
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
  min-width: 925px;
  max-width: 1200px;
  margin: 10px auto;
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
      width: 15em;
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
}
:deep(.el-dialog__body) {
  padding: 20px;
}

.alerts-container {
  display: flex;
  flex-direction: column;
}

.alert-item {
  margin-bottom: 5px;
}

.alert-item:last-child {
  margin-bottom: 0;
}
</style>
