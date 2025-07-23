<script lang="ts" setup>
import type { EventMap } from 'cactbot/types/event'
import type { Job } from 'cactbot/types/job'
import type { NotificationHandle } from 'element-plus'
import type { ITimeline, ITimelineLine } from '@/types/timeline'
import { ElLoading, ElMessage, ElMessageBox, ElNotification } from 'element-plus'

import * as LZString from 'lz-string'
import moment from 'moment'
import { useRouter } from 'vue-router'

import { useWebSocket } from '@/composables/useWebSocket'
import zoneInfo from '@/resources/zoneInfo'
import { parseTimeline, useTimelineStore } from '@/store/timeline'
import { copyToClipboard } from '@/utils/clipboard'
import Util from '@/utils/util'
import {
  addOverlayListener,
  callOverlayHandler,
} from '../../cactbot/resources/overlay_plugin_api'
import recommendedTimeline from '../resources/recommendedTimeline.json'

import 'animate.css'

const router = useRouter()
const { wsConnected } = useWebSocket({ allowClose: true, addWsParam: true })

const timelineStore = useTimelineStore()
const timelines = toRef(timelineStore, 'allTimelines')
const timelineFilters = toRef(timelineStore, 'filters')

const simulatedCombatTime = ref(0)

const selectedTimelines = ref<ITimeline[]>([])
const isAllSelected = ref(false)
const dialogVisible = ref(false)
const showFFlogsDialog = ref(false)
const showSettings = ref(false)
const dialogTableVisible = ref(false)

const timelineCurrentlyEditing = useLocalStorage<ITimeline>('timelineCurrentlyEditing', {
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

const keyword = ref('')
const selectedZoneId = ref('')
const selectedJob = ref('')

let elN: NotificationHandle | undefined

const filteredTimelines = computed(() => {
  return timelines.value.filter((timeline) => {
    const nameMatch = timeline.name.toLowerCase().includes(keyword.value.toLowerCase())

    const zoneMatch
      = !selectedZoneId.value || timeline.condition.zoneId === selectedZoneId.value

    const jobMatch
      = !selectedJob.value || timeline.condition.jobs.includes(selectedJob.value as Job)

    return nameMatch && zoneMatch && jobMatch
  })
})

const timeMinuteSecondDisplay = computed(() => {
  const time = simulatedCombatTime.value
  const isNegative = time < 0
  const totalSeconds = Math.abs(Math.floor(time))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${isNegative ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const maxSlider = ref(0)

function editTimeline(timeline: ITimeline): void {
  timelineCurrentlyEditing.value = timeline
  dialogVisible.value = true
  updateTransmissionTimeline()
}

function closeDialog() {
  dialogVisible.value = false
}

function newDemoTimeline(): void {
  editTimeline(timelineStore.allTimelines[timelineStore.newTimeline()])
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
    const maxTime = Math.max(...transmissionTimeline.value.map(v => v.time), 550)
    maxSlider.value = maxTime + 30
    simulatedCombatTime.value = -timelineStore.configValues.preBattle
  })
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
      ElMessage.success(`成功删除 ${selectedTimelines.value.length} 个时间轴`)
      timelines.value = timelines.value.filter(t => !selectedTimelines.value.includes(t))
      selectedTimelines.value = []
      isAllSelected.value = false
    })
    .catch(() => {})
}

function toggleSelectAll() {
  isAllSelected.value = !isAllSelected.value
  selectedTimelines.value = isAllSelected.value ? [...timelines.value] : []
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
    timeline.timeline = timeline.timeline.replace(/^#.*(?:\n|$)/gm, '')
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

function optimizedSize() {
  ElMessageBox.confirm(
    '要删除所有的注释行，仅保留必要的时间轴数据吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    },
  )
    .then(() => {
      timelineCurrentlyEditing.value.timeline
        = timelineCurrentlyEditing.value.timeline.replace(/^#.*(?:\n|$)/gm, '')
      ElMessage.success('完成')
    })
    .catch(() => {})
}

function showDialog() {
  dialogTableVisible.value = true
}

function loadRecommendedTimeline() {
  performImport(recommendedTimeline as ITimeline[], false)
}

onMounted(() => {
  addOverlayListener('BroadcastMessage', handleBroadcastMessage)

  const unwatch = watch(wsConnected, (val) => {
    if (val) {
      if (timelineStore.allTimelines.length === 0) {
        requestACTData()
      }
      unwatch()
      if (elN) {
        sendBroadcastData('post', timelineStore.$state)
        elN.close()
      }
    }
  })

  // 语法破坏性改动
  timelineStore.allTimelines.forEach(v => v.timeline = v.timeline.replaceAll(/^(?<a>.+), once: true(?<b>.+)$/gm, '$<a>$<b> once'))

  watch(timelineStore.$state, () => {
    if (wsConnected.value) {
      sendBroadcastData('post', timelineStore.$state)
    }
    else {
      elN?.close()
      elN = ElNotification({
        title: '你修改了时间轴，但',
        message: h('i', { style: 'color: #f00' }, '改动未应用，直到你成功连接到 WebSocket。'),
        showClose: false,
        duration: 0,
        position: 'bottom-left',
      })
    }
  }, { deep: true })
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
    <el-dialog v-model="dialogTableVisible" title="时间轴解析结果" align-center center draggable width="80%">
      <el-table :data="transmissionTimeline">
        <el-table-column property="time" label="time" min-width="60" />
        <el-table-column property="action" label="action" width="150">
          <template #default="{ row }">
            {{ row.action.replaceAll(/(^['"“”]|['"“”]$)/g, '') }}
          </template>
        </el-table-column>
        <el-table-column property="sync" label="sync" min-width="200">
          <template #default="{ row }">
            {{ row.sync ? row.sync : '-' }}
          </template>
        </el-table-column>
        <el-table-column property="syncOnce" label="once" min-width="100">
          <template #default="{ row }">
            {{ row.syncOnce ? '✅' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="window" min-width="100">
          <template #default="{ row }">
            {{ row.sync ? `${row.windowBefore},${row.windowAfter}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column property="jump" label="jump" min-width="100">
          <template #default="{ row }">
            {{ row.jump ? row.jump : '-' }}
          </template>
        </el-table-column>
        <el-table-column property="tts" label="tts" min-width="150">
          <template #default="{ row }">
            {{ row.tts ? row.tts : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    <timeline-settings-dialog
      v-model="showSettings"
      @save="handleSettingsSave"
    />
    <el-header class="flex-header">
      <el-row justify="space-between" align="middle">
        <el-space>
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
          <el-button color="#543d6c" size="small" @click="loadRecommendedTimeline">
            导入 SPJP M5S~M8S 时间轴
          </el-button>

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
        </el-space>

        <el-space>
          <el-button
            color="#626aef"
            style="color: white"
            size="small"
            @click="showSettings = true"
          >
            参数设置
          </el-button>
        </el-space>
      </el-row>
    </el-header>
    <el-main>
      <el-dialog
        v-model="showFFlogsDialog"
        title="从 FFlogs 生成时间轴"
        width="80%"
        :before-close="() => (showFFlogsDialog = false)"
        :close-on-press-escape="false"
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
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px;
  "
        >
          <div style="display: flex; gap: 10px; flex-wrap: wrap">
            <el-input
              v-model="keyword"
              placeholder="搜索名称..."
              clearable
              size="small"
              style="width: 180px"
            />
            <el-select
              v-model="selectedZoneId"
              placeholder="筛选地图"
              clearable
              size="small"
              style="width: 180px"
            >
              <el-option label="全部地图" value="" />
              <el-option
                v-for="zone in highDifficultZoneId"
                :key="zone.id"
                :label="zone.name"
                :value="zone.id"
              />
            </el-select>
            <el-select
              v-model="selectedJob"
              placeholder="筛选职业"
              clearable
              size="small"
              style="width: 180px"
            >
              <el-option label="全部职业" value="" />
              <el-option
                v-for="job in timelineStore.jobList"
                :key="job"
                :label="(Util.nameToFullName(job)?.cn ?? job).replace('冒险者', '全部职业')"
                :value="job"
              />
            </el-select>
          </div>
          <div v-show="keyword || selectedZoneId || selectedJob">
            <el-text type="info">
              筛选结果：共 {{ filteredTimelines.length }} 个时间轴
            </el-text>
          </div>
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
              style="margin-left: 10px"
              @click="deleteSelectedTimelines"
            >
              批量删除 ({{ selectedTimelines.length }})
            </el-button>
          </div>
        </div>
        <el-table
          :data="filteredTimelines"
          :row-class-name="tableRowClassName"
          style="width: 100%"
          stripe
          :default-sort="{ prop: 'condition', order: 'ascending' }"
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
      <el-card v-else>
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
      :close-on-press-escape="false"
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
            <el-button @click="openMarkdown">
              时间轴语法
            </el-button>
            <el-button @click="optimizedSize()">
              删除注释行
            </el-button>
            <el-button type="danger" @click="showDialog">
              展示调试信息
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
  margin: 8px auto;
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
  padding: 0.1em;
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

:deep(.editor-dialog-content){
  padding: 0.2em;
}
</style>
