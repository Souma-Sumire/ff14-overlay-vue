<script lang="ts" setup>
import type { EventMap } from 'cactbot/types/event'
import type { Job } from 'cactbot/types/job'
import type { MessageBoxInputData, NotificationHandle } from 'element-plus'
import type { ITimeline, ITimelineLine } from '@/types/timeline'
import { Refresh } from '@element-plus/icons-vue'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'

import * as LZString from 'lz-string'
import moment from 'moment'
import { useRouter } from 'vue-router'

import { useWebSocket } from '@/composables/useWebSocket'
import { bossPhase } from '@/resources/bossPhase'
// import recommendedTimeline from '../resources/recommendedTimeline.json'
import { ZoneInfo } from '@/resources/zoneInfo'
import { parseTimeline, useTimelineStore } from '@/store/timeline'
import { copyToClipboard } from '@/utils/clipboard'
import Util from '@/utils/util'
import { addOverlayListener, callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'

const router = useRouter()
const { wsConnected } = useWebSocket({ allowClose: true, addWsParam: true })

const timelineStore = useTimelineStore()
const allTimelinesRef = toRef(timelineStore, 'allTimelines')
const timelineFilters = toRef(timelineStore, 'filters')

const simulatedCombatTime = ref(0)

const selectedTimelines = ref<ITimeline[]>([])
const isAllSelected = ref(false)
const dialogVisible = ref(false)
const showFFlogsDialog = ref(false)
const showSettings = ref(false)
const dialogTableVisible = ref(false)
const exportDialogVisible = ref(false)
const selectedExportType = ref('compressed_full')
const exportOptions = reactive({
  compressedFull: '',
  compressedZip: '',
  rawJson: '',
  fullSize: 0,
  optimizedSize: 0,
  rawSize: 0,
})

const syncStatus = ref<'idle' | 'syncing'>('idle')
const lastSyncTime = ref<string>('')
const hasUnsyncedChanges = ref(false)

const fflogsSourceRe = /^(?:a:)?\w{16,}(?:[#?]fight=(?:\d+|last))?$/

const fullPath = computed(() => {
  const timelineUrl = router.resolve({ path: '/timeline' })
  return `${window.location.protocol}//${window.location.host}/ff14-overlay-vue/${timelineUrl.href}`
})

const currentTimelineEditing = useLocalStorage<ITimeline>(
  'timelineCurrentlyEditing',
  {
    name: '空',
    condition: { zoneID: '0', jobs: ['NONE'], phase: undefined },
    timeline: '空',
    source: '空',
    createdAt: '空',
  },
)

const parsedTimelineLines = ref([] as ITimelineLine[])

let loading: any = null
let keepRetrying = false

const keyword = ref('')
const selectedZoneId = ref('')
const selectedJob = ref('')
const selectedPhase = ref('')

let wsWarningNotification: NotificationHandle | undefined

const filteredTimelines = computed(() => {
  return allTimelinesRef.value.filter((timeline) => {
    const nameMatch = timeline.name
      .toLowerCase()
      .includes(keyword.value.toLowerCase())

    const zoneMatch
      = !selectedZoneId.value
        || timeline.condition.zoneID === selectedZoneId.value

    const jobMatch
      = !selectedJob.value
        || timeline.condition.jobs.includes(selectedJob.value as Job)

    const phaseMatch
      = !selectedPhase.value
        || (selectedPhase.value === 'undefined'
          ? !timeline.condition.phase
          : timeline.condition.phase === selectedPhase.value)

    return nameMatch && zoneMatch && jobMatch && phaseMatch
  })
})

const timeMinuteSecondDisplay = computed(() => {
  const time = simulatedCombatTime.value
  const isNegative = time < 0
  const totalSeconds = Math.abs(Math.floor(time))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${isNegative ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`
})

watch(
  () => currentTimelineEditing.value.condition.zoneID,
  (newZoneID) => {
    if (!bossPhase[newZoneID]) {
      currentTimelineEditing.value.condition.phase = undefined
    }
  },
)

watch(selectedZoneId, (newZoneID) => {
  if (newZoneID && !bossPhase[newZoneID]) {
    selectedPhase.value = ''
  }
})

const maxSlider = ref(0)

function editTimeline(timeline: ITimeline): void {
  currentTimelineEditing.value = timeline
  dialogVisible.value = true
  updateTransmissionTimeline()
}

function closeDialog() {
  dialogVisible.value = false
}

function createNewTimeline(): void {
  editTimeline(timelineStore.allTimelines[timelineStore.newTimeline()]!)
}

function updateTransmissionTimeline() {
  parsedTimelineLines.value = [
    {
      time: 0,
      action: '正在加载...',
      show: true,
      windowBefore: 0,
      windowAfter: 0,
      alertAlready: true,
    },
  ]
  parseTimeline(currentTimelineEditing.value.timeline).then((result) => {
    parsedTimelineLines.value = result
    const maxTime = Math.max(
      ...parsedTimelineLines.value.map(v => v.time),
      550,
    )
    maxSlider.value = maxTime + 30
    simulatedCombatTime.value = -timelineStore.configValues.preBattle
  })
}

function timelineTimeFormat() {
  currentTimelineEditing.value.timeline
    = currentTimelineEditing.value.timeline.replaceAll(
      /(?<=^(?:#\s*)?)(\d+(?::\d+(?:\.\d{1,2})?|(?:\.\d+)?))/gm,
      (match) => {
        return match.includes(':')
          ? moment.duration(`00:${match}`).as('seconds').toString()
          : moment.utc(Number(match) * 1000).format('mm:ss.S')
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
      allTimelinesRef.value.splice(
        allTimelinesRef.value.findIndex(v => v === target),
        1,
      )
    })
    .catch(() => {})
}

function copyTimeline(target: ITimeline): void {
  const newTimeline = JSON.parse(JSON.stringify(target))
  newTimeline.name = `${newTimeline.name} - 副本`
  newTimeline.createdAt = new Date().toLocaleString()
  allTimelinesRef.value.push(newTimeline)
  timelineStore.sortTimelines()
  ElMessage.success(`已制作「${target.name}」的副本`)
}

function batchDeleteTimelines() {
  if (selectedTimelines.value.length === 0) {
    ElMessage.warning('请选择要删除的时间轴')
    return
  }
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedTimelines.value.length} 个时间轴吗？`,
    '批量删除',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(() => {
      const selectedIds = new Set(selectedTimelines.value)
      timelineStore.allTimelines = timelineStore.allTimelines.filter(
        v => !selectedIds.has(v),
      )
      selectedTimelines.value = []
      ElMessage.success('批量删除成功')
    })
    .catch(() => {})
}

function batchClearTimelines(): void {
  ElMessageBox.confirm(
    '确定要清空所有时间轴吗？此操作不可逆！',
    '危险操作',
    {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
      type: 'error',
    },
  )
    .then(() => {
      ElMessageBox.prompt(
        '输入 "我确认清空" 以执行此操作',
        '二次确认',
        {
          confirmButtonText: '确定清空',
          cancelButtonText: '取消',
          inputPattern: /^我确认清空$/,
          inputErrorMessage: '请输入正确的确认文字',
          type: 'warning',
        },
      )
        .then(() => {
          timelineStore.allTimelines = []
          selectedTimelines.value = []
          ElMessage.success('已清空所有时间轴')
        })
    })
    .catch(() => {})
}

function toggleSelectAll() {
  isAllSelected.value = !isAllSelected.value
  selectedTimelines.value = isAllSelected.value
    ? [...allTimelinesRef.value]
    : []
}

function batchExportTimelines() {
  if (selectedTimelines.value.length === 0) {
    ElMessage.warning('请选择要导出的时间轴')
    return
  }

  exportTimelines(selectedTimelines.value)
}

function exportTimelines(timelineArr: ITimeline[]) {
  const isSingle = timelineArr.length === 1
  const exportTarget = isSingle ? timelineArr[0] : timelineArr

  const fullJson = JSON.stringify(exportTarget)
  const rawJson = JSON.stringify(exportTarget, null, 2)

  // 处理去注释版本
  let zipTarget
  if (isSingle) {
    zipTarget = JSON.parse(fullJson)
    zipTarget.timeline = zipTarget.timeline.replace(/^#.*(?:\n|$)/gm, '')
  }
  else {
    zipTarget = JSON.parse(fullJson)
    for (const timeline of zipTarget) {
      timeline.timeline = timeline.timeline.replace(/^#.*(?:\n|$)/gm, '')
    }
  }
  const zippedJson = JSON.stringify(zipTarget)

  exportOptions.compressedFull = LZString.compressToBase64(fullJson)
  exportOptions.compressedZip = LZString.compressToBase64(zippedJson)
  exportOptions.rawJson = rawJson
  exportOptions.fullSize = exportOptions.compressedFull.length
  exportOptions.optimizedSize = exportOptions.compressedZip.length
  exportOptions.rawSize = rawJson.length

  selectedExportType.value = 'compressed_full'
  exportDialogVisible.value = true
}

function confirmExport() {
  let finalContent = ''
  if (selectedExportType.value === 'compressed_full')
    finalContent = exportOptions.compressedFull
  else if (selectedExportType.value === 'compressed_zip')
    finalContent = exportOptions.compressedZip
  else finalContent = exportOptions.rawJson

  copyToClipboardWithMsg(
    finalContent,
    '数据复制成功，已写入剪切板。',
    '复制失败，请手动复制！',
  )
  exportDialogVisible.value = false
}

function importTimelineData(): void {
  const parseData = (value: string): ITimeline[] | null => {
    if (!value)
      return null
    // 1. 尝试直接解析为 JSON (支持多行/美化后的 JSON)
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [parsed]
    }
    catch {
      // 2. 尝试按行解析 (支持每一行是独立的 JSON 或压缩字符串)
      const lines = value.split('\n').filter(line => line.trim() !== '')
      let results: ITimeline[] = []
      for (const line of lines) {
        try {
          const d = JSON.parse(line)
          results = results.concat(Array.isArray(d) ? d : [d])
        }
        catch {
          try {
            const decompressed = LZString.decompressFromBase64(line)
            if (decompressed) {
              const d = JSON.parse(decompressed)
              results = results.concat(Array.isArray(d) ? d : [d])
            }
          }
          catch {
            // 该行无法解析，跳过或返回 null 代表失败
          }
        }
      }
      return results.length > 0 ? results : null
    }
  }

  ElMessageBox.prompt('请输入导出的字符串（支持单行、多行 JSON 或压缩格式）', '导入时间轴', {
    confirmButtonText: '解析',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputValidator: (value) => {
      const data = parseData(value)
      if (!data) {
        return '无法解析任何有效的时间轴数据，请确保输入格式正确。'
      }
      return true
    },
    inputErrorMessage: '无效的输入',
  })
    .then((res) => {
      const { value } = res as MessageBoxInputData
      const allParsedData = parseData(value)
      if (!allParsedData)
        return

      const timelineCount = allParsedData.length
      const titles = allParsedData
        .map(timeline => `「${timeline.name}」`)
        .join(', ')

      ElMessageBox.confirm(
        `确定要导入这 ${timelineCount} 个时间轴吗？\n${titles}`,
        '二次确认',
        {
          confirmButtonText: '确定导入',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
        .then(() => {
          saveImportedTimelines(allParsedData)
        })
        .catch(() => {})
    })
    .catch(() => {})
}

function saveImportedTimelines(parsedData: ITimeline[]): void {
  timelineStore.allTimelines.push(...parsedData)
  timelineStore.sortTimelines()

  for (const timeline of timelineStore.allTimelines) {
    if (timeline.condition.jobs === undefined) {
      timeline.condition.jobs = [(timeline.condition as any)?.job ?? 'NONE']
    }
  }

  // 追加操作

  const uniqueTimelines: ITimeline[] = []
  const seen = new Set()

  for (const timeline of timelineStore.allTimelines) {
    const timelineString = JSON.stringify({
      name: timeline.name,
      condition: timeline.condition,
      timeline: timeline.timeline,
      source: timeline.source,
      createdAt: timeline.createdAt,
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
    message: `追加成功！共导入 ${parsedData.length} 个时间轴${
      removedCount > 0 ? `，但其中 ${removedCount} 个重复，已自动移除。` : ''
    }`,
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

function requestACTTimelineData() {
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
      requestACTTimelineData()
    }
  }, 5000)
}

const handleBroadcastMessage: EventMap['BroadcastMessage'] = (e) => {
  if (e.source !== 'soumaTimeline')
    return
  if ((e.msg as any).type === 'post') {
    // 得到 timeline 中储存的数据（仅在网页无数据时才会触发）
    keepRetrying = false
    loading.close()

    const data = (e.msg as { data: typeof timelineStore.$state }).data

    for (const v of data.allTimelines) {
      timelineStore.normalizeTimeline(v)
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
  else if ((e.msg as any).type === 'success') {
    // timeline 回报 数据同步成功
    hasUnsyncedChanges.value = false
    syncStatus.value = 'idle'
    lastSyncTime.value = new Date().toLocaleTimeString()
  }
  else if ((e.msg as any).type === 'hello') {
    // timeline 主动告知 上线
    syncData()
  }
}

function loadTimelineSettings() {
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

function saveSettingsChanges(settings: typeof timelineStore) {
  timelineStore.configValues = settings.configValues
  timelineStore.showStyle = settings.showStyle
}

function copyToClipboardWithMsg(
  text: string,
  successMsg = '复制成功',
  errorMsg = '复制失败',
) {
  copyToClipboard(text)
    .then(() => ElMessage.success(successMsg))
    .catch(() => ElMessage.error(errorMsg))
}

function tableRowClassName({ row }: { row: ITimeline }) {
  return row === currentTimelineEditing.value ? 'editing-row' : ''
}

function removeCommentsInTimeline() {
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
      currentTimelineEditing.value.timeline
        = currentTimelineEditing.value.timeline.replace(/^#.*(?:\n|$)/gm, '')
      ElMessage.success('完成')
    })
    .catch(() => {})
}

function showTimelineTableDialog() {
  dialogTableVisible.value = true
}

// function loadRecommendedTimeline() {
//   saveImportedTimelines(recommendedTimeline as ITimeline[], false)
// }

function syncData() {
  hasUnsyncedChanges.value = true
  syncStatus.value = 'syncing'
  sendBroadcastData('post', timelineStore.$state)
}

function getMapName(zoneId: number) {
  const names = ZoneInfo[zoneId]?.name
  if (!names) {
    return '未知地图'
  }
  return names.cn || `${names.ja} / ${names.en}`
}

function getLabel(job: Job) {
  return (Util.jobToFullName(job.toUpperCase() as Job)?.cn ?? job).replace(
    '冒险者',
    '全部职业',
  )
}

onMounted(() => {
  addOverlayListener('BroadcastMessage', handleBroadcastMessage)

  const unwatch = watch(wsConnected, (val) => {
    if (val) {
      if (timelineStore.allTimelines.length === 0) {
        requestACTTimelineData()
      }
      unwatch()
      if (wsWarningNotification) {
        wsWarningNotification.close()
        syncData()
      }
    }
  })

  // 语法破坏性改动
  timelineStore.allTimelines.forEach(
    v =>
      (v.timeline = v.timeline.replaceAll(
        /^(?<a>.+), once: true(?<b>.+)$/gm,
        '$<a>$<b> once',
      )),
  )

  const syncDataDebounced = useDebounceFn(() => {
    syncData()
  }, 500)

  watch(() => timelineStore.$state, syncDataDebounced, { deep: true })
})

function init(): void {
  loadTimelineSettings()
  timelineStore.sortTimelines()
}

init()
</script>

<template>
  <el-container class="container">
    <el-dialog
      v-model="dialogTableVisible"
      title="时间轴解析结果"
      align-center
      center
      draggable
      width="80%"
    >
      <el-table :data="parsedTimelineLines">
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
      @save="saveSettingsChanges"
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
            <el-button type="primary" size="small" @click="createNewTimeline">
              手动编写
            </el-button>
          </el-button-group>
          <!-- <el-button
            color="#543d6c"
            size="small"
            @click="loadRecommendedTimeline"
          >
            导入 SPJP M5S~M8S 时间轴
          </el-button> -->

          <el-button-group>
            <el-button size="small" @click="importTimelineData">
              导入字符串
            </el-button>
            <el-button
              size="small"
              class="export"
              @click="exportTimelines(allTimelinesRef)"
            >
              导出全部
            </el-button>
          </el-button-group>
        </el-space>

        <el-space>
          <el-popover
            placement="bottom-end"
            title="同步未生效"
            :width="280"
            trigger="hover"
            :disabled="wsConnected || !hasUnsyncedChanges"
          >
            <template #reference>
              <div class="connection-status" :class="{ connected: wsConnected, warning: !wsConnected && hasUnsyncedChanges }">
                <span class="dot" />
                <span class="status-text">
                  <template v-if="!wsConnected && hasUnsyncedChanges">
                    改动暂未同步 (连接断开)
                  </template>
                  <template v-else>
                    {{ wsConnected ? '悬浮窗已连接' : '悬浮窗未连接' }}
                  </template>
                </span>
                <span v-if="lastSyncTime && (!hasUnsyncedChanges || wsConnected)" class="sync-time">（同步于 {{ lastSyncTime }}）</span>
                <el-icon v-if="syncStatus === 'syncing'" class="is-loading" style="margin-left: 5px">
                  <Refresh />
                </el-icon>
              </div>
            </template>
            <div style="font-size: 13px; line-height: 1.6; color: var(--el-text-color-regular)">
              检测到你有未同步的改动。请确保你在ACT中启用了
              <el-link
                type="danger"
                :href="fullPath"
                target="_blank"
                style="vertical-align: baseline; font-weight: bold; text-decoration: underline"
              >
                时间轴悬浮窗
              </el-link>
              ，改动才能实时推送到时间轴。
            </div>
          </el-popover>
          <CommonThemeToggle storage-key="timeline-settings-theme" />
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
        :close-on-click-modal="false"
      >
        <timeline-fflogs-import
          :filters="timelineFilters"
          @show-f-flogs-toggle="() => (showFFlogsDialog = false)"
          @edit-timeline="editTimeline"
        />
      </el-dialog>
      <el-card v-if="allTimelinesRef.length > 0">
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
            <ZoneSelecter
              v-model:select-zone="selectedZoneId"
              placeholder="筛选地图"
              size="small"
              style="width: 180px"
              :clearable="true"
            />
            <el-select
              v-model="selectedPhase"
              placeholder="筛选阶段"
              clearable
              size="small"
              style="width: 120px"
            >
              <el-option label="全部" value="" />
              <el-option label="门神" value="door" />
              <el-option label="本体" value="final" />
              <el-option label="无设定" value="undefined" />
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
                :label="getLabel(job)"
                :value="job"
              />
            </el-select>
          </div>
          <div v-show="keyword || selectedZoneId || selectedJob || selectedPhase">
            <el-text type="info">
              筛选结果：共 {{ filteredTimelines.length }} 个时间轴
            </el-text>
          </div>
          <div>
            <el-button
              type="primary"
              size="small"
              :disabled="selectedTimelines.length === 0"
              @click="batchExportTimelines"
            >
              批量导出 ({{ selectedTimelines.length }})
            </el-button>
            <el-button
              type="danger"
              size="small"
              :disabled="selectedTimelines.length === 0"
              style="margin-left: 10px"
              @click="batchDeleteTimelines"
            >
              批量删除 ({{ selectedTimelines.length }})
            </el-button>
            <el-button
              type="danger"
              size="small"
              plain
              style="margin-left: 10px"
              @click="batchClearTimelines"
            >
              清空列表
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
              selectedTimelines = selection
              isAllSelected = selection.length === allTimelinesRef.length
            }
          "
        >
          <el-table-column type="selection" width="55" align="center">
            <template #header>
              <el-checkbox v-model="isAllSelected" @change="toggleSelectAll" />
            </template>
          </el-table-column>
          <el-table-column
            prop="name"
            label="名称"
            sortable
            :show-overflow-tooltip="true"
          />
          <el-table-column label="地图" sortable prop="condition">
            <template #default="scope">
              {{ getMapName(scope.row.condition.zoneID) }}
            </template>
          </el-table-column>
          <el-table-column prop="condition" label="阶段" width="80">
            <template #default="scope">
              {{
                scope.row.condition.phase === 'door'
                  ? '门神'
                  : scope.row.condition.phase === 'final'
                    ? '本体'
                    : ''
              }}
            </template>
          </el-table-column>
          <el-table-column prop="condition" label="职业">
            <template #default="scope">
              {{
                scope.row.condition.jobs
                  .map((v: Job) => getLabel(v))
                  .join('、')
                  .replace('冒险者', '全部职业')
              }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="editTimeline(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                @click="copyTimeline(scope.row)"
              >
                制作副本
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
      center
      align-center
      :before-close="closeDialog"
      class="timeline-dialog"
      width="65%"
      style="min-width: 550px; max-width: 1000px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="editor-dialog-content">
        <el-form :model="currentTimelineEditing">
          <el-row class="timeline-header" :gutter="10">
            <el-col :span="16">
              <el-form-item label="名称">
                <el-input v-model="currentTimelineEditing.name" placeholder="请输入名称" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="来源">
                <div class="source-container">
                  <el-link
                    v-if="fflogsSourceRe.test(currentTimelineEditing.source)"
                    :href="`https://cn.fflogs.com/reports/${currentTimelineEditing.source.replace('#', '?')}&type=damage-done`"
                    target="_blank"
                    class="source-link"
                  >
                    <img
                      class="site-logo"
                      src="https://assets.rpglogs.cn/img/ff/favicon.png?v=4"
                      alt="FF Logs"
                    >
                    <span>{{ currentTimelineEditing.source }}</span>
                  </el-link>
                  <el-input
                    v-else
                    :value="`${currentTimelineEditing.source}${currentTimelineEditing.createdAt ? `（${currentTimelineEditing.createdAt}）` : ''}`"
                    disabled
                  />
                </div>
              </el-form-item>
            </el-col>

            <el-col :span="24">
              <el-row :gutter="10">
                <el-col :span="bossPhase[currentTimelineEditing.condition.zoneID] ? 16 : 24">
                  <el-form-item label="地图">
                    <ZoneSelecter
                      v-model:select-zone="currentTimelineEditing.condition.zoneID"
                      size="default"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col v-if="bossPhase[currentTimelineEditing.condition.zoneID]" :span="8">
                  <el-form-item label="阶段">
                    <el-radio-group v-model="currentTimelineEditing.condition.phase" size="default" style="display: flex; flex-wrap: nowrap">
                      <el-radio-button value="door">
                        门神
                      </el-radio-button>
                      <el-radio-button value="final">
                        本体
                      </el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-col>

            <el-col :span="24">
              <el-form-item label="职业">
                <el-select
                  v-model="currentTimelineEditing.condition.jobs"
                  multiple
                  collapse-tags
                  collapse-tags-indicator
                  style="width: 100%"
                  placeholder="选择适用职业"
                >
                  <el-option
                    v-for="job in timelineStore.jobList"
                    :key="job"
                    :label="getLabel(job)"
                    :value="job"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

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
              v-model="currentTimelineEditing.timeline"
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
            :lines="parsedTimelineLines"
            :runtime="simulatedCombatTime"
            :show-style="timelineStore.showStyle"
          />
        </el-row>

        <div style="margin-top: 1em">
          <el-space>
            <el-button @click="exportTimelines([currentTimelineEditing])">
              导出
            </el-button>
            <el-button @click="timelineTimeFormat()">
              切换时间格式
            </el-button>
            <el-button @click="openMarkdown">
              时间轴语法
            </el-button>
            <el-button @click="removeCommentsInTimeline()">
              去除注释行
            </el-button>
            <el-button @click="showTimelineTableDialog">
              展示调试信息
            </el-button>
          </el-space>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="exportDialogVisible"
      title="导出时间轴"
      width="400px"
      append-to-body
    >
      <div style="margin-bottom: 15px; color: var(--el-text-color-secondary)">
        请选择导出格式和压缩方案：
      </div>
      <el-radio-group v-model="selectedExportType" class="export-radio-group">
        <el-radio value="compressed_full" border>
          完整压缩版
          <span class="export-size-info">({{ exportOptions.fullSize }} 字节, 带注释)</span>
        </el-radio>
        <el-radio value="compressed_zip" border>
          优化压缩版
          <span class="export-size-info">({{ exportOptions.optimizedSize }} 字节, 去注释)</span>
        </el-radio>
        <el-radio value="raw_json" border>
          原始 JSON 版
          <span class="export-size-info">({{ exportOptions.rawSize }} 字节, 未压缩)</span>
        </el-radio>
      </el-radio-group>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="exportDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmExport">
            复制到剪贴板
          </el-button>
        </span>
      </template>
    </el-dialog>
  </el-container>
</template>

<style lang="scss" scoped>
.export-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  width: 100%;

  :deep(.el-radio) {
    margin-right: 0;
    height: auto;
    padding: 10px 15px;
    display: flex;
    align-items: center;

    .el-radio__label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  }
}

.export-size-info {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.connection-status {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--el-fill-color-lighter);

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--el-color-info);
    margin-right: 6px;
    transition: all 0.3s;
  }

  &.connected {
    color: var(--el-text-color-regular);
    .dot {
      background: var(--el-color-success);
      box-shadow: 0 0 6px var(--el-color-success);
    }
  }

  &.warning {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
    .dot {
      background: var(--el-color-danger);
      box-shadow: 0 0 6px var(--el-color-danger);
    }
  }

  .status-text {
    font-weight: 500;
  }

  .sync-time {
    font-size: 11px;
    opacity: 0.8;
  }
}

:global(body) {
  margin: 0;
}
.flex-header {
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

.source-container {
  display: flex;
  align-items: center;
  height: 32px;
  width: 100%;
}

.source-link {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  padding: 0 8px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  height: 32px;
  width: 100%;
  transition: background-color 0.3s;
  box-sizing: border-box;
  text-decoration: none !important;
  &:hover {
    background-color: var(--el-fill-color);
  }
  .site-logo {
    width: 20px;
    height: 20px;
  }
  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: normal;
    font-size: 12px;
  }
}

.timeline-header {
  flex-wrap: wrap;
}

:deep(.editing-row) {
  font-weight: bold;
}

:deep(.editor-dialog-content) {
  padding: 0.2em;
  .el-form-item {
    margin-bottom: 16px;
  }
  .el-form-item__label {
    padding-bottom: 4px;
    font-weight: bold;
    color: var(--el-text-color-regular);
  }
}
</style>
