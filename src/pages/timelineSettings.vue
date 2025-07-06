<script lang="ts" setup>
import type { EventMap } from 'cactbot/types/event'
import type { Job } from 'cactbot/types/job'
import type { ITimeline, ITimelineLine } from '@/types/timeline'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'

import * as LZString from 'lz-string'
import moment from 'moment'
import { useRouter } from 'vue-router'

import zoneInfo from '@/resources/zoneInfo'
import { parseTimeline, useTimelineStore } from '@/store/timeline'
import { copyToClipboard } from '@/utils/clipboard'
import { useWebSocket } from '@/utils/useWebSocket'
import Util from '@/utils/util'
import {
  addOverlayListener,
  callOverlayHandler,
} from '../../cactbot/resources/overlay_plugin_api'

import 'animate.css'

const router = useRouter()
const { wsConnected } = useWebSocket({ allowClose: true, addWsParam: true })

const timelineStore = useTimelineStore()
const timelines = toRef(timelineStore, 'allTimelines')
const timelineFilters = toRef(timelineStore, 'filters')

const simulatedCombatTime = ref(0)
const realtimeMode = useLocalStorage('realtimeMode', false)

const selectedTimelines = ref<ITimeline[]>([])
const isAllSelected = ref(false)
const dialogVisible = ref(false)
const showFFlogsDialog = ref(false)
const showSettings = ref(false)

const timelineCurrentlyEditing = ref<ITimeline>({
  name: '空',
  condition: { zoneId: '0', jobs: ['NONE'] },
  timeline: '空',
  codeFight: '空',
  create: '空',
})

const transmissionTimeline = ref([] as ITimelineLine[])
const highDifficultZoneId: { id: string, name: string }[] = [{ id: '0', name: '任意' }]

let loading: any = null
let keepRetrying = false

const timeMinuteSecondDisplay = computed(() => {
  const time = simulatedCombatTime.value
  const isNegative = time < 0
  const totalSeconds = Math.abs(Math.floor(time))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${isNegative ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const maxSlider = computed(() => {
  parseTimeline(timelineCurrentlyEditing.value.timeline)
  const maxTime = Math.max(...transmissionTimeline.value.map(v => v.time)) || 550
  return maxTime + 30
})

function editTimeline(timeline: ITimeline): void {
  timelineCurrentlyEditing.value = timeline
  dialogVisible.value = true
  updateTransmissionTimeline()
}

function closeDialog() {
  dialogVisible.value = false
}

function newDemoTimeline(): void {
  timelineCurrentlyEditing.value = timelineStore.allTimelines[timelineStore.newTimeline()]
  updateTransmissionTimeline()
}

function updateTransmissionTimeline() {
  transmissionTimeline.value = [{
    time: 0,
    action: '正在加载...',
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: true,
  }]
  parseTimeline(timelineCurrentlyEditing.value.timeline).then((result) => {
    transmissionTimeline.value = result
  })
  simulatedCombatTime.value = -timelineStore.configValues.preBattle
}

function timelineTimeFormat() {
  timelineCurrentlyEditing.value.timeline = timelineCurrentlyEditing.value.timeline.replaceAll(
    /(?<=^|#\s*)(?<time>[:：\d.]+)/gm,
    (searchValue: string | RegExp, _replaceValue: string): string => {
      if (/^\d+:\d+(?:\.\d{1,2})?$/.test(searchValue.toString())) {
        return moment.duration(`00:${searchValue.toString()}`).as('seconds').toString()
      }
      return moment.utc(Number.parseFloat(searchValue.toString()) * 1000).format('mm:ss.S')
    },
  )
}

function deleteTimeline(target: ITimeline): void {
  ElMessageBox.confirm(`确定要删除「${target.name}」吗？`, '删除时间轴', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      timelines.value.splice(timelines.value.findIndex(v => v === target), 1)
    })
    .catch(() => {})
}

function deleteSelectedTimelines() {
  if (selectedTimelines.value.length === 0) {
    ElMessage.warning('请选择要删除的时间轴')
    return
  }

  const timelineNames = selectedTimelines.value.map(t => `「${t.name}」`).join('<br/>')

  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedTimelines.value.length} 个时间轴吗？<br>${timelineNames}`,
    '批量删除时间轴',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      dangerouslyUseHTMLString: true,
      type: 'warning',
    },
  )
    .then(() => {
      timelines.value = timelines.value.filter(t => !selectedTimelines.value.includes(t))
      selectedTimelines.value = []
      isAllSelected.value = false
      ElMessage.success(`成功删除 ${selectedTimelines.value.length} 个时间轴`)
    })
    .catch(() => {})
}

function toggleSelectAll() {
  isAllSelected.value = !isAllSelected.value
  selectedTimelines.value = isAllSelected.value ? [...timelines.value] : []
}

function toggleRealTimeMode() {
  if (!realtimeMode.value) {
    ElMessageBox.confirm(
      '开启实时更新模式后，你不再需要手动点击\'应用\'按钮了，所有改动将立即生效。',
      '提示',
      {
        confirmButtonText: '开启实时更新模式',
        cancelButtonText: '再想想',
        type: 'warning',
      },
    )
      .then(() => {
        realtimeMode.value = true
        sendBroadcastData('post', timelineStore.$state)
      })
      .catch(() => {})
  }
  else {
    realtimeMode.value = false
  }
}

function exportSelectedTimelines() {
  if (selectedTimelines.value.length === 0) {
    ElMessage.warning('请选择要导出的时间轴')
    return
  }

  exportTimeline(selectedTimelines.value)
}

function exportTimeline(timelineArr: ITimeline[]) {
  const text = JSON.stringify(timelineArr)
  const zip = JSON.parse(text)
  for (const timeline of zip) {
    // 去除所有#开头的注释行
    timeline.timeline = timeline.timeline.replace(/^#.*\n/gm, '')
  }
  const zipped = JSON.stringify(zip)

  // 压缩原始数据和去除注释后的数据
  const compressedText = LZString.compressToBase64(text)
  const compressedZipped = LZString.compressToBase64(zipped)

  const fullSize = compressedText.length
  const optimizedSize = compressedZipped.length

  // 如果两种方案大小相同，直接导出完整版本
  if (fullSize === optimizedSize) {
    handleClipboardCopy(
      compressedText,
      '数据复制成功，已写入剪切板。',
      '复制失败，请手动复制！',
    )
    return
  }

  const sizeReduction = (((fullSize - optimizedSize) / fullSize) * 100).toFixed(
    2,
  )

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
          const finalCompressed
            = action === 'confirm' ? compressedZipped : compressedText
          handleClipboardCopy(
            finalCompressed,
            '数据复制成功，已写入剪切板。',
            '复制失败，请手动复制！',
          )
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
  })
    .then(({ value }) => {
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
      const titles = allParsedData
        .map(timeline => `「${timeline.name}」`)
        .join(', ')

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
            )
              .then(({ value }) => {
                if (value === '我确认') {
                  // 用户确认覆盖
                  performImport(allParsedData, true)
                }
              })
              .catch(() => {
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
    })
    .catch(() => {
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
  const removedCount
    = timelineStore.allTimelines.length - uniqueTimelines.length

  timelineStore.allTimelines = uniqueTimelines

  ElMessage({
    message: `追加成功！共导入 ${parsedData.length} 个时间轴${removedCount > 0 ? `，但其中 ${removedCount} 个重复，已自动移除。` : ''}`,
    type: 'success',
    duration: 3000,
  })
}

function sendBroadcastData(type: 'get' | 'post', data: any = {}) {
  callOverlayHandler({
    call: 'broadcast',
    source: 'soumaTimelineSettings',
    msg: {
      type,
      data,
    },
  })
}

function sendDataToACT() {
  ElMessageBox.confirm(
    '要将当前数据发送至 ACT 悬浮窗吗？悬浮窗中的内容将会被覆盖！',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(() => {
      sendBroadcastData('post', timelineStore.$state)
    })
    .catch(() => {})
}

function revertTimeline() {
  ElMessageBox.confirm(
    '要读取 ACT 悬浮窗数据吗？你将丢失所有未应用的修改！',
    '读取悬浮窗数据',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(() => {
      requestACTData()
    })
    .catch(() => {})
}

function requestACTData() {
  const timelineUrl = router.resolve({ path: '/timeline' })
  const fullPath = `${window.location.protocol}//${window.location.host}/ff14-overlay-vue/${timelineUrl.href}`

  keepRetrying = true
  loading = ElLoading.service({
    lock: true,
    text: `正在请求数据，请确保 ACT 中已添加并启用此悬浮窗：${fullPath}`,
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

const handleBroadcastMessage: EventMap['BroadcastMessage'] = (e) => {
  if (e.source !== 'soumaTimeline')
    return
  if ((e.msg as any).type === 'post') {
    keepRetrying = false
    loading.close()

    const data = (e.msg as { data: typeof timelineStore.$state }).data

    for (const v of data.allTimelines) {
      if (v.condition.jobs === undefined) {
        v.condition.jobs = [(v.condition as any).job]
      }
      v.condition.jobs.sort(
        (a, b) =>
          timelineStore.jobList.indexOf(a) - timelineStore.jobList.indexOf(b),
      )
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

function loadTimelineStoreData() {
  timelineStore.loadTimelineSettings()
}

function openDocs() {
  const href = 'https://docs.qq.com/sheet/DTWxKT3lFbmpDV3Fm?tab=5ovrc8'
  window.open(href, '_blank')
}

function openMarkdown() {
  const href = router.resolve({ path: '/timelineHelp' }).href
  window.open(href, '_blank')
}

function fflogsImportClick() {
  showFFlogsDialog.value = true
}

function handleSettingsSave(settings: typeof timelineStore) {
  timelineStore.configValues = settings.configValues
  timelineStore.showStyle = settings.showStyle
}

function handleClipboardCopy(
  text: string,
  successMsg = '复制成功',
  errorMsg = '复制失败',
) {
  copyToClipboard(text)
    .then(() => ElMessage.success(successMsg))
    .catch(() => ElMessage.error(errorMsg))
}

function tableRowClassName({ row }: { row: ITimeline }) {
  return row === timelineCurrentlyEditing.value ? 'editing-row' : ''
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

  watch(
    () => timelineStore.$state,
    () => {
      if (wsConnected.value && realtimeMode.value) {
        sendBroadcastData('post', timelineStore.$state)
      }
    },
    { deep: true },
  )
})

function init(): void {
  for (const key in zoneInfo) {
    if (Object.prototype.hasOwnProperty.call(zoneInfo, key)) {
      const element = zoneInfo[key]
      switch (element.contentType) {
        case 4: case 5: case 28:
          highDifficultZoneId.push({
            id: key,
            name: element.name?.cn ?? element.name?.ja ?? key,
          })
      }
    }
  }
  loadTimelineStoreData()
  timelineStore.sortTimelines()
}

init()
</script>

<template>
  <el-container class="container">
    <timeline-settings-dialog
      v-model="showSettings"
      @save="handleSettingsSave"
    />
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
            <el-button
              size="small"
              class="export"
              @click="exportTimeline(timelines)"
            >
              导出全部
            </el-button>
          </el-button-group>

          <el-button size="small" @click="openMarkdown">
            时间轴语法
          </el-button>

          <el-button-group>
            <el-button
              size="small"
              :type="realtimeMode ? 'success' : 'default'"
              @click="toggleRealTimeMode"
            >
              {{
                realtimeMode ? "实时更新模式：开启中" : "实时更新模式：关闭中"
              }}
            </el-button>
          </el-button-group>
        </el-space>

        <el-space>
          <el-button
            v-if="!realtimeMode"
            color="#a0d911"
            style="color: white"
            size="small"
            @click="revertTimeline"
          >
            读取来自悬浮窗的数据
          </el-button>
          <el-button
            color="#626aef"
            style="color: white"
            size="small"
            @click="showSettings = true"
          >
            设置
          </el-button>
        </el-space>
      </el-row>
      <div v-if="!realtimeMode" class="alerts-container">
        <el-button type="success" size="default" @click="sendDataToACT">
          编辑完毕后，点击这里应用，将编辑器数据发送至悬浮窗
        </el-button>
      </div>
    </el-header>
    <el-main>
      <el-dialog
        v-model="showFFlogsDialog"
        title="从 FFlogs 生成时间轴"
        width="80%"
        :before-close="() => (showFFlogsDialog = false)"
      >
        <timeline-fflogs-import
          :filters="timelineFilters"
          @show-f-flogs-toggle="() => (showFFlogsDialog = false)"
          @edit-timeline="editTimeline"
        />
      </el-dialog>
      <el-card v-if="timelines.length > 0">
        <div
          class="batch-operations"
          style="
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
          "
        >
          <div>
            <el-button
              type="primary"
              size="small"
              :disabled="selectedTimelines.length === 0"
              @click="exportSelectedTimelines"
            >
              批量导出 ({{ selectedTimelines.length }})
            </el-button>
            <el-button
              type="danger"
              size="small"
              :disabled="selectedTimelines.length === 0"
              style="margin-right: 10px"
              @click="deleteSelectedTimelines"
            >
              批量删除 ({{ selectedTimelines.length }})
            </el-button>
          </div>
        </div>

        <el-table
          :data="timelines"
          :row-class-name="tableRowClassName"
          style="width: 100%"
          stripe
          @selection-change="
            (selection) => {
              selectedTimelines = selection;
              isAllSelected = selection.length === timelines.length;
            }
          "
        >
          <el-table-column
            type="selection"
            width="55"
            align="center"
            :selectable="() => true"
          >
            <template #header>
              <el-checkbox v-model="isAllSelected" @change="toggleSelectAll" />
            </template>
          </el-table-column>

          <el-table-column prop="name" label="名称" />
          <el-table-column prop="condition" label="地图" sortable>
            <template #default="scope">
              {{
                highDifficultZoneId.find(
                  (value) => value.id === scope.row.condition.zoneId,
                )?.name
              }}
            </template>
          </el-table-column>
          <el-table-column prop="condition" label="职业">
            <template #default="scope">
              {{
                scope.row.condition.jobs
                  .map(
                    (v: Job) =>
                      Util.nameToFullName(v.toUpperCase() as Job)?.cn ?? v,
                  )
                  .join("、")
                  .replace("冒险者", "全部职业")
              }}
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
    <el-dialog
      v-model="dialogVisible"
      title="编辑时间轴"
      top="5vh"
      :before-close="closeDialog"
      class="timeline-dialog"
      width="65%"
      style="min-width: 550px; max-width: 1000px"
      :close-on-click-modal="false"
    >
      <div class="editor-dialog-content">
        <el-row class="timeline-header" :gutter="10">
          <el-col :span="14">
            <el-form-item label="名称">
              <el-input v-model="timelineCurrentlyEditing.name" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="来源">
              <el-input v-model="timelineCurrentlyEditing.codeFight" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="22">
            <el-form-item label="地图">
              <el-select
                v-model="timelineCurrentlyEditing.condition.zoneId"
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="zone in highDifficultZoneId"
                  :key="zone.id"
                  :label="zone.name"
                  :value="zone.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="22">
            <el-form-item label="职业">
              <el-select
                v-model="timelineCurrentlyEditing.condition.jobs"
                multiple
              >
                <el-option
                  v-for="job in timelineStore.jobList"
                  :key="job"
                  :label="
                    (Util.nameToFullName(job)?.cn ?? job).replace(
                      '冒险者',
                      '全部职业',
                    )
                  "
                  :value="job"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="slider-demo-block">
          <el-slider
            v-model="simulatedCombatTime"
            :min="-timelineStore.configValues.preBattle"
            :max="maxSlider"
            :step="0.1"
          />
          <div class="time-display" style="width: 80px; text-align: center">
            <p class="time-display-text">
              {{ timeMinuteSecondDisplay }}
            </p>
            <p class="time-display-text">
              ({{ simulatedCombatTime }}s)
            </p>
          </div>
        </div>

        <el-row class="timeline-editor-body" :gutter="10">
          <el-col>
            <el-input
              v-model="timelineCurrentlyEditing.timeline"
              :style="{
                width: `calc(100% - ${timelineStore.showStyle['--timeline-width']}px)`,
              }"
              type="textarea"
              :autosize="{ minRows: 10, maxRows: 20 }"
              wrap="off"
              placeholder="请键入时间轴文本"
              @change="updateTransmissionTimeline()"
            />
          </el-col>
          <timeline-timeline-show
            :style="{ position: 'absolute', right: 0, top: 0 }"
            :config="timelineStore.configValues"
            :lines="transmissionTimeline"
            :runtime="simulatedCombatTime"
            :show-style="timelineStore.showStyle"
          />
        </el-row>

        <div style="margin-top: 1em">
          <el-space>
            <el-button @click="exportTimeline([timelineCurrentlyEditing])">
              导出
            </el-button>
            <el-button type="primary" @click="timelineTimeFormat()">
              切换时间格式
            </el-button>
          </el-space>
        </div>
      </div>
    </el-dialog>
  </el-container>
</template>

<style lang="scss" scoped>
.flex-header {
  display: flex;
  flex-direction: column;
  height: auto;
}

.container {
  min-width: 925px;
  max-width: 1200px;
  margin: 10px auto;
}

.timeline-editor-body {
  display: flex;
  gap: 20px;
}

.slider-demo-block {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
  .time-display {
    min-width: 60px;
    .time-display-text {
      line-height: 1;
      margin: 5px 0;
      padding: 0;
    }
  }
}

.timeline-dialog {
  .el-dialog__body {
    overflow-x: hidden;
    box-sizing: border-box;
  }
}

.editor-dialog-content {
  overflow-x: hidden;
  max-width: 100%;
}

.timeline-header {
  flex-wrap: wrap;
}

:deep(.editing-row) {
  font-weight: bold;
  filter: brightness(90%);

}
</style>
