<script setup lang="ts">
import type { DisplayFilterMode } from '@/components/loot-history/LootDisplayFilterSegmented.vue'
import type { BisConfig, BisValue } from '@/utils/bisUtils'
import type { LootRecord, RollInfo } from '@/utils/lootParser'
import {
  ArrowDown,
  BottomRight,
  Calendar,
  Check,
  CircleCheckFilled,
  Delete,
  Download,
  Edit,
  EditPen,
  FolderOpened,
  InfoFilled,
  Monitor,
  Mouse,
  Plus,
  QuestionFilled,
  RefreshLeft,
  RefreshRight,
  Right,
  Search,
  Setting,
  Star,
  Timer,
  Upload,
  UploadFilled,
  User,
  View,
  Warning,
} from '@element-plus/icons-vue'
import {
  ElAutocomplete,
  ElCheckbox,
  ElDialog,
  ElForm,
  ElFormItem,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTag,
} from 'element-plus'
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import BisAllocator from '@/components/loot-history/BisAllocator.vue'
import LootStatisticsPanel from '@/components/loot-history/charts/LootStatisticsPanel.vue'
import LootDisplayFilterSegmented from '@/components/loot-history/LootDisplayFilterSegmented.vue'
import LootPlayerRoll from '@/components/loot-history/LootPlayerRoll.vue'
import LootSortSegmented from '@/components/loot-history/LootSortSegmented.vue'
import PlayerDisplay from '@/components/loot-history/PlayerDisplay.vue'
import RoleBadge from '@/components/loot-history/RoleBadge.vue'
import SummaryItemTags from '@/components/loot-history/SummaryItemTags.vue'
import { useIndexedDB } from '@/composables/useIndexedDB'
import {

  countObtainedItems,
  DEFAULT_ROWS,
  isBisItem,
  isPlayerComplete,
  LAYER_CONFIG,
} from '@/utils/bisUtils'
import {
  DROP_ORDER,

  PART_ORDER,
  ROLE_DEFINITIONS,

  sanitizeItemName,
  sanitizePlayerName,
} from '@/utils/lootParser'
import {
  getFormattedWeekLabel,
  getRaidWeekIndex,
  getRaidWeekLabel,
  getRaidWeekStart,
} from '@/utils/raidWeekUtils'
import LogParserWorker from '@/workers/logParser.ts?worker'

const GAME_VERSION_CONFIG = {
  // 零式首周开始时间
  RAID_START_TIME: '2026-01-06T16:00',
  // 零式装备/道具系列的关键词
  RAID_SERIES_KEYWORD: '总冠军',
}

const LABELS = {
  LOOT: '装备掉落/拿装备记录',
  ROLES: '固定队成员',
  BIS: '毕业装备需求 (BIS)',
  MAPPING: '角色合并映射',
  WEEK_CORRECTION: '手动修改过的CD周数',
  PLAYER_CORRECTION: '手动修改过的装备获得者',
  SETTINGS: '过滤和排序偏好',
}

const ROLE_SETTING_HINT
  = '需在左上方“固定队 - 职位设置”中完成所有职位后方可开启'

interface DBConfig {
  key: string
  value: any
}

const dbRecords = useIndexedDB<LootRecord>('loot-history-records')
const dbConfig = useIndexedDB<DBConfig>('loot-history-config')
const dbHandle = useIndexedDB<{
  key: string
  handle: FileSystemDirectoryHandle
}>('loot-history-handle')

const isInitializing = ref(true)
const isMergePanelActive = ref(false)
const isLoading = ref(false)
const loadingProgress = ref(0)

const parsedLogFiles = ref<{ name: string, size: number }[]>([])
const pendingLogFiles = ref<{ name: string, size: number }[]>([])
const lootRecords = shallowRef<LootRecord[]>([])
const existingKeys = ref(new Set<string>())
const blacklistedKeys = ref(new Set<string>())
const itemVisibility = ref<Record<string, boolean>>({})
const viewMode = ref<'list' | 'summary' | 'slot' | 'week' | 'chart' | 'bis'>(
  'summary',
)
const currentHandle = ref<FileSystemDirectoryHandle | null>(null)

const showManualAddDialog = ref(false)
const showExportDialog = ref(false)
const showImportConfirmDialog = ref(false)
const exportForm = ref({
  loot: true,
  bis: true,
  roles: true,
  mapping: true,
  weekCorrection: true,
  playerCorrection: true,
  settings: true,
})
const importForm = ref({
  loot: true,
  bis: true,
  roles: true,
  mapping: true,
  weekCorrection: true,
  playerCorrection: true,
  settings: true,
})
const importDiffs = ref({
  loot: true,
  bis: true,
  roles: true,
  mapping: true,
  weekCorrection: true,
  playerCorrection: true,
  settings: true,
})
const importDataPending = ref<any>(null)
const manualForm = ref({
  timestamp: '',
  item: '',
  player: '',
})

const showClearDialog = ref(false)
const clearForm = ref({
  loot: true,
  bis: false,
  roles: false,
  mapping: false,
  weekCorrection: false,
  playerCorrection: false,
  settings: false,
})

const showTimeSetup = ref(false)

const playerVisibility = ref<Record<string, boolean>>({})
const recordWeekCorrections = ref<Record<string, number>>({})
const recordPlayerCorrections = ref<Record<string, string>>({})
const popoverTargetRecord = ref<LootRecord | null>(null)
const popoverTriggerRef = ref()
const popoverOpenedWithCorrection = ref<Record<string, boolean>>({})
const pendingWinnerChange = ref<{
  record: LootRecord
  newPlayer: string
} | null>(null)
const lastSyncTime = ref('')
const syncSuccessVisible = ref(false)
const showCustomCorrectionDialog = ref(false)
const correctionSearch = ref('')
const activeCorrectionTab = ref('player')
const bisConfig = ref<BisConfig>({ playerBis: {} })

const filteredPlayerCorrections = computed(() => {
  if (!showCustomCorrectionDialog.value)
    return []
  const list: any[] = []
  const recordMap = new Map(lootRecords.value.map(r => [r.key, r]))

  Object.entries(recordPlayerCorrections.value).forEach(([key, newVal]) => {
    const record = recordMap.get(key)
    if (!record)
      return
    list.push({
      key,
      type: 'player',
      itemName: record.item,
      oldVal: record.player,
      newVal,
      record,
    })
  })

  if (!correctionSearch.value)
    return list
  const s = correctionSearch.value.toLowerCase()
  return list.filter(item =>
    item.itemName.toLowerCase().includes(s)
    || item.oldVal.toString().toLowerCase().includes(s)
    || item.newVal.toString().toLowerCase().includes(s),
  )
})

const filteredWeekCorrections = computed(() => {
  if (!showCustomCorrectionDialog.value)
    return []
  const list: any[] = []
  const recordMap = new Map(lootRecords.value.map(r => [r.key, r]))

  Object.entries(recordWeekCorrections.value).forEach(([key, newVal]) => {
    const record = recordMap.get(key)
    if (!record)
      return
    const oldIdx = getRaidWeekIndex(record.timestamp, GAME_VERSION_CONFIG.RAID_START_TIME)
    const targetIdx = oldIdx + (newVal as number)
    list.push({
      key,
      type: 'week',
      itemName: record.item,
      oldVal: `第 ${oldIdx} 周`,
      newVal: `第 ${targetIdx} 周`,
      record,
    })
  })

  if (!correctionSearch.value)
    return list
  const s = correctionSearch.value.toLowerCase()
  return list.filter(item =>
    item.itemName.toLowerCase().includes(s)
    || item.oldVal.toString().toLowerCase().includes(s)
    || item.newVal.toString().toLowerCase().includes(s),
  )
})

function restoreCorrection(item: any) {
  if (item.type === 'player') {
    const newMap = { ...recordPlayerCorrections.value }
    delete newMap[item.key]
    recordPlayerCorrections.value = newMap
  }
  else {
    const newMap = { ...recordWeekCorrections.value }
    delete newMap[item.key]
    recordWeekCorrections.value = newMap
  }
  ElMessage.success('已还原该条修正项')
}

// 排序模式：'part' (部位排序) | 'drop' (掉落排序)
const summarySortMode = ref<'part' | 'drop'>('part')
const slotSortMode = ref<'part' | 'drop'>('part')
const weekSortMode = ref<'part' | 'drop'>('drop')
const bisSortMode = ref<'part' | 'drop'>('part')

const playerMapping = ref<Record<string, string>>({})

function getActualPlayer(name: string): string {
  if (!playerMapping.value)
    return name
  return playerMapping.value[name] || name
}

function getRecordPlayer(record: LootRecord): string {
  const corrected = recordPlayerCorrections.value[record.key]
  return corrected || record.player
}

const selectionForMerge = ref<string[]>([])
function handlePlayerSelectForMerge(p: string) {
  if (selectionForMerge.value.includes(p)) {
    selectionForMerge.value = selectionForMerge.value.filter(x => x !== p)
  }
  else {
    if (selectionForMerge.value.length >= 2)
      selectionForMerge.value.shift()
    selectionForMerge.value.push(p)
  }
}

function confirmMergeSelection() {
  if (selectionForMerge.value.length === 2) {
    addMapping(selectionForMerge.value[0], selectionForMerge.value[1])
    selectionForMerge.value = []
  }
}

const playerSummaryFilterMode = ref<DisplayFilterMode>('obtained')
const slotSummaryFilterMode = ref<DisplayFilterMode>('obtained')

function addMapping(from?: string, to?: string) {
  if (from && to) {
    playerMapping.value = { ...playerMapping.value, [from]: to }
  }
}

function removeMapping(key: string) {
  const newMap = { ...playerMapping.value }
  delete newMap[key]
  playerMapping.value = newMap
}

const currentPage = ref(1)
const pageSize = 50

const logPath = ref('')
const fullLogPath = ref('')
const isSyncing = ref(false)
const processedFiles = ref<Record<string, { size: number, mtime: number }>>({})
const syncStartDate = ref(GAME_VERSION_CONFIG.RAID_START_TIME)
const syncEndDate = ref<string | null>(null)
const isRaidFilterActive = ref(false)
const isSyncNeeded = ref(false)
const isOnlyRaidMembersActive = ref(false)
const EQUIP_ROLES = [
  '御敌',
  '制敌',
  '精准',
  '治愈',
  '强攻',
  '强袭',
  '游击',
  '咏咒',
]
const EQUIP_ROLES_STR = EQUIP_ROLES.join('|')

const RAID_REGEX = new RegExp(
  `${GAME_VERSION_CONFIG.RAID_SERIES_KEYWORD}武器箱|${GAME_VERSION_CONFIG.RAID_SERIES_KEYWORD}(?!${EQUIP_ROLES_STR})|规格神典石|强化药|硬化药|强化纤维|神典石`,
)
const EQUIP_SERIES_REGEX = new RegExp(`(?<series>.+)(${EQUIP_ROLES_STR}).+`)
const showOnlyRole = ref(false)
const hideUnselectedItems = ref(false)
const hideUnselectedPlayers = ref(false)
const hideEmptyPlayers = ref(true)
const systemFilterSettings = ref({
  cards: true,
  materia: true,
  music: true,
  book: true,
  totem: true,
  other: true,
  maskedSeries: [] as string[],
})
const playerRoles = ref<Record<string, string>>({})

// 会话内权限缓存，减少 queryPermission 带来的 1s+ 延迟
let sessionPermissionGranted = false

const saveConfigDebounced = (() => {
  let timer: any = null
  return (configs: { key: string, value: any }[]) => {
    if (timer)
      clearTimeout(timer)
    timer = setTimeout(() => {
      dbConfig.bulkSet(configs)
    }, 500)
  }
})()

const lastSavedState = new Map<string, string>()

watch(
  [
    itemVisibility,
    playerVisibility,
    logPath,
    processedFiles,
    syncStartDate,
    syncEndDate,
    viewMode,
    isRaidFilterActive,
    bisConfig,
    playerMapping,
    playerRoles,
    showOnlyRole,
    hideUnselectedItems,
    hideUnselectedPlayers,
    systemFilterSettings,
    isOnlyRaidMembersActive,
    recordWeekCorrections,
    recordPlayerCorrections,
    summarySortMode,
    slotSortMode,
    weekSortMode,
    bisSortMode,
    blacklistedKeys,
    hideEmptyPlayers,
    playerSummaryFilterMode,
    slotSummaryFilterMode,
  ],
  () => {
    const rawConfigs = [
      { key: 'itemVisibility', value: itemVisibility.value },
      { key: 'playerVisibility', value: playerVisibility.value },
      { key: 'weekCorrections', value: recordWeekCorrections.value },
      { key: 'playerCorrections', value: recordPlayerCorrections.value },
      { key: 'logPath', value: logPath.value },
      { key: 'processedFiles', value: processedFiles.value },
      { key: 'syncStartDate', value: syncStartDate.value },
      { key: 'syncEndDate', value: syncEndDate.value },
      { key: 'viewMode', value: viewMode.value },
      { key: 'isRaidFilterActive', value: isRaidFilterActive.value },
      { key: 'bisConfig', value: bisConfig.value },
      { key: 'hideUnselectedItems', value: hideUnselectedItems.value },
      { key: 'hideUnselectedPlayers', value: hideUnselectedPlayers.value },
      { key: 'playerMapping', value: playerMapping.value },
      { key: 'playerRoles', value: playerRoles.value },
      { key: 'showOnlyRole', value: showOnlyRole.value },
      { key: 'isOnlyRaidMembersActive', value: isOnlyRaidMembersActive.value },
      { key: 'systemFilterSettings', value: systemFilterSettings.value },
      { key: 'summarySortMode', value: summarySortMode.value },
      { key: 'slotSortMode', value: slotSortMode.value },
      { key: 'weekSortMode', value: weekSortMode.value },
      { key: 'bisSortMode', value: bisSortMode.value },
      { key: 'playerSummaryFilterMode', value: playerSummaryFilterMode.value },
      { key: 'slotSummaryFilterMode', value: slotSummaryFilterMode.value },
      { key: 'hideEmptyPlayers', value: hideEmptyPlayers.value },
      { key: 'blacklistedKeys', value: Array.from(blacklistedKeys.value) },
    ]

    const pendingUpdates: { key: string, value: any }[] = []

    for (const { key, value } of rawConfigs) {
      const serialized
        = typeof value === 'object' ? JSON.stringify(value) : String(value)
      if (lastSavedState.get(key) !== serialized) {
        pendingUpdates.push({
          key,
          value: typeof value === 'object' ? JSON.parse(serialized) : value,
        })
        lastSavedState.set(key, serialized)
      }
    }

    if (pendingUpdates.length > 0) {
      saveConfigDebounced(pendingUpdates)
    }
  },
  { deep: true },
)

watch([syncStartDate, syncEndDate], () => {
  if (!isInitializing.value) {
    isSyncNeeded.value = true
    syncLogFiles()
  }
})

const isMenuVisible = ref(false)

const playerTotalItemsMap = computed(() => {
  const counts: Record<string, number> = {}
  lootRecords.value.forEach((r) => {
    const p = getActualPlayer(getRecordPlayer(r))
    counts[p] = (counts[p] || 0) + 1
  })
  return counts
})

const allPlayers = computed(() => {
  if (isInitializing.value)
    return []
  const players = new Set<string>()
  lootRecords.value.forEach((record) => {
    players.add(getActualPlayer(getRecordPlayer(record)))
    record.rolls.forEach(roll => players.add(getActualPlayer(roll.player)))
  })
  // 即使没有掉落记录，也将已设置职位的玩家加入列表
  Object.values(playerRoles.value).forEach((p) => {
    if (p)
      players.add(getActualPlayer(p))
  })
  return Array.from(players).sort((a, b) =>
    comparePlayersByRole(a, b, playerTotalItemsMap.value),
  )
})

const filteredRecords = computed(() => {
  if (isInitializing.value)
    return []
  const startTs = new Date(syncStartDate.value).getTime()
  const endTs = syncEndDate.value ? new Date(syncEndDate.value).getTime() : Infinity

  // 预先缓存过滤条件以减少闭包内的重复计算
  const itemVis = itemVisibility.value
  const playerVis = playerVisibility.value

  const result = lootRecords.value.filter((record) => {
    if (isSystemFiltered(record.item))
      return false

    const player = getActualPlayer(getRecordPlayer(record))
    if (playerVis[player] === false)
      return false

    if (itemVis[record.item] === false)
      return false

    const ts = record.timestamp.getTime()
    if (ts < startTs || ts > endTs)
      return false

    return true
  })
  return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
})

const playerSummary = computed(() => {
  if (isInitializing.value)
    return {}
  const summary: Record<string, Record<string, number>> = {}
  filteredRecords.value.forEach((record) => {
    const p = getActualPlayer(getRecordPlayer(record))
    const i = record.item
    if (!summary[p])
      summary[p] = {}
    if (!summary[p][i])
      summary[p][i] = 0
    summary[p][i]++
  })
  return summary
})

const uniqueItems = computed(() => {
  if (isInitializing.value)
    return []
  const items = new Set(
    lootRecords.value
      .filter(r => !isSystemFiltered(r.item))
      .map(r => r.item),
  )
  return Array.from(items).sort((a, b) => {
    const pa = getItemSortPriority(a)
    const pb = getItemSortPriority(b)
    if (pa !== pb)
      return pa - pb
    return a.localeCompare(b)
  })
})

const rawSuspiciousKeys = computed(() => {
  const keys = new Set<string>()
  const rawSummary: Record<string, LootRecord[]> = {}
  filteredRecords.value.forEach((r) => {
    const { label: weekLabel } = getRaidWeekLabel(r.timestamp)
    if (!rawSummary[weekLabel])
      rawSummary[weekLabel] = []
    rawSummary[weekLabel].push(r)
  })

  for (const week in rawSummary) {
    const allRecords = rawSummary[week]!
    const itemsMap: Record<string, LootRecord[]> = {}
    allRecords.forEach((r) => {
      if (!itemsMap[r.item])
        itemsMap[r.item] = []
      itemsMap[r.item]!.push(r)
    })

    const anchorTimestamps: number[] = []
    for (const itemName in itemsMap) {
      const itemRecords = itemsMap[itemName]!
      if (itemRecords.length > 1) {
        itemRecords.sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        )
        for (let i = 0; i < itemRecords.length - 1; i++) {
          const recA = itemRecords[i]!
          const recB = itemRecords[i + 1]!
          if (
            recB.timestamp.getTime() - recA.timestamp.getTime()
            > 5 * 60 * 1000
          ) {
            anchorTimestamps.push(recA.timestamp.getTime())
          }
        }
      }
    }

    allRecords.forEach((r) => {
      // 限定条件1: 道具名称符合 RAID_REGEX
      if (!RAID_REGEX.test(r.item))
        return

      // 限定条件2: 获得时间在周二 16:00~19:00 之间
      const date = r.timestamp
      const dayOfWeek = date.getDay() // 0=周日, 1=周一, 2=周二...
      const hour = date.getHours()

      if (dayOfWeek !== 2)
        return // 不是周二
      if (hour < 16 || hour >= 19)
        return // 不在 16:00~19:00 之间

      const ts = r.timestamp.getTime()
      if (anchorTimestamps.some(ats => Math.abs(ts - ats) <= 5 * 60 * 1000)) {
        keys.add(r.key)
      }
    })
  }
  return keys
})

const isRaidRolesComplete = computed(() => {
  return ROLE_DEFINITIONS.every(role => !!playerRoles.value[role])
})

const playersWithRecordsMatchingItemFilters = computed(() => {
  const set = new Set<string>()
  const startTs = new Date(syncStartDate.value).getTime()
  const endTs = syncEndDate.value
    ? new Date(syncEndDate.value).getTime()
    : Infinity

  lootRecords.value.forEach((r) => {
    // 1. 系统过滤（如屏蔽屏蔽乐谱等）
    if (isSystemFiltered(r.item))
      return
    // 2. 物品筛选（用户在界面上选中的物品）
    if (itemVisibility.value[r.item] === false)
      return
    // 3. 时间范围
    const ts = r.timestamp.getTime()
    if (ts < startTs || ts > endTs)
      return
    set.add(getActualPlayer(getRecordPlayer(r)))
  })
  return set
})

const visibleAllPlayers = computed(() => {
  let players = allPlayers.value

  if (isOnlyRaidMembersActive.value) {
    // 如果开启了“只看固定队”，则强制过滤非固定队成员，且不受 hideUnselectedPlayers 影响
    players = players.filter(p => !!getPlayerRole(p))
  }
  else {
    if (hideUnselectedPlayers.value) {
      players = players.filter(p => isPlayerChecked(p))
    }
  }

  if (hideEmptyPlayers.value && !isOnlyRaidMembersActive.value) {
    players = players.filter((p) => {
      // 检查该玩家在当前物品/时间/系统过滤条件下是否有记录
      return playersWithRecordsMatchingItemFilters.value.has(p)
    })
  }
  return players
})

onMounted(async () => {
  isInitializing.value = true
  try {
    // 1. 同时发起多个本地数据库请求，缩短等待时间
    const [records, configs, handleEntry] = await Promise.all([
      dbRecords.getAll(),
      dbConfig.getAll(),
      dbHandle.get('current-log-dir'),
    ])

    // 2. 先在非响应式变量里处理数据清理
    let hasMigration = false
    const cleanRecords = records.map((r) => {
      const cleanItem = sanitizeItemName(r.item)
      const cleanPlayer = sanitizePlayerName(r.player)
      const cleanRolls = r.rolls.map((roll: RollInfo) => ({
        ...roll,
        player: sanitizePlayerName(roll.player),
      }))
      const isDirty
        = cleanItem !== r.item
          || cleanPlayer !== r.player
          || JSON.stringify(cleanRolls) !== JSON.stringify(r.rolls)
      if (isDirty)
        hasMigration = true
      return {
        ...r,
        item: cleanItem,
        player: cleanPlayer,
        rolls: cleanRolls,
        timestamp: new Date(r.timestamp),
      }
    })

    if (hasMigration) {
      await dbRecords.bulkSet(JSON.parse(JSON.stringify(cleanRecords)))
    }

    // 3. 处理配置项到本地变量，暂不更新 ref
    configs.forEach((c) => {
      if (c.key === 'itemVisibility')
        itemVisibility.value = c.value
      if (c.key === 'playerVisibility')
        playerVisibility.value = c.value
      if (c.key === 'logPath')
        logPath.value = c.value
      if (c.key === 'processedFiles')
        processedFiles.value = c.value || {}
      if (c.key === 'weekCorrections')
        recordWeekCorrections.value = c.value || {}
      if (c.key === 'playerCorrections')
        recordPlayerCorrections.value = c.value || {}
      if (c.key === 'syncStartDate' && c.value)
        syncStartDate.value = c.value
      if (c.key === 'syncEndDate')
        syncEndDate.value = c.value || null
      if (
        c.key === 'viewMode'
        && ['list', 'summary', 'slot', 'week', 'chart', 'bis'].includes(c.value)
      ) {
        viewMode.value = c.value
      }
      if (c.key === 'hideUnselectedItems')
        hideUnselectedItems.value = !!c.value
      if (c.key === 'hideUnselectedPlayers')
        hideUnselectedPlayers.value = !!c.value
      if (c.key === 'playerMapping')
        playerMapping.value = c.value || {}
      if (c.key === 'playerRoles')
        playerRoles.value = c.value || {}
      if (c.key === 'showOnlyRole')
        showOnlyRole.value = !!c.value
      if (c.key === 'systemFilterSettings' && c.value) {
        systemFilterSettings.value = { ...systemFilterSettings.value, ...c.value }
      }
      if (c.key === 'isRaidFilterActive')
        isRaidFilterActive.value = !!c.value
      if (c.key === 'isOnlyRaidMembersActive')
        isOnlyRaidMembersActive.value = !!c.value
      if (c.key === 'summarySortMode')
        summarySortMode.value = c.value || 'part'
      if (c.key === 'slotSortMode')
        slotSortMode.value = c.value || 'part'
      if (c.key === 'weekSortMode')
        weekSortMode.value = c.value || 'drop'
      if (c.key === 'bisSortMode')
        bisSortMode.value = c.value || 'part'
      if (c.key === 'blacklistedKeys')
        blacklistedKeys.value = new Set(c.value || [])
      if (c.key === 'bisConfig')
        bisConfig.value = c.value || { playerBis: {} }
      if (c.key === 'playerSummaryFilterMode')
        playerSummaryFilterMode.value = c.value || 'obtained'
      if (c.key === 'slotSummaryFilterMode')
        slotSummaryFilterMode.value = c.value || 'obtained'
    })

    // 4. 处理 Handle 和 权限，记录权限缓存
    if (handleEntry && handleEntry.handle) {
      currentHandle.value = handleEntry.handle
      fullLogPath.value = handleEntry.handle.name
      const status = await (
        handleEntry.handle as unknown as {
          queryPermission: (o: { mode: string }) => Promise<string>
        }
      ).queryPermission({ mode: 'read' })
      if (status === 'granted') {
        sessionPermissionGranted = true
      }
      else {
        logPath.value = '未授权，请点击同步按钮'
      }
    }

    // 5. 最后一次性赋值数据，触发单一重绘流程
    lootRecords.value = cleanRecords
    existingKeys.value = new Set(cleanRecords.map(r => r.key))

    if (!isRaidRolesComplete.value && viewMode.value !== 'list') {
      viewMode.value = 'list'
    }

    window.addEventListener('paste', handleGlobalPaste)
    document.body.addEventListener('dragover', handleGlobalDragOver)
    document.body.addEventListener('dragleave', handleGlobalDragLeave)
    document.body.addEventListener('drop', handleGlobalDrop)
    window.addEventListener('click', closeContextMenu)
    window.addEventListener('keydown', handleGlobalKeydown)
    window.addEventListener('click', handleWindowClick)

    window.addEventListener('visibilitychange', handleVisibilityChange)

    // 初始加载完成后，如果不是第一次同步，自动进行同步
    if (lootRecords.value.length > 0) {
      setTimeout(() => {
        syncLogFiles()
      }, 300)
    }
    // 7. 完成初始化，稍微延迟以确保数据稳定后再开启渲染
    await nextTick()
    setTimeout(() => {
      isInitializing.value = false
    }, 50)
  }
  catch (err) {
    console.error('Initialize error:', err)
    isInitializing.value = false
  }
})

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && lootRecords.value.length > 0) {
    syncLogFiles()
  }
}

const isDragOverWindow = ref(false)
const isDragOverZone = ref(false)
let dragLeaveTimer: any = null

const isSharedTooltipVisible = ref(false)
const sharedTooltipRef = ref()
const weekTooltipContent = ref('')

function handleWeekItemEnter(e: MouseEvent, rec: LootRecord) {
  if (rawSuspiciousKeys.value.has(rec.key) && recordWeekCorrections.value[rec.key] === undefined) {
    sharedTooltipRef.value = e.currentTarget
    weekTooltipContent.value = '可能归属周错误（通常发生在周二压线进本）。点击可选择将其归入上一周。'
    isSharedTooltipVisible.value = true
  }
}

function handleWeekItemLeave() {
  isSharedTooltipVisible.value = false
}

function handleWindowClick(e: MouseEvent) {
  if (popoverTargetRecord.value) {
    const popper = document.querySelector('.winner-change-popper')
    const isInsidePopper = popper?.contains(e.target as Node)
    const isTrigger = (e.target as HTMLElement).closest('.winner-selector-trigger')
    if (!isInsidePopper && !isTrigger) {
      popoverTargetRecord.value = null
    }
  }
}

function handleGlobalDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()

  // 仅在拖拽的是文件时触发（避免拖拽文字时触发）
  // 注意：出于安全限制，浏览器在 Drop 之前无法获取具体文件名，因此无法精确判断是否为 .json
  if (!e.dataTransfer?.types.includes('Files'))
    return

  isDragOverWindow.value = true
  if (dragLeaveTimer) {
    clearTimeout(dragLeaveTimer)
    dragLeaveTimer = null
  }
}

function handleGlobalDragLeave(e: DragEvent) {
  e.preventDefault()
  if (dragLeaveTimer)
    clearTimeout(dragLeaveTimer)
  dragLeaveTimer = setTimeout(() => {
    isDragOverWindow.value = false
    isDragOverZone.value = false
  }, 100)
}

function handleGlobalDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragOverWindow.value = false
  isDragOverZone.value = false
  if (dragLeaveTimer) {
    clearTimeout(dragLeaveTimer)
    dragLeaveTimer = null
  }

  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.json')) {
      processImportFile(file)
    }
  }
}

function handleZoneDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragOverWindow.value = false
  isDragOverZone.value = false
  if (dragLeaveTimer) {
    clearTimeout(dragLeaveTimer)
    dragLeaveTimer = null
  }

  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.json')) {
      processImportFile(file)
    }
  }
}

async function handleGlobalPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text')
  if (!text)
    return

  try {
    if (!text.trim().startsWith('{'))
      return
    const json = JSON.parse(text)
    if (json.r && Array.isArray(json.r)) {
      e.preventDefault()
      await processImportJSON(json)
    }
  }
  catch {
    // ignore
  }
}

onUnmounted(() => {
  window.removeEventListener('paste', handleGlobalPaste)
  document.body.removeEventListener('dragover', handleGlobalDragOver)
  document.body.removeEventListener('dragleave', handleGlobalDragLeave)
  document.body.removeEventListener('drop', handleGlobalDrop)
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('click', handleWindowClick)
})

function closeContextMenu() {
  isMenuVisible.value = false
}

const playerNetwork = computed(() => {
  if (isInitializing.value || !isMergePanelActive.value || lootRecords.value.length === 0)
    return new Map<string, Set<string>>()
  const networks = new Map<string, Set<string>>()
  lootRecords.value.forEach((record) => {
    const party = new Set([record.player, ...record.rolls.map(r => r.player)])
    party.forEach((p) => {
      if (!networks.has(p))
        networks.set(p, new Set())
      const myFriends = networks.get(p)!
      party.forEach((mate) => {
        if (mate !== p)
          myFriends.add(mate)
      })
    })
  })
  return networks
})

const mergeSuggestions = computed(() => {
  if (isInitializing.value || !isMergePanelActive.value || playerNetwork.value.size === 0)
    return []
  const suggestions: { from: string, to: string, confidence: number }[] = []
  const ps = Array.from(playerNetwork.value.keys())

  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const p1 = ps[i] as string
      const p2 = ps[j] as string

      if (getActualPlayer(p1) === getActualPlayer(p2))
        continue

      const net1 = playerNetwork.value.get(p1)!
      const net2 = playerNetwork.value.get(p2)!
      if (net1.size < 3 || net2.size < 3)
        continue

      const intersection = new Set([...net1].filter(x => net2.has(x)))
      const union = new Set([...net1, ...net2])
      const jaccard = intersection.size / union.size

      if (jaccard > 0.9) {
        suggestions.push({
          from: p1,
          to: p2,
          confidence: Math.round(jaccard * 100),
        })
      }
    }
  }
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
})

const availableSeries = computed(() => {
  const seriesSet = new Set<string>()
  lootRecords.value.forEach((r) => {
    if (RAID_REGEX.test(r.item))
      return
    const match = r.item.match(EQUIP_SERIES_REGEX)
    if (match?.groups?.series) {
      seriesSet.add(match.groups.series)
    }
  })
  return Array.from(seriesSet).sort()
})
const assignedPlayers = computed(() => {
  return new Set(Object.values(playerRoles.value))
})

const isBisConfigComplete = computed(() => {
  if (!isRaidRolesComplete.value)
    return false
  // 仅对正式职位的成员（MT/ST/H1/H2/D1/D2/D3/D4）检查 BIS 完整性
  // 只要有一个职位的 BIS 没填完，就算不完整
  return ROLE_DEFINITIONS.every(role =>
    isPlayerComplete(bisConfig.value, role),
  )
})

function handleGlobalKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  const isInput
    = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable

  if (e.key === 'Escape') {
    if (popoverTargetRecord.value) {
      popoverTargetRecord.value = null
      return
    }
    if (isMenuVisible.value) {
      isMenuVisible.value = false
      return
    }
    if (showManualAddDialog.value) {
      showManualAddDialog.value = false
      return
    }
    if (showExportDialog.value) {
      showExportDialog.value = false
      return
    }
    if (showImportConfirmDialog.value) {
      showImportConfirmDialog.value = false
      return
    }
    if (showClearDialog.value) {
      showClearDialog.value = false
      return
    }
    if (showTimeSetup.value) {
      showTimeSetup.value = false
      return
    }
  }

  if (!isInput && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
    if (e.key === '1') {
      viewMode.value = 'list'
    }
    else if (isRaidRolesComplete.value) {
      if (e.key === '2')
        viewMode.value = 'summary'
      if (e.key === '3')
        viewMode.value = 'slot'
      if (e.key === '4')
        viewMode.value = 'week'
      if (e.key === '5')
        viewMode.value = 'chart'
      if (e.key === '6')
        viewMode.value = 'bis'
    }
  }
}

const selectablePlayersForMerge = computed(() => {
  const players = new Set<string>()
  lootRecords.value.forEach((record) => {
    players.add(getActualPlayer(record.player))
  })

  const originalPlayers = new Set<string>()
  lootRecords.value.forEach((r) => {
    originalPlayers.add(r.player)
    r.rolls.forEach(roll => originalPlayers.add(roll.player))
  })

  const mappedAliases = new Set(Object.keys(playerMapping.value))

  return Array.from(originalPlayers)
    .filter((p) => {
      if (mappedAliases.has(p))
        return false
      const actual = getActualPlayer(p)
      return isPlayerChecked(actual)
    })
    .sort((a, b) => comparePlayersByRole(a, b, playerTotalItemsMap.value))
})

const sortedSummaryPlayers = computed(() => {
  let players = visibleAllPlayers.value
  const filterMode = playerSummaryFilterMode.value

  if (filterMode === 'needed') {
    players = players.filter((p) => {
      const role = getPlayerRole(p)
      return role && !role.startsWith('LEFT:') && !role.startsWith('SUB:')
    })
  }
  const summary = playerSummary.value
  const counts: Record<string, number> = {}
  players.forEach((p) => {
    counts[p] = Object.values(summary[p] || {}).reduce(
      (sum, val) => sum + val,
      0,
    )
  })
  return [...players].sort((a, b) => comparePlayersByRole(a, b, counts))
})

const playersForSelection = computed(() => {
  return hideEmptyPlayers.value
    ? allPlayers.value.filter(p =>
        playersWithRecordsMatchingItemFilters.value.has(p),
      )
    : allPlayers.value
})

const visibleUniqueItems = computed(() => {
  if (!hideUnselectedItems.value)
    return uniqueItems.value
  return uniqueItems.value.filter(isItemChecked)
})

watch(
  [isRaidFilterActive, uniqueItems],
  ([active]) => {
    if (active) {
      selectRaidLoot()
      hideUnselectedItems.value = true
    }
    else {
      hideUnselectedItems.value = false
    }
  },
  { immediate: true },
)

watch(isRaidRolesComplete, (newVal) => {
  if (!newVal && isOnlyRaidMembersActive.value) {
    isOnlyRaidMembersActive.value = false
  }
  if (!newVal) {
    viewMode.value = 'list'
  }
})

const SLOT_DEFINITIONS = PART_ORDER

function getItemSortPriority(
  item: string,
  mode: 'part' | 'drop' = 'part',
): number {
  const order = mode === 'part' ? PART_ORDER : DROP_ORDER
  const index = order.findIndex(
    def => item.includes(def) || def.includes(item),
  )
  if (index !== -1)
    return index
  if (RAID_REGEX.test(item))
    return 50
  return 100
}

const visibleItemCount = computed(() => visibleUniqueItems.value.length)

const visiblePlayerCount = computed(() => visibleAllPlayers.value.length)

const normalizedRecords = computed(() => {
  return filteredRecords.value.map(r => ({
    ...r,
    player: getRecordPlayer(r),
  }))
})

function getItemSlot(itemName: string): string {
  const def = SLOT_DEFINITIONS.find(d => itemName.includes(d))
  return def || '其他'
}

const slotSummary = computed(() => {
  if (isInitializing.value)
    return {}
  const summary: Record<string, Record<string, number>> = {}
  SLOT_DEFINITIONS.forEach((s) => {
    summary[s] = {}
  })

  filteredRecords.value.forEach((record) => {
    let slot = getItemSlot(record.item)

    if (slot === '其他') {
      slot = record.item
    }

    if (!summary[slot])
      summary[slot] = {}
    const currentSlot = summary[slot]!

    const p = getActualPlayer(getRecordPlayer(record))

    if (!currentSlot[p])
      currentSlot[p] = 0
    currentSlot[p]++
  })
  return summary
})

const displaySlots = computed(() => {
  const filterMode = slotSummaryFilterMode.value
  const predefinedList = slotSortMode.value === 'part' ? PART_ORDER : DROP_ORDER

  const predefined = predefinedList.filter((s) => {
    if (filterMode === 'all')
      return true

    const hasObtained
      = slotSummary.value[s] && Object.keys(slotSummary.value[s]).length > 0
    if (hasObtained)
      return true

    if (filterMode === 'needed') {
      const row = DEFAULT_ROWS.find(r => r.name === s || r.keywords === s)
      if (!row)
        return false

      const coreRoles = Object.keys(playerRoles.value).filter(
        r => !r.startsWith('LEFT:') && !r.startsWith('SUB:'),
      )
      return coreRoles.some((role) => {
        const pName = playerRoles.value[role]
        if (!pName)
          return false
        const summary = playerSummary.value[pName] || {}

        const count = countObtainedItems(row, summary)
        const targetReq = calculateTargetRequirement(row, pName)
        return count < targetReq
      })
    }
    return false
  })

  const dynamicItems = Object.keys(slotSummary.value).filter(
    k =>
      !(PART_ORDER as unknown as string[]).includes(k)
      && !(DROP_ORDER as unknown as string[]).includes(k),
  )

  const dynamic = dynamicItems
    .filter((k) => {
      const hasObtained = Object.keys(slotSummary.value[k] || {}).length > 0
      return hasObtained
    })
    .sort((a, b) => {
      const getCount = (key: string) =>
        Object.values(slotSummary.value[key] || {}).reduce(
          (sum, c) => sum + c,
          0,
        )
      const ca = getCount(a)
      const cb = getCount(b)
      if (ca !== cb)
        return cb - ca
      return a.localeCompare(b)
    })

  return [...predefined, ...dynamic]
})

function getRecordRaidWeekLabel(record: LootRecord) {
  const offset = recordWeekCorrections.value[record.key] || 0
  return getRaidWeekLabel(
    record.timestamp,
    offset,
    GAME_VERSION_CONFIG.RAID_START_TIME,
  ).label
}

const zeroWeekStart = computed(() => {
  return getRaidWeekStart(new Date(GAME_VERSION_CONFIG.RAID_START_TIME))
})

function getRecordFormattedWeekLabel(weekRangeLabel: string) {
  const { label } = getFormattedWeekLabel(weekRangeLabel, zeroWeekStart.value)
  return label
}

function toggleWeekCorrection(record: LootRecord) {
  const current = recordWeekCorrections.value[record.key] || 0
  const newMap = { ...recordWeekCorrections.value }

  if (current < 0) {
    delete newMap[record.key]
  }
  else {
    newMap[record.key] = -1
  }
  recordWeekCorrections.value = newMap
}

const weekSummary = computed(() => {
  const summary: Record<string, Record<string, LootRecord[]>> = {}
  filteredRecords.value.forEach((r) => {
    const week = getRecordRaidWeekLabel(r)
    if (!summary[week])
      summary[week] = {}
    const p = getActualPlayer(getRecordPlayer(r))
    if (!summary[week][p])
      summary[week][p] = []
    summary[week][p].push(r)
  })

  for (const week in summary) {
    for (const player in summary[week]) {
      const records = summary[week][player]
      if (records) {
        records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      }
    }
  }
  return summary
})

const sortedWeeks = computed(() => {
  return Object.keys(weekSummary.value).sort().reverse()
})

function getSortedRecordsInWeek(weekName: string): LootRecord[] {
  const playersMap = weekSummary.value[weekName]
  if (!playersMap)
    return []
  const all: LootRecord[] = []
  Object.values(playersMap).forEach((recs) => {
    all.push(...recs)
  })

  return all.sort((a, b) => {
    // 1. 按照部位优先级
    const pA = getItemSortPriority(a.item, weekSortMode.value)
    const pB = getItemSortPriority(b.item, weekSortMode.value)
    if (pA !== pB)
      return pA - pB

    // 2. 部位相同时，按照职能顺序 (MT-D4)
    const roleCompare = comparePlayersByRole(a.player, b.player)
    if (roleCompare !== 0)
      return roleCompare

    // 3. 职能相同时，按照时间顺序
    return a.timestamp.getTime() - b.timestamp.getTime()
  })
}

function getItemGroupId(itemName: string): number {
  const p = getItemSortPriority(itemName, weekSortMode.value)
  if (weekSortMode.value === 'drop') {
    if (p <= 3)
      return 1 // 首饰组 (0-3: 耳, 颈, 腕, 指环)
    if (p <= 8)
      return 2 // 小件组 (4-8: 头, 手, 脚, 神典石, 硬化药)
    if (p <= 12)
      return 3 // 大件组 (9-12: 身, 腿, 强化药, 强化纤维)
    return 4 // 武器与其它组 (13+)
  }
  else {
    // 部位排序下的分组逻辑 (可选，或者在部位排序下不显示分割线)
    if (p === 0)
      return 1 // 武器
    if (p <= 5)
      return 2 // 左侧防具
    if (p <= 9)
      return 3 // 首饰
    return 4 // 材料
  }
}

function shouldShowWeekDivider(records: LootRecord[], index: number): boolean {
  if (index >= records.length - 1)
    return false
  const current = records[index]
  const next = records[index + 1]
  if (!current || !next)
    return false

  const currentGroup = getItemGroupId(current.item)
  const nextGroup = getItemGroupId(next.item)
  return currentGroup !== nextGroup
}

const contextMenuRecord = ref<LootRecord | null>(null)

const contextMenuPosition = ref({ x: 0, y: 0 })

const contextMenuRef = {
  getBoundingClientRect: () =>
    ({
      width: 0,
      height: 0,
      top: contextMenuPosition.value.y,
      bottom: contextMenuPosition.value.y,
      left: contextMenuPosition.value.x,
      right: contextMenuPosition.value.x,
    }) as DOMRect,
}

function handleRecordTrigger(e: MouseEvent, record: LootRecord) {
  e.preventDefault()
  e.stopPropagation()
  contextMenuRecord.value = record
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  isMenuVisible.value = true
}

function handleCorrectionClick() {
  if (contextMenuRecord.value) {
    toggleWeekCorrection(contextMenuRecord.value)
  }
  isMenuVisible.value = false
}

function openWinnerPopover(e: MouseEvent, record: LootRecord) {
  if (popoverTargetRecord.value?.key === record.key) {
    popoverTargetRecord.value = null
    return
  }
  popoverTriggerRef.value = e.currentTarget
  popoverTargetRecord.value = record
  popoverOpenedWithCorrection.value[record.key] = !!recordPlayerCorrections.value[record.key]
}

watch(() => popoverTargetRecord.value, (newVal) => {
  if (!newVal) {
    popoverTriggerRef.value = null
  }
})

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRecords.value.slice(start, start + pageSize)
})

function resetFilters() {
  itemVisibility.value = {}
  playerVisibility.value = {}
  isRaidFilterActive.value = false
  syncStartDate.value = GAME_VERSION_CONFIG.RAID_START_TIME
  syncEndDate.value = null
}

async function setLogPath() {
  try {
    const showPicker = (
      window as unknown as {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
      }
    ).showDirectoryPicker
    if (!showPicker) {
      ElMessageBox.alert('你的浏览器不支持此功能', '错误', {
        confirmButtonText: '确定',
        type: 'error',
      })
      return
    }
    const handle = await showPicker()
    if (handle) {
      await dbRecords.clear()
      await dbConfig.set({ key: 'processedFiles', value: {} })
      processedFiles.value = {}
      recordWeekCorrections.value = {}
      lootRecords.value = []
      existingKeys.value.clear()
      itemVisibility.value = {}
      playerVisibility.value = {}

      await dbHandle.set({ key: 'current-log-dir', handle })
      currentHandle.value = handle
      logPath.value = handle.name
      fullLogPath.value = handle.name
      showTimeSetup.value = true
    }
  }
  catch (e: any) {
    if (e.name !== 'AbortError')
      console.error('Directory picker error:', e)
  }
}

async function deleteRecord(record: LootRecord, silent = false) {
  try {
    // 1. 从内存中删除
    const index = lootRecords.value.findIndex(r => r.key === record.key)
    if (index !== -1) {
      lootRecords.value.splice(index, 1)
    }

    // 2. 从数据库中删除
    await dbRecords.remove(record.key)

    // 3. 从现有 key 集合中删除
    existingKeys.value.delete(record.key)

    // 4. 加入黑名单（防止以后再解析回来）
    blacklistedKeys.value.add(record.key)

    if (!silent)
      ElMessage.success('记录已永久删除')
  }
  catch (err) {
    console.error('Delete error:', err)
    if (!silent)
      ElMessage.error('删除失败')
  }
}

async function startInitialSync() {
  showTimeSetup.value = false
  await syncLogFiles(true)
}

async function syncLogFiles(userInitiated = false) {
  if (isSyncing.value || !currentHandle.value)
    return
  isSyncNeeded.value = false

  interface FileSystemDirectoryHandleExtended {
    queryPermission: (options: {
      mode: string
    }) => Promise<'granted' | 'denied' | 'prompt'>
    requestPermission: (options: {
      mode: string
    }) => Promise<'granted' | 'denied' | 'prompt'>
    values: () => AsyncIterableIterator<FileSystemHandle>
  }

  const handle
    = currentHandle.value as unknown as FileSystemDirectoryHandleExtended

  if (!sessionPermissionGranted) {
    const status = await handle.queryPermission({ mode: 'read' })
    if (status !== 'granted') {
      if (!userInitiated) {
        isSyncNeeded.value = true
        return
      }
      const newStatus = await handle.requestPermission({ mode: 'read' })
      if (newStatus !== 'granted') {
        return
      }
    }
    sessionPermissionGranted = true
  }

  isSyncing.value = true
  const isFirstSync = existingKeys.value.size === 0
  if (isFirstSync) {
    isLoading.value = true
  }
  loadingProgress.value = 0

  try {
    const syncStartTs = new Date(syncStartDate.value).getTime()
    const syncEndTs = syncEndDate.value
      ? new Date(syncEndDate.value).getTime()
      : Infinity
    const filesToRead: {
      handle: FileSystemFileHandle
      name: string
      size: number
      startByte: number
    }[] = []

    const localKeys = new Set(existingKeys.value)
    const allNewRecords: LootRecord[] = []
    const batchSeenPlayers = new Set<string>()
    const batchSeenItems = new Set<string>()

    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.log')) {
        const name = entry.name

        const match = name.match(/_(\d{8})(?:\.|_)/)
        if (match && match[1]) {
          const fileDateStr = `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)} 00:00:00`
          const fileTs = new Date(fileDateStr).getTime()
          if (fileTs + 86400000 < syncStartTs || fileTs > syncEndTs) {
            continue
          }
        }

        const file = await (entry as FileSystemFileHandle).getFile()
        if (file.size < 10)
          continue

        // 如果文件名不含日期，则必须检查文件修改时间是否在范围内
        if (!match) {
          if (
            file.lastModified < syncStartTs
            || file.lastModified > syncEndTs
          ) {
            continue
          }
        }

        const prev = processedFiles.value[name]
        let startByte = 0

        if (prev) {
          if (file.size === prev.size && file.lastModified <= prev.mtime) {
            continue
          }
          if (file.size > prev.size) {
            startByte = prev.size
          }
        }

        filesToRead.push({
          handle: entry as FileSystemFileHandle,
          name,
          size: file.size,
          startByte,
        })
      }
    }

    if (filesToRead.length === 0) {
      isSyncing.value = false
      isLoading.value = false
      lastSyncTime.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      if (userInitiated) {
        syncSuccessVisible.value = true
        setTimeout(() => {
          syncSuccessVisible.value = false
        }, 800)
      }
      return
    }

    filesToRead.sort((a, b) => a.name.localeCompare(b.name))

    const CHUNK_SIZE = 10
    parsedLogFiles.value = []
    pendingLogFiles.value = filesToRead.map(f => ({
      name: f.name,
      size: f.size - f.startByte,
    }))

    let completedCount = 0

    for (let i = 0; i < filesToRead.length; i += CHUNK_SIZE) {
      const chunk = filesToRead.slice(i, i + CHUNK_SIZE)
      const chunkPromises = chunk.map(async (target) => {
        const file = await target.handle.getFile()
        const text = await file.slice(target.startByte).text()

        const {
          records,
          players: filePlayers,
          items: fileItems,
        } = await parseLogWithWorker(text)

        for (const r of records) {
          if (!localKeys.has(r.key) && !blacklistedKeys.value.has(r.key)) {
            localKeys.add(r.key)
            allNewRecords.push(r)
          }
        }

        filePlayers.forEach(p => batchSeenPlayers.add(p))
        fileItems.forEach(i => batchSeenItems.add(i))

        processedFiles.value[target.name] = {
          size: file.size,
          mtime: file.lastModified,
        }

        completedCount++
        loadingProgress.value = Math.round(
          (completedCount / filesToRead.length) * 100,
        )

        parsedLogFiles.value.push({
          name: target.name,
          size: target.size,
        })
        parsedLogFiles.value.sort((a, b) => a.name.localeCompare(b.name))

        pendingLogFiles.value = pendingLogFiles.value.filter(
          n => n.name !== target.name,
        )
      })

      await Promise.all(chunkPromises)
      await new Promise(r => setTimeout(r, 0))
    }

    if (allNewRecords.length > 0) {
      await dbRecords.bulkSet(JSON.parse(JSON.stringify(allNewRecords)))

      lootRecords.value = [...lootRecords.value, ...allNewRecords]
      existingKeys.value = localKeys

      handlePotentialDuplicates(allNewRecords, 'sync')

      let visUpdated = false
      const newIV = { ...itemVisibility.value }
      const newPV = { ...playerVisibility.value }

      batchSeenItems.forEach((i) => {
        if (newIV[i] === undefined) {
          newIV[i] = true
          visUpdated = true
        }
      })
      batchSeenPlayers.forEach((p) => {
        if (newPV[p] === undefined) {
          newPV[p] = true
          visUpdated = true
        }
      })

      if (visUpdated) {
        itemVisibility.value = newIV
        playerVisibility.value = newPV
      }

      if (!isFirstSync) {
        ElMessage.success({
          message: `同步完成，新增 ${allNewRecords.length} 条记录`,
          showClose: true,
        })
      }

      if (isFirstSync) {
        const uniqueSavageDrops = new Set(
          lootRecords.value
            .filter(r => RAID_REGEX.test(r.item))
            .map(r => r.item),
        )
        if (uniqueSavageDrops.size >= 12) {
          isRaidFilterActive.value = true
        }

        if (!isRaidRolesComplete.value) {
          ElMessage.warning({
            message:
              '解析成功，请先在「固定队 - 职位设置」中完成所有职位的设置，以开启更多功能。',
            duration: 10000,
            showClose: true,
          })
        }
      }
    }
    lastSyncTime.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (userInitiated) {
      syncSuccessVisible.value = true
      setTimeout(() => {
        syncSuccessVisible.value = false
      }, 800)
    }

    logPath.value = currentHandle.value.name
  }
  catch (err: any) {
    console.error('Sync error:', err.message)
  }
  finally {
    isSyncing.value = false
    isLoading.value = false
    loadingProgress.value = 0
  }
}

function parseLogWithWorker(text: string): Promise<{
  records: LootRecord[]
  players: string[]
  items: string[]
}> {
  return new Promise((resolve, reject) => {
    const worker = new LogParserWorker()

    worker.onmessage = (e) => {
      resolve(e.data)
      worker.terminate()
    }

    worker.onerror = (e) => {
      reject(e)
      worker.terminate()
    }

    worker.postMessage(text)
  })
}

function isSystemFiltered(item: string) {
  if (systemFilterSettings.value.cards && item.startsWith('九宫幻卡'))
    return true
  if (systemFilterSettings.value.materia && item.includes('魔晶石'))
    return true
  if (
    systemFilterSettings.value.music
    && (item.startsWith('管弦乐琴乐谱') || item.startsWith('陈旧的乐谱'))
  ) {
    return true
  }
  if (systemFilterSettings.value.book && item.endsWith('断章'))
    return true
  if (systemFilterSettings.value.totem && item.endsWith('图腾'))
    return true
  if (systemFilterSettings.value.other && item.includes('经验值'))
    return true

  if (!RAID_REGEX.test(item)) {
    const match = item.match(EQUIP_SERIES_REGEX)
    if (
      match?.groups?.series
      && systemFilterSettings.value.maskedSeries?.includes(match.groups.series)
    ) {
      return true
    }
  }
  return false
}

function isItemChecked(item: string) {
  return isRaidFilterActive.value
    ? RAID_REGEX.test(item)
    : itemVisibility.value[item] !== false
}

function isPlayerChecked(p: string) {
  if (isOnlyRaidMembersActive.value) {
    return !!getPlayerRole(p)
  }
  return playerVisibility.value[p] !== false
}

function handleItemClick(e: MouseEvent, item: string) {
  if (e.ctrlKey) {
    copyToClipboard(item)
    return
  }
  if (e.altKey) {
    toggleSoloMode('item', item)
    return
  }
  if (isRaidFilterActive.value) {
    return
  }
  toggleItemVisibility(item)
}

function toggleItemVisibility(item: string) {
  const currentVisible = itemVisibility.value[item] !== false
  itemVisibility.value[item] = !currentVisible
}

function calculateTargetRequirement(row: any, player: string) {
  const roleKey = getPlayerRole(player)
  if (!roleKey)
    return 0
  const bis = (bisConfig.value.playerBis || {})[roleKey] || {}

  if (row.type === 'count' && bis[row.id] === 0) {
    return 0
  }

  const isBis = isBisItem(row, bis)

  if (isBis) {
    return row.type === 'count' ? (bis[row.id] as number) || 0 : 1
  }

  const isStandardBox = row.type === 'toggle' && row.id !== 'weapon'
  const isUpgradeMaterial
    = row.id === 'twine'
      || row.id === 'coating'
      || row.id === 'solvent'
      || row.id === 'tome'

  if (isStandardBox || isUpgradeMaterial) {
    return 1
  }

  return 0
}

function addSpecialRole(p: string, type: 'SUB' | 'LEFT') {
  if (!p)
    return
  const exists = Object.entries(playerRoles.value).some(
    ([role, name]) => role.startsWith(`${type}:`) && name === p,
  )
  if (exists)
    return

  let index = 1
  let roleKey = `${type}:${index}`
  while (playerRoles.value[roleKey]) {
    index++
    roleKey = `${type}:${index}`
  }
  playerRoles.value[roleKey] = p
}

function comparePlayersByRole(
  a: string,
  b: string,
  customCounts?: Record<string, number>,
) {
  const roleA = getPlayerRole(a)
  const roleB = getPlayerRole(b)

  const getRolePriority = (r: string | null | undefined) => {
    if (!r)
      return 999
    if (ROLE_DEFINITIONS.includes(r as any))
      return ROLE_DEFINITIONS.indexOf(r as any)
    if (r.startsWith('SUB:'))
      return 100
    if (r.startsWith('LEFT:'))
      return 200
    return 500
  }

  const pA = getRolePriority(roleA)
  const pB = getRolePriority(roleB)

  if (pA !== pB)
    return pA - pB

  // 职能相同时，按照获取到的装备数量降序排列
  const counts = customCounts || playerTotalItemsMap.value
  const cA = counts[a] || 0
  const cB = counts[b] || 0
  if (cA !== cB)
    return cB - cA

  return a.localeCompare(b)
}

function getSortedPlayersInSlot(
  summary: Record<string, number>,
  slotName: string,
) {
  const filterMode = slotSummaryFilterMode.value
  const row = DEFAULT_ROWS.find(
    r => r.name === slotName || r.keywords === slotName,
  )
  if (!row) {
    return Object.keys(summary || {}).sort((a, b) =>
      comparePlayersByRole(a, b, summary || {}),
    )
  }

  const activeMembersNames = Object.entries(playerRoles.value)
    .filter(([role, name]) => name && !role.startsWith('LEFT:'))
    .map(([_, name]) => name)

  const allPlayersInSlot = Array.from(
    new Set([...Object.keys(summary || {}), ...activeMembersNames]),
  )
  const result: string[] = []

  allPlayersInSlot.forEach((p) => {
    const role = getPlayerRole(p)
    const isLeftOrSub = role?.startsWith('LEFT:') || role?.startsWith('SUB:')
    if (filterMode === 'needed' && isLeftOrSub)
      return

    const count = summary?.[p] || 0
    const targetReq = calculateTargetRequirement(row, p)

    if (filterMode === 'all') {
      if (count > 0 || activeMembersNames.includes(p))
        result.push(p)
    }
    else if (filterMode === 'obtained') {
      if (count > 0)
        result.push(p)
    }
    else if (filterMode === 'needed') {
      if (!isLeftOrSub && count < targetReq)
        result.push(p)
    }
  })

  return result.sort((a, b) => comparePlayersByRole(a, b, summary || {}))
}

function getSlotItemTagInfo(player: string, slotName: string, count: number) {
  const row = DEFAULT_ROWS.find(
    r => r.name === slotName || r.keywords === slotName,
  )
  if (!row) {
    const isRandomWeapon
      = slotName.startsWith(GAME_VERSION_CONFIG.RAID_SERIES_KEYWORD)
        && RAID_REGEX.test(slotName)

    return {
      count,
      isRandomWeapon,
      layerName: isRandomWeapon ? '4层' : undefined,
    }
  }

  const roleKey = getPlayerRole(player)
  const isRegularRole = roleKey && ROLE_DEFINITIONS.includes(roleKey as any)
  if (!isRegularRole) {
    return {
      count,
      layerName: LAYER_CONFIG.find(l => l.items.includes(row.id))?.name,
    }
  }

  const bis = (bisConfig.value.playerBis || {})[roleKey] || {}
  const hasConfig = bis[row.id] !== undefined
  const targetReq = calculateTargetRequirement(row, player)

  const isBisValue = isBisItem(row, bis)

  const layer = LAYER_CONFIG.find(l => l.items.includes(row.id))

  return {
    count,
    isBis: hasConfig ? isBisValue : undefined,
    isBisFalse: !isBisValue && targetReq > 0,
    layerName: layer?.name,
  }
}

function getFilteredItemsInPlayerSummary(player: string) {
  const obtainedItemsMap = playerSummary.value[player] || {}
  const categoryCounts: Record<string, number> = {}
  const consumedItemNames = new Set<string>()

  // 1. 归类已获得物品
  DEFAULT_ROWS.forEach((row) => {
    categoryCounts[row.id] = 0
    Object.entries(obtainedItemsMap).forEach(([itemName, count]) => {
      const c = (count as number) || 0
      if (itemName.includes(row.keywords)) {
        categoryCounts[row.id] = (categoryCounts[row.id] || 0) + c
        consumedItemNames.add(itemName)
      }
    })
  })

  const results: {
    name: string
    count: number
    isBis?: boolean
    id?: string
    isRandomWeapon?: boolean
    layerName?: string
  }[] = []

  const roleKey = getPlayerRole(player)
  const hasRole = !!(roleKey && ROLE_DEFINITIONS.includes(roleKey as any))
  const playerBis = (bisConfig.value?.playerBis || {})[roleKey || ''] || {}

  DEFAULT_ROWS.forEach((row) => {
    const count = categoryCounts[row.id]
    const targetReq = calculateTargetRequirement(row, player)

    let shouldShow = false
    const cVal = count || 0

    if (playerSummaryFilterMode.value === 'all') {
      shouldShow = true
    }
    else if (cVal > 0) {
      shouldShow = true
    }
    else if (playerSummaryFilterMode.value === 'needed') {
      if (cVal < targetReq)
        shouldShow = true
    }

    if (shouldShow) {
      const layer = LAYER_CONFIG.find(l => l.items.includes(row.id))
      results.push({
        name: row.keywords || row.name,
        count: cVal,
        isBis:
          hasRole && playerBis[row.id] !== undefined
            ? targetReq > 0
            : undefined,
        id: row.id,
        layerName: layer ? layer.name : undefined,
      })
    }
  })

  const isComplete = isPlayerComplete(
    bisConfig.value,
    getPlayerRole(player) || player,
  )

  // 3. 处理杂项（识别随武）
  Object.entries(obtainedItemsMap).forEach(([itemName, count]) => {
    if (!consumedItemNames.has(itemName)) {
      const isRandomWeapon
        = itemName.startsWith(GAME_VERSION_CONFIG.RAID_SERIES_KEYWORD)
          && RAID_REGEX.test(itemName)
      results.push({
        name: itemName,
        count,
        isRandomWeapon,
        isBis: isRandomWeapon
          ? undefined
          : hasRole && isComplete
            ? false
            : undefined,
        layerName: isRandomWeapon ? '4层' : undefined,
      })
    }
  })

  const mode = summarySortMode.value
  results.sort((a, b) => {
    const ia = getItemSortPriority(
      a.id
        ? DEFAULT_ROWS.find(r => r.id === a.id)?.keywords || a.name
        : a.name,
      mode,
    )
    const ib = getItemSortPriority(
      b.id
        ? DEFAULT_ROWS.find(r => r.id === b.id)?.keywords || b.name
        : b.name,
      mode,
    )
    if (ia !== ib)
      return ia - ib
    return a.name.localeCompare(b.name)
  })

  if (playerSummaryFilterMode.value === 'obtained') {
    return results.filter(i => i.count > 0)
  }
  else if (playerSummaryFilterMode.value === 'needed') {
    return results.filter(i => i.count === 0)
  }
  return results
}

function getPlayerRole(player: string) {
  for (const [role, pName] of Object.entries(playerRoles.value)) {
    if (pName === player)
      return role
  }
  return undefined
}

function handlePlayerClick(e: MouseEvent, p: string) {
  if (e.ctrlKey) {
    copyToClipboard(p)
    return
  }
  if (e.altKey) {
    toggleSoloMode('player', p)
    return
  }
  if (isOnlyRaidMembersActive.value) {
    return
  }
  togglePlayerVisibility(p)
}

function togglePlayerVisibility(player: string) {
  playerVisibility.value[player] = !(playerVisibility.value[player] !== false)
}

function findManualDuplicates(incomingRecords: LootRecord[]): LootRecord[] {
  const manualRecords = lootRecords.value.filter(r => r.isManual)
  if (manualRecords.length === 0)
    return []

  const toDelete: LootRecord[] = []
  const incomingMap = new Map<string, Set<string>>() // date_item -> set of normalized players

  incomingRecords.forEach((real) => {
    if (real.isManual)
      return
    const date = new Date(real.timestamp).toLocaleDateString()
    const key = `${date}|${real.item}`
    if (!incomingMap.has(key))
      incomingMap.set(key, new Set())
    incomingMap.get(key)!.add(getActualPlayer(real.player))
  })

  manualRecords.forEach((manual) => {
    const date = new Date(manual.timestamp).toLocaleDateString()
    const key = `${date}|${manual.item}`
    const players = incomingMap.get(key)
    if (players && players.has(getActualPlayer(manual.player))) {
      toDelete.push(manual)
    }
  })

  return toDelete
}

async function handlePotentialDuplicates(
  incomingRecords: LootRecord[],
  context: 'sync' | 'import',
) {
  const overlaps = findManualDuplicates(incomingRecords)
  if (overlaps.length === 0)
    return

  const sourceName = context === 'sync' ? '同步的日志' : '导入的数据'
  try {
    await ElMessageBox.confirm(
      `在${sourceName}中发现了 ${overlaps.length} 条与现有手动记录重合的数据（同日期、同玩家、同物品）。<br/><br/>是否删除这些手动记录，以真实的解析数据为准？`,
      '发现重复记录',
      {
        confirmButtonText: '删除手动记录',
        cancelButtonText: '全部保留',
        type: 'info',
        dangerouslyUseHTMLString: true,
      },
    )
    for (const rec of overlaps) {
      await deleteRecord(rec, true)
    }
    ElMessage.success(`已清理 ${overlaps.length} 条手动记录`)
  }
  catch {
    // 用户取消删除
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success({
      message: `已复制: ${text}`,
      duration: 1500,
      showClose: true,
    })
  }
  catch (err) {
    console.error('Copy failed', err)
    ElMessage.error({ message: '复制失败', showClose: true })
  }
}

function toggleAllPlayers(visible: boolean) {
  allPlayers.value.forEach(p => (playerVisibility.value[p] = visible))
}

function selectRaidLoot() {
  const newIV: Record<string, boolean> = {}
  uniqueItems.value.forEach((item) => {
    newIV[item] = RAID_REGEX.test(item)
  })
  itemVisibility.value = newIV

  if (visiblePlayerCount.value === 0) {
    toggleAllPlayers(true)
  }
}

function openManualAddDialog() {
  manualForm.value = {
    timestamp: new Date().toISOString(),
    item: '',
    player: '',
  }
  showManualAddDialog.value = true
}

function querySearchItems(qs: string, cb: any) {
  const all = Array.from(uniqueItems.value)
  const candidates = all.filter(i =>
    i.toLowerCase().includes(qs.toLowerCase()),
  )
  cb(candidates.map(v => ({ value: v })))
}

function querySearchPlayers(qs: string, cb: any) {
  const candidates = allPlayers.value.filter(p =>
    p.toLowerCase().includes(qs.toLowerCase()),
  )
  cb(candidates.map(v => ({ value: v })))
}

async function submitManualRecord() {
  const item = manualForm.value.item.trim()
  const player = manualForm.value.player.trim()

  if (!manualForm.value.timestamp || !item || !player) {
    ElMessage.error('请填写完整信息')
    return
  }

  const isNewItem = !uniqueItems.value.includes(item)
  const isNewPlayer = !allPlayers.value.includes(player)

  if (isNewItem || isNewPlayer) {
    let warningMsg = ''
    if (isNewItem && isNewPlayer) {
      warningMsg = `物品 "<b>${item}</b>" 和 玩家 "<b>${player}</b>" 都是第一次出现。`
    }
    else if (isNewItem) {
      warningMsg = `物品 "<b>${item}</b>" 是第一次出现。`
    }
    else {
      warningMsg = `玩家 "<b>${player}</b>" 是第一次出现。`
    }

    try {
      await ElMessageBox.confirm(
        `${warningMsg}<br/><br/>确定要以此名称创建记录吗？请检查是否有错别字。`,
        '发现新条目',
        {
          confirmButtonText: '确定创建',
          cancelButtonText: '返回修改',
          type: 'warning',
          dangerouslyUseHTMLString: true,
        },
      )
    }
    catch {
      return
    }
  }

  const ts = new Date(manualForm.value.timestamp)
  const key = `manual-${ts.getTime()}-${Math.random().toString(36).slice(2)}`

  const record: LootRecord = {
    key,
    timestamp: ts,
    item,
    player,
    rolls: [],
    isManual: true,
  }

  await dbRecords.set(JSON.parse(JSON.stringify(record)))

  if (itemVisibility.value[record.item] === undefined) {
    itemVisibility.value[record.item] = true
  }
  if (playerVisibility.value[getActualPlayer(record.player)] === undefined) {
    playerVisibility.value[getActualPlayer(record.player)] = true
  }

  lootRecords.value = [...lootRecords.value, record]

  showManualAddDialog.value = false
  ElMessage.success({
    message: `已添加: ${record.item} - ${record.player}`,
    showClose: true,
  })
}

const importInputRef = ref<HTMLInputElement | null>(null)

function handleDataCommand(command: string) {
  if (command === 'clear') {
    clearForm.value = {
      loot: true,
      bis: false,
      roles: false,
      mapping: false,
      weekCorrection: false,
      playerCorrection: false,
      settings: false,
    }
    showClearDialog.value = true
  }
  else if (command === 'export') {
    exportData()
  }
  else if (command === 'import') {
    importInputRef.value?.click()
  }
  else if (command === 'manual') {
    openManualAddDialog()
  }
}

function exportData() {
  showExportDialog.value = true
}

async function confirmExport() {
  try {
    const uniqueItems = new Set<string>()
    const uniquePlayers = new Set<string>()
    let minTs = Date.now()

    lootRecords.value.forEach((rec) => {
      uniqueItems.add(rec.item)
      uniquePlayers.add(rec.player)
      const t
        = rec.timestamp instanceof Date ? rec.timestamp.getTime() : rec.timestamp
      if (t < minTs)
        minTs = t
      if (rec.rolls) {
        rec.rolls.forEach(r => uniquePlayers.add(r.player))
      }
    })

    const itemDict = Array.from(uniqueItems)
    const playerDict = Array.from(uniquePlayers)
    const itemMap = new Map(itemDict.map((item, idx) => [item, idx]))
    const playerMap = new Map(playerDict.map((player, idx) => [player, idx]))

    const ROLL_TYPES = ['need', 'greed', 'assign', 'direct', 'manual']
    const rollTypeMap = new Map(ROLL_TYPES.map((t, i) => [t, i]))

    const data: any = {
      v: 4,
      base: minTs,
      dicts: {
        i: itemDict,
        p: playerDict,
      },
      r: exportForm.value.loot
        ? lootRecords.value.map((rec) => {
            const t
              = rec.timestamp instanceof Date
                ? rec.timestamp.getTime()
                : rec.timestamp

            const row: any[] = [
              t - minTs,
              itemMap.get(rec.item),
              playerMap.get(rec.player),
              rec.key,
            ]

            if (rec.rolls && rec.rolls.length > 0) {
              row.push(rec.rolls.length)
              rec.rolls.forEach((r) => {
                row.push(playerMap.get(r.player))
                row.push(r.value)
                row.push(rollTypeMap.get(r.type) ?? 0)
              })
            }
            else {
              row.push(0)
            }
            return row
          })
        : [],
    }

    const config: any = {}
    if (exportForm.value.mapping)
      config.map = playerMapping.value
    if (exportForm.value.roles)
      config.roles = playerRoles.value
    if (exportForm.value.bis) {
      const filteredBis: BisConfig = { playerBis: {} }
      ROLE_DEFINITIONS.forEach((role) => {
        const data = bisConfig.value.playerBis?.[role]
        if (data)
          filteredBis.playerBis[role] = data
      })
      config.bisConfig = filteredBis
    }
    if (exportForm.value.settings) {
      config.filter = systemFilterSettings.value
      config.raidActive = isOnlyRaidMembersActive.value
    }
    if (exportForm.value.weekCorrection) {
      config.weekCorrections = recordWeekCorrections.value
    }
    if (exportForm.value.playerCorrection) {
      config.playerCorrections = recordPlayerCorrections.value
    }

    data.c = config

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ff14_loot_backup_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showExportDialog.value = false
    ElMessage.success({ message: '数据已导出', showClose: true })
  }
  catch (e) {
    console.error(e)
    ElMessage.error({ message: '导出失败', showClose: true })
  }
}

function isDeepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2)
    return true
  if (
    typeof obj1 !== 'object'
    || obj1 === null
    || typeof obj2 !== 'object'
    || obj2 === null
  ) {
    return false
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2))
    return false
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length)
      return false
    for (let i = 0; i < obj1.length; i++) {
      if (!isDeepEqual(obj1[i], obj2[i]))
        return false
    }
    return true
  }

  const keys1 = Object.keys(obj1).sort()
  const keys2 = Object.keys(obj2).sort()

  if (keys1.length !== keys2.length)
    return false

  for (let i = 0; i < keys1.length; i++) {
    const key = keys1[i]
    if (key === undefined)
      return false
    if (key !== keys2[i])
      return false
    if (!isDeepEqual(obj1[key], obj2[key]))
      return false
  }

  return true
}

async function processImportJSON(json: any) {
  try {
    if (!json.r || !Array.isArray(json.r)) {
      ElMessage.error({ message: '无效的备份文件格式', showClose: true })
      return
    }

    // 初始化导入勾选逻辑：备份中有数据，且本地尚无配置时，默认勾选
    const hasLoot = !!json.r?.length
    const hasBis = !!(json.c?.bisConfig || json.bisConfig || json.c?.bis)
    const hasRoles = !!json.c?.roles && Object.keys(json.c.roles).length > 0
    const hasMapping = !!json.c?.map && Object.keys(json.c.map).length > 0
    const hasCorrectionWeek
      = !!json.c?.weekCorrections
        && Object.keys(json.c.weekCorrections).length > 0
    const hasCorrectionPlayer
      = !!json.c?.playerCorrections
        && Object.keys(json.c.playerCorrections).length > 0
    const hasSettings = json.c?.filter || json.c?.raidActive !== undefined

    const isLocalBisEmpty
      = !bisConfig.value
        || !bisConfig.value.playerBis
        || Object.keys(bisConfig.value.playerBis).length === 0
    const isLocalRolesEmpty = Object.keys(playerRoles.value).length === 0
    const isLocalMappingEmpty = Object.keys(playerMapping.value).length === 0
    const isLocalWeekCorrectionEmpty
      = Object.keys(recordWeekCorrections.value).length === 0
    const isLocalPlayerCorrectionEmpty
      = Object.keys(recordPlayerCorrections.value).length === 0

    // 计算掉落记录差异
    let newLootCount = 0
    if (hasLoot) {
      const existingSigs = new Set(
        lootRecords.value.map(
          r => `${new Date(r.timestamp).getTime()}|${r.item}|${r.player}`,
        ),
      )
      const currentKeys = new Set(lootRecords.value.map(r => r.key))
      const baseTs = json.base || 0
      const itemDict = json.dicts?.i || []
      const playerDict = json.dicts?.p || []

      for (const rec of json.r) {
        const ts = baseTs + rec[0]
        const item = itemDict[rec[1]]
        const player = playerDict[rec[2]]
        const key = rec[3]
        if (!item || !player)
          continue

        const recordKey
          = key && typeof key === 'string' ? key : `${ts}_${item}_${player}`
        if (currentKeys.has(recordKey) || blacklistedKeys.value.has(recordKey))
          continue

        const sig = `${ts}|${item}|${player}`
        if (!existingSigs.has(sig)) {
          newLootCount++
        }
      }
    }

    // 计算差异
    const incomingBis = json.c?.bisConfig || json.bisConfig || json.c?.bis
    importDiffs.value = {
      loot: hasLoot && newLootCount > 0,
      bis: (() => {
        if (!hasBis)
          return false
        const localFiltered: Record<string, Record<string, BisValue>> = {}
        const incomingFiltered: Record<string, Record<string, BisValue>> = {}
        ROLE_DEFINITIONS.forEach((role) => {
          const localMap = bisConfig.value.playerBis
          if (localMap && localMap[role]) {
            localFiltered[role] = localMap[role]
          }
          const incomingMap = incomingBis?.playerBis
          if (incomingMap && incomingMap[role]) {
            incomingFiltered[role] = incomingMap[role]
          }
        })
        return !isDeepEqual(localFiltered, incomingFiltered)
      })(),
      roles: hasRoles && !isDeepEqual(playerRoles.value, json.c.roles),
      mapping: hasMapping && !isDeepEqual(playerMapping.value, json.c.map),
      weekCorrection:
        hasCorrectionWeek
        && !isDeepEqual(recordWeekCorrections.value, json.c.weekCorrections || {}),
      playerCorrection:
        hasCorrectionPlayer
        && !isDeepEqual(
          recordPlayerCorrections.value,
          json.c.playerCorrections || {},
        ),
      settings:
        hasSettings
        && (!isDeepEqual(
          systemFilterSettings.value,
          json.c.filter || systemFilterSettings.value,
        )
        || isOnlyRaidMembersActive.value
        !== (json.c.raidActive ?? isOnlyRaidMembersActive.value)),
    }

    importForm.value = {
      loot: importDiffs.value.loot, // 只有发现新记录才默认勾选
      bis: hasBis && isLocalBisEmpty && importDiffs.value.bis,
      roles: hasRoles && isLocalRolesEmpty && importDiffs.value.roles,
      mapping: hasMapping && isLocalMappingEmpty && importDiffs.value.mapping,
      weekCorrection:
        hasCorrectionWeek
        && isLocalWeekCorrectionEmpty
        && importDiffs.value.weekCorrection,
      playerCorrection:
        hasCorrectionPlayer
        && isLocalPlayerCorrectionEmpty
        && importDiffs.value.playerCorrection,
      settings: hasSettings && importDiffs.value.settings,
    }

    importDataPending.value = json
    showImportConfirmDialog.value = true
  }
  catch (_err) {
    console.error(_err)
    ElMessage.error({ message: '解析出错', showClose: true })
  }
}

async function confirmImport() {
  const json = importDataPending.value
  if (!json)
    return

  let loading
  try {
    loading = ElMessage({
      message: '正在导入数据...',
      duration: 0,
      type: 'info',
      showClose: true,
    })

    if (json.c) {
      if (importForm.value.mapping && json.c.map)
        playerMapping.value = { ...playerMapping.value, ...json.c.map }
      if (importForm.value.roles && json.c.roles)
        playerRoles.value = { ...playerRoles.value, ...json.c.roles }
      if (importForm.value.bis) {
        const incomingBis = json.c.bisConfig || json.bisConfig || json.c.bis
        if (incomingBis) {
          const filtered: BisConfig = { playerBis: {} }
          ROLE_DEFINITIONS.forEach((role) => {
            const data = incomingBis.playerBis?.[role]
            if (data)
              filtered.playerBis[role] = data
          })
          bisConfig.value = filtered
        }
      }

      if (importForm.value.settings) {
        if (json.c.filter) {
          systemFilterSettings.value = {
            ...systemFilterSettings.value,
            ...json.c.filter,
          }
        }
        if (json.c.raidActive !== undefined)
          isOnlyRaidMembersActive.value = json.c.raidActive
      }
      if (importForm.value.weekCorrection) {
        if (json.c.weekCorrections) {
          recordWeekCorrections.value = {
            ...recordWeekCorrections.value,
            ...json.c.weekCorrections,
          }
        }
      }
      if (importForm.value.playerCorrection) {
        if (json.c.playerCorrections) {
          recordPlayerCorrections.value = {
            ...recordPlayerCorrections.value,
            ...json.c.playerCorrections,
          }
        }
      }
    }

    if (importForm.value.loot && json.r && json.r.length > 0) {
      const existingSigs = new Set(
        lootRecords.value.map(
          r => `${new Date(r.timestamp).getTime()}|${r.item}|${r.player}`,
        ),
      )
      const currentKeys = new Set(lootRecords.value.map(r => r.key))

      const newRecords: LootRecord[] = []
      const baseTs = json.base || 0
      const itemDict = json.dicts?.i || []
      const playerDict = json.dicts?.p || []
      const ROLL_TYPES = ['need', 'greed', 'assign', 'direct', 'manual']

      for (const rec of json.r) {
        const ts = baseTs + rec[0]
        const item = itemDict[rec[1]]
        const player = playerDict[rec[2]]
        const key = rec[3]
        const rCount = rec[4]

        const rolls = [] as any[]
        if (rCount > 0) {
          let cursor = 5
          for (let i = 0; i < rCount; i++) {
            if (cursor + 2 >= rec.length)
              break
            rolls.push({
              player: playerDict[rec[cursor]],
              value: rec[cursor + 1],
              type: ROLL_TYPES[rec[cursor + 2]] || 'need',
            })
            cursor += 3
          }
        }

        if (!item || !player)
          continue

        const recordKey
          = key && typeof key === 'string'
            ? key
            : `${ts}_${item}_${player}_${Math.random().toString(36).slice(2)}`

        if (currentKeys.has(recordKey) || blacklistedKeys.value.has(recordKey))
          continue

        const sig = `${ts}|${item}|${player}`
        if (!existingSigs.has(sig)) {
          newRecords.push({
            key: recordKey,
            timestamp: new Date(ts),
            item,
            player,
            rolls,
            source: 'import',
            id: '',
          } as LootRecord)
          existingSigs.add(sig)
          currentKeys.add(recordKey)
        }
      }

      if (newRecords.length > 0) {
        await dbRecords.bulkSet(JSON.parse(JSON.stringify(newRecords)))
        lootRecords.value = [...lootRecords.value, ...newRecords].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        existingKeys.value = new Set(lootRecords.value.map(r => r.key))

        handlePotentialDuplicates(newRecords, 'import')
      }
    }

    ElMessage.success({
      message: '数据导入已完成',
      showClose: true,
    })
    showImportConfirmDialog.value = false
    importDataPending.value = null
  }
  catch (err) {
    console.error(err)
    ElMessage.error({ message: '导入失败', showClose: true })
  }
  finally {
    loading?.close()
  }
}

function processImportFile(file: File) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const json = JSON.parse(e.target?.result as string)
      await processImportJSON(json)
    }
    catch (e) {
      console.error(e)
      ElMessage.error({ message: '文件解析失败', showClose: true })
    }
  }
  reader.readAsText(file)
}

function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0)
    return
  processImportFile(input.files[0]!)
  input.value = ''
}

const soloState = ref<{
  type: 'item' | 'player'
  key: string
  snapshot: Record<string, boolean>
} | null>(null)

function toggleSoloMode(type: 'item' | 'player', key: string) {
  const isItem = type === 'item'
  const visibility = isItem ? itemVisibility : playerVisibility
  const list = isItem ? uniqueItems : allPlayers

  if (soloState.value?.type === type && soloState.value.key === key) {
    visibility.value = { ...soloState.value.snapshot }
    soloState.value = null
    ElMessage.info({
      message: '已恢复到独显前的状态',
      duration: 2000,
      showClose: true,
    })
    return
  }

  let baseState = visibility.value
  if (soloState.value?.type === type) {
    baseState = soloState.value.snapshot
  }

  soloState.value = {
    type,
    key,
    snapshot: JSON.parse(JSON.stringify(baseState)),
  }

  const newVisibility: Record<string, boolean> = {}
  list.value.forEach((k) => {
    newVisibility[k] = k === key
  })
  visibility.value = newVisibility

  ElMessage.success({
    message: `仅显示: ${key} (再次 Alt+点击 恢复)`,
    duration: 2000,
  })
}

function formatTime(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}/${m}/${d} ${hh}:${mm}`
}

function formatFileSize(bytes: number) {
  if (bytes === 0)
    return '0 MB'
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getOriginalRollInfo(record: LootRecord): RollInfo | null {
  const roll = record.rolls.find(r => r.player === record.player)
  if (roll)
    return roll

  if (record.player) {
    const type: RollInfo['type'] = record.isManual
      ? 'manual'
      : record.isAssign
        ? 'assign'
        : 'direct'
    return {
      player: record.player,
      type,
      value: null,
    }
  }
  return null
}

function getWinnerRollInfo(record: LootRecord): RollInfo | null {
  const correctedPlayer = getRecordPlayer(record)
  const isCorrected = !!recordPlayerCorrections.value[record.key]

  if (isCorrected) {
    return {
      player: correctedPlayer,
      type: 'replace',
      value: null,
    }
  }

  const roll = record.rolls.find(r => r.player === correctedPlayer)
  if (roll)
    return roll

  if (correctedPlayer) {
    const type: RollInfo['type'] = record.isManual
      ? 'manual'
      : record.isAssign
        ? 'assign'
        : 'direct'

    return {
      player: correctedPlayer,
      type,
      value: null,
    }
  }
  return null
}
function getOtherRolls(record: LootRecord): RollInfo[] {
  return record.rolls
    .filter(r => r.player !== record.player)
    .sort((a, b) => {
      const typePriority = { need: 0, greed: 1 } as const
      const typeA = typePriority[a.type as keyof typeof typePriority] ?? 3
      const typeB = typePriority[b.type as keyof typeof typePriority] ?? 3
      if (typeA !== typeB)
        return typeA - typeB
      return (b.value || 0) - (a.value || 0)
    })
}

async function confirmClear() {
  const selectedCount = Object.values(clearForm.value).filter(Boolean).length
  if (selectedCount === 0) {
    showClearDialog.value = false
    return
  }

  showClearDialog.value = false
  const tasks: Promise<any>[] = []

  if (clearForm.value.loot) {
    tasks.push(dbRecords.clear())
    lootRecords.value = []
    existingKeys.value.clear()
    processedFiles.value = {}
    tasks.push(dbConfig.remove('processedFiles'))
  }

  if (clearForm.value.weekCorrection) {
    recordWeekCorrections.value = {}
    tasks.push(dbConfig.remove('weekCorrections'))
  }

  if (clearForm.value.playerCorrection) {
    recordPlayerCorrections.value = {}
    tasks.push(dbConfig.remove('playerCorrections'))
  }

  if (clearForm.value.settings) {
    systemFilterSettings.value = {
      cards: true,
      materia: true,
      music: true,
      book: true,
      totem: true,
      other: true,
      maskedSeries: [],
    }
    isOnlyRaidMembersActive.value = false
    tasks.push(dbConfig.remove('systemFilterSettings'))
    tasks.push(dbConfig.remove('isOnlyRaidMembersActive'))
  }

  if (clearForm.value.bis) {
    bisConfig.value = { playerBis: {} }
    tasks.push(dbConfig.remove('bisConfig'))
  }

  if (clearForm.value.roles) {
    playerRoles.value = {}
    tasks.push(dbConfig.remove('playerRoles'))
  }

  if (clearForm.value.mapping) {
    playerMapping.value = {}
    tasks.push(dbConfig.remove('playerMapping'))
  }

  await Promise.all(tasks)
  ElMessage.success({ message: '所选数据已清空', showClose: true })
}

async function handleWinnerChange(record: LootRecord, newPlayer: string) {
  if (!newPlayer)
    return
  pendingWinnerChange.value = { record, newPlayer }
  popoverTargetRecord.value = null

  setTimeout(() => {
    if (pendingWinnerChange.value) {
      applyPendingWinnerChange()
    }
  }, 75)
}

async function applyPendingWinnerChange() {
  if (!pendingWinnerChange.value)
    return
  const { record, newPlayer } = pendingWinnerChange.value

  const newMap = { ...recordPlayerCorrections.value }
  if (newPlayer === record.player) {
    delete newMap[record.key]
  }
  else {
    newMap[record.key] = newPlayer
  }
  recordPlayerCorrections.value = newMap

  ElMessage.success({
    message:
      newPlayer === record.player
        ? '已恢复原始获得者'
        : `已将物品重新分配给 ${newPlayer}`,
    showClose: true,
  })

  // 清空待处理状态
  pendingWinnerChange.value = null
}
</script>

<template>
  <div
    class="app-container"
    :class="{
      'is-onboarding':
        !currentHandle || showTimeSetup || lootRecords.length === 0,
    }"
  >
    <transition name="fade">
      <div v-if="isInitializing" class="initial-loading">
        <div class="skeleton-layout">
          <div class="skeleton-header">
            <div class="skeleton-item brand" />
            <div class="skeleton-item toolbar" />
          </div>
          <div class="skeleton-page-main">
            <div class="skeleton-item control" />
            <div class="skeleton-filters">
              <div class="skeleton-item filter-box" />
              <div class="skeleton-item filter-box" />
            </div>
            <div class="skeleton-content-grid">
              <div v-for="i in 8" :key="i" class="skeleton-item card" />
            </div>
          </div>
        </div>
      </div>
    </transition>

    <div class="theme-toggle-fixed">
      <CommonThemeToggle storage-key="loot-history-theme" />
    </div>

    <template v-if="!isInitializing">
      <transition name="fade">
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-card-wide">
            <div class="loading-header">
              <div class="spinner-small" />
              <span class="loading-title">解析中... {{ loadingProgress }}%</span>
            </div>
            <div class="parsing-lists">
              <div class="list-col">
                <div class="list-head">
                  已完成 ({{ parsedLogFiles.length }})
                </div>
                <div class="list-body">
                  <transition-group name="list">
                    <div
                      v-for="file in parsedLogFiles"
                      :key="file.name"
                      class="file-item done"
                    >
                      <div class="file-info-left">
                        <el-icon><Check /></el-icon>
                        <span class="file-name" :title="file.name">{{
                          file.name
                        }}</span>
                      </div>
                      <span class="file-size">{{
                        formatFileSize(file.size)
                      }}</span>
                    </div>
                  </transition-group>
                </div>
              </div>
              <div class="list-divider" />
              <div class="list-col">
                <div class="list-head">
                  待处理 ({{ pendingLogFiles.length }})
                </div>
                <div class="list-body">
                  <div
                    v-for="file in pendingLogFiles.slice(0, 50)"
                    :key="file.name"
                    class="file-item pending"
                  >
                    <div class="file-info-left">
                      <el-icon><Timer /></el-icon>
                      <span class="file-name" :title="file.name">{{
                        file.name
                      }}</span>
                    </div>
                    <span class="file-size">{{
                      formatFileSize(file.size)
                    }}</span>
                  </div>
                  <div v-if="pendingLogFiles.length > 50" class="more-hint">
                    ...还有 {{ pendingLogFiles.length - 50 }} 个文件
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <main
        v-if="lootRecords.length > 0"
        class="app-main"
        style="padding-top: 10px"
      >
        <div class="control-bar" style="position: relative">
          <div
            v-if="isDragOverWindow"
            class="drag-guide-zone"
            :class="{ 'is-active': isDragOverZone }"
            @drop.stop.prevent="handleZoneDrop"
            @dragover.prevent
            @dragenter="isDragOverZone = true"
            @dragleave="isDragOverZone = false"
          >
            <el-icon class="guide-icon">
              <UploadFilled />
            </el-icon>
            <span>释放文件以导入备份</span>
          </div>

          <div class="path-toolbar">
            <el-button
              :type="isSyncNeeded ? 'warning' : 'primary'"
              size="small"
              :loading="isSyncing"
              class="sync-btn-fixed"
              @click="syncLogFiles(true)"
            >
              {{
                isSyncing ? '同步中' : isSyncNeeded ? '需要同步' : '立即同步'
              }}
              <span v-if="isSyncNeeded" class="dot-warn" />
            </el-button>
            <div class="sync-status-container">
              <div v-show="!syncSuccessVisible && lastSyncTime" class="sync-hint-text time-hint">
                上次同步: {{ lastSyncTime }}
              </div>
              <div v-show="syncSuccessVisible" class="sync-hint-text is-success success-hint">
                同步成功
              </div>
            </div>

            <el-date-picker
              v-model="syncStartDate"
              type="datetime"
              size="small"
              placeholder="起始时间"
              format="YYYY/MM/DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              :clearable="false"
              class="date-picker-el"
            />
            <span class="range-sep">-</span>
            <el-date-picker
              v-model="syncEndDate"
              type="datetime"
              size="small"
              placeholder="截止时间(可选)"
              format="YYYY/MM/DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              clearable
              class="date-picker-el"
            />

            <el-button plain class="tool-btn" @click="setLogPath">
              <el-icon><FolderOpened /></el-icon>
              <span>日志目录</span>
            </el-button>

            <div class="v-divider" />

            <el-button plain class="tool-btn" @click="openManualAddDialog">
              <el-icon><Plus /></el-icon>
              <span>手动添加</span>
            </el-button>

            <el-dropdown trigger="click" @command="handleDataCommand">
              <el-button plain class="tool-btn">
                <el-icon><Setting /></el-icon>
                <span>数据管理</span>
                <el-icon class="el-icon--right">
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="import">
                    <el-icon><Upload /></el-icon>导入备份 (JSON)
                  </el-dropdown-item>
                  <el-dropdown-item command="export">
                    <el-icon><Download /></el-icon>导出备份 (JSON)
                  </el-dropdown-item>
                  <el-dropdown-item
                    command="clear"
                    divided
                    style="color: #f56c6c"
                  >
                    <el-icon><Delete /></el-icon>清空数据库
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-button plain class="tool-btn" @click="showCustomCorrectionDialog = true">
              <el-icon><RefreshLeft /></el-icon>
              <span>自定义修正管理</span>
            </el-button>

            <div class="v-divider" />

            <el-popover
              placement="bottom-end"
              :width="480"
              trigger="click"
              popper-class="guide-popover-popper"
            >
              <template #reference>
                <el-button plain class="tool-btn">
                  <el-icon><QuestionFilled /></el-icon>
                  <span>使用指南</span>
                </el-button>
              </template>

              <div class="guide-content-popover">
                <section class="guide-section">
                  <h4>
                    <el-icon><InfoFilled /></el-icon> 这是什么？
                  </h4>
                  <p>
                    这是一个专门为 FFXIV
                    固定队设计的<strong>掉落历史统计</strong>与
                    <strong>BIS 分配管理</strong>工具。它能自动从你的 ACT
                    日志中记录战利品信息，并以此为基础提供自动化的分配建议与数据分析。
                  </p>
                </section>

                <section class="guide-section">
                  <h4>
                    <el-icon><Monitor /></el-icon> 注意事项
                  </h4>
                  <div class="warning-box">
                    <ul>
                      <li>
                        <strong>保持 ACT 运行：</strong>且未勾选“隐藏聊天日志(隐私保护)”。
                      </li>
                      <li>
                        <strong>请勿提前退本：</strong>
                        一定要等装备分完了再退本！以保证日志完整。
                      </li>
                    </ul>
                  </div>
                </section>

                <section class="guide-section">
                  <h4>
                    <el-icon><Mouse /></el-icon> 快速上手
                  </h4>
                  <ol>
                    <li>
                      <strong>配置人员：</strong>
                      在左上方“固定队 - 职位设置”中绑定队员 ID。
                    </li>
                    <li>
                      <strong>BIS 规划：</strong>
                      切换至“BIS分配”页签，录入全队成员的毕业装备需求。
                    </li>
                    <li>
                      <strong>一键分配：</strong>
                      副本结束后，可参考“BIS分配”页签的建议进行分配。
                    </li>
                  </ol>
                </section>

                <section class="guide-section">
                  <h4>
                    <el-icon><EditPen /></el-icon> 漏了记录怎么办？
                  </h4>
                  <p>
                    如果因意外（如掉线、忘开 ACT
                    等）漏掉记录，请点击主界面右上角的“<strong>手动添加</strong>”补全。手动添加的记录也会参与
                    BIS 统计与分配计算。
                  </p>
                </section>
              </div>
            </el-popover>
          </div>
        </div>

        <div class="filter-panel">
          <!-- Filter Panel Content Remains Identical -->
          <div class="filter-section">
            <div class="sec-header">
              <div class="sec-title-group">
                <span class="title-main">👥 玩家 ({{ visiblePlayerCount }})</span>
                <div class="header-sep" />
                <el-popover
                  placement="bottom"
                  :width="360"
                  trigger="click"
                  popper-class="role-settings-popper"
                >
                  <template #reference>
                    <el-button size="small" class="soft-action-btn primary">
                      <el-icon><User /></el-icon>
                      <span>固定队 - 职位设置</span>
                      <span v-if="!isRaidRolesComplete" class="dot-warn" />
                    </el-button>
                  </template>

                  <div class="role-settings-content-popover">
                    <div class="role-grid">
                      <div
                        v-for="role in ROLE_DEFINITIONS"
                        :key="role"
                        class="role-setup-item"
                      >
                        <div class="role-setup-label">
                          <RoleBadge :role="role" />
                        </div>
                        <ElSelect
                          v-model="playerRoles[role]"
                          placeholder="选择/输入玩家"
                          filterable
                          allow-create
                          default-first-option
                          clearable
                          size="small"
                          style="flex: 1"
                          :teleported="false"
                        >
                          <ElOption
                            v-for="p in playersForSelection.filter(
                              (p) =>
                                p === playerRoles[role]
                                || !assignedPlayers.has(p),
                            )"
                            :key="p"
                            :label="p"
                            :value="p"
                          />
                        </ElSelect>
                      </div>
                    </div>

                    <div class="role-divider">
                      特殊分组
                    </div>

                    <div class="special-role-section">
                      <div class="special-role-group">
                        <div class="group-title">
                          临时替补
                        </div>
                        <div class="special-list">
                          <template
                            v-for="(p, role) in playerRoles"
                            :key="role"
                          >
                            <div
                              v-if="role.startsWith('SUB:')"
                              class="special-item"
                            >
                              <ElTag
                                closable
                                @close="delete playerRoles[role]"
                              >
                                {{ p }}
                              </ElTag>
                            </div>
                          </template>
                          <ElSelect
                            placeholder="添加/输入替补"
                            filterable
                            allow-create
                            default-first-option
                            size="small"
                            value=""
                            style="width: 120px"
                            :teleported="false"
                            @change="addSpecialRole($event, 'SUB')"
                          >
                            <ElOption
                              v-for="p in playersForSelection.filter(
                                (p) => !assignedPlayers.has(p),
                              )"
                              :key="p"
                              :label="p"
                              :value="p"
                            />
                          </ElSelect>
                        </div>
                      </div>

                      <div class="special-role-group">
                        <div class="group-title">
                          已离队
                        </div>
                        <div class="special-list">
                          <template
                            v-for="(p, role) in playerRoles"
                            :key="role"
                          >
                            <div
                              v-if="role.startsWith('LEFT:')"
                              class="special-item"
                            >
                              <ElTag
                                closable
                                @close="delete playerRoles[role]"
                              >
                                {{ p }}
                              </ElTag>
                            </div>
                          </template>
                          <ElSelect
                            placeholder="添加/输入离队"
                            filterable
                            allow-create
                            default-first-option
                            size="small"
                            value=""
                            style="width: 120px"
                            :teleported="false"
                            @change="addSpecialRole($event, 'LEFT')"
                          >
                            <ElOption
                              v-for="p in playersForSelection.filter(
                                (p) => !assignedPlayers.has(p),
                              )"
                              :key="p"
                              :label="p"
                              :value="p"
                            />
                          </ElSelect>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-popover>
                <div class="header-sep" />
                <el-tooltip
                  :disabled="isRaidRolesComplete"
                  :content="ROLE_SETTING_HINT"
                  placement="top"
                >
                  <label class="switch-box">
                    <ElSwitch
                      v-model="showOnlyRole"
                      :disabled="!isRaidRolesComplete"
                      size="small"
                      style="
                        --el-switch-on-color: #3b82f6;
                        --el-switch-off-color: #cbd5e1;
                      "
                    />
                    <span
                      class="switch-label"
                      :style="{ opacity: isRaidRolesComplete ? 1 : 0.5 }"
                    >只显示职位</span>
                  </label>
                </el-tooltip>
                <div class="header-sep" />
                <el-tooltip
                  :disabled="isRaidRolesComplete"
                  :content="ROLE_SETTING_HINT"
                  placement="top"
                >
                  <div
                    class="switch-container"
                    style="display: inline-flex; align-items: center; gap: 6px"
                  >
                    <ElSwitch
                      v-model="isOnlyRaidMembersActive"
                      :disabled="!isRaidRolesComplete"
                      size="small"
                      style="--el-switch-on-color: #3b82f6"
                    />
                    <span
                      class="switch-label"
                      :style="{
                        opacity: isRaidRolesComplete ? 1 : 0.5,
                        fontSize: '12px',
                      }"
                    >
                      只看固定队
                    </span>
                  </div>
                </el-tooltip>
                <div v-if="!isOnlyRaidMembersActive" class="header-sep" />
                <label v-if="!isOnlyRaidMembersActive" class="switch-box">
                  <ElSwitch
                    v-model="hideEmptyPlayers"
                    size="small"
                    style="--el-switch-on-color: #3b82f6"
                  />
                  <span class="switch-label">隐藏无记录玩家</span>
                </label>
              </div>
              <div class="acts">
                <el-popover
                  v-model:visible="isMergePanelActive"
                  placement="bottom"
                  :width="320"
                  trigger="click"
                >
                  <template #reference>
                    <el-button size="small" class="soft-action-btn">
                      合并大小号
                    </el-button>
                  </template>
                  <div class="popover-form">
                    <div class="merge-selector-box">
                      <div class="merge-guide-desc">
                        <el-icon><InfoFilled /></el-icon>
                        <div class="guide-content">
                          <p>
                            合并角色将<strong>永久归并</strong>两者的所有历史记录。
                          </p>
                          <p>
                            若仅需修正单次分配错误，请直接在“详情记录”中点击姓名进行修改。
                          </p>
                        </div>
                      </div>

                      <div class="procedure-steps-compact">
                        <div
                          class="step-dot hide"
                          :class="{
                            'is-active': selectionForMerge.length === 0,
                          }"
                        >
                          <span class="step-num">1</span>
                          <span class="step-label">被合角色</span>
                        </div>
                        <el-icon class="step-arrow">
                          <Right />
                        </el-icon>
                        <div
                          class="step-dot show"
                          :class="{
                            'is-active': selectionForMerge.length === 1,
                          }"
                        >
                          <span class="step-num">2</span>
                          <span class="step-label">目标角色</span>
                        </div>
                      </div>

                      <div class="selector-tags">
                        <el-check-tag
                          v-for="p in selectablePlayersForMerge"
                          :key="p"
                          :checked="selectionForMerge.includes(p)"
                          class="merge-check-tag"
                          :class="[
                            selectionForMerge[0] === p ? 'is-hiding' : '',
                            selectionForMerge[1] === p ? 'is-showing' : '',
                          ]"
                          @change="handlePlayerSelectForMerge(p)"
                        >
                          <PlayerDisplay
                            :name="p"
                            :role="getPlayerRole(p)"
                            :show-only-role="showOnlyRole"
                            class="tag-label-name"
                          />
                          <div
                            v-if="selectionForMerge[0] === p"
                            class="selection-badge hide"
                          >
                            <el-icon><View /></el-icon>
                            <span>隐身角色</span>
                          </div>
                          <div
                            v-if="selectionForMerge[1] === p"
                            class="selection-badge show"
                          >
                            <el-icon><Star /></el-icon>
                            <span>主角色</span>
                          </div>
                        </el-check-tag>
                      </div>

                      <div
                        v-if="selectionForMerge.length === 2"
                        class="merge-actions"
                      >
                        <el-button
                          type="primary"
                          size="default"
                          class="confirm-merge-btn-new"
                          @click="confirmMergeSelection"
                        >
                          确认将数据合并
                        </el-button>
                      </div>
                    </div>

                    <div
                      v-if="mergeSuggestions.length > 0"
                      class="suggestion-box"
                    >
                      <div class="suggest-title">
                        💡 发现疑似换号 (>90% 重合)：
                      </div>
                      <div class="suggest-items">
                        <el-button
                          v-for="s in mergeSuggestions"
                          :key="s.from + s.to"
                          size="small"
                          plain
                          class="suggest-btn"
                          @click="addMapping(s.from, s.to)"
                        >
                          <PlayerDisplay
                            :name="s.from"
                            :role="getPlayerRole(s.from)"
                            :show-only-role="showOnlyRole"
                          />
                          <el-icon style="margin: 0 4px">
                            <Right />
                          </el-icon>
                          <PlayerDisplay
                            :name="s.to"
                            :role="getPlayerRole(s.to)"
                            :show-only-role="showOnlyRole"
                          />
                          <span class="conf-text">({{ s.confidence }}%)</span>
                        </el-button>
                      </div>
                    </div>

                    <div
                      v-if="Object.keys(playerMapping).length > 0"
                      class="mapping-box"
                    >
                      <div class="selector-title">
                        当前合并映射:
                      </div>
                      <div class="mapping-list">
                        <div
                          v-for="(to, from) in playerMapping"
                          :key="from"
                          class="mapping-item-row"
                        >
                          <div class="map-from">
                            <span class="map-tag-hint">隐身</span>
                            <PlayerDisplay
                              :name="from"
                              :role="getPlayerRole(from)"
                              :show-only-role="showOnlyRole"
                            />
                          </div>
                          <el-icon class="map-arrow">
                            <Right />
                          </el-icon>
                          <div class="map-to">
                            <span class="map-tag-hint">显示</span>
                            <PlayerDisplay
                              :name="to"
                              :role="getPlayerRole(to)"
                              :show-only-role="showOnlyRole"
                            />
                          </div>
                          <el-button
                            link
                            type="danger"
                            :icon="Delete"
                            class="map-remove"
                            @click="removeMapping(from)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </el-popover>
                <span class="hint-small">Ctrl + 鼠标左键 = 复制，Alt + 鼠标左键 = 单独显示</span>
              </div>
            </div>
            <div class="sec-body" style="position: relative">
              <div v-if="isOnlyRaidMembersActive" class="section-mask" />
              <el-check-tag
                v-for="p in visibleAllPlayers"
                :key="p"
                :checked="isPlayerChecked(p)"
                :class="{
                  'readonly-tag': isOnlyRaidMembersActive,
                }"
                class="mini-tag-el player-tag"
                @click.stop="handlePlayerClick($event, p)"
              >
                <PlayerDisplay
                  :name="p"
                  :role="getPlayerRole(p)"
                  :show-only-role="showOnlyRole"
                />
              </el-check-tag>
            </div>
          </div>
          <div class="filter-section">
            <div class="sec-header">
              <div class="sec-title-group">
                <span class="title-main">📦 物品 ({{ visibleItemCount }})</span>
                <label class="switch-box">
                  <ElSwitch
                    v-model="isRaidFilterActive"
                    size="small"
                    style="--el-switch-on-color: #3b82f6"
                  />
                  <span class="switch-label">只看零式掉落</span>
                </label>
                <div class="header-sep" />
                <el-popover
                  placement="bottom-start"
                  :width="220"
                  trigger="click"
                >
                  <template #reference>
                    <el-button size="small" class="soft-action-btn primary">
                      <el-icon style="margin-right: 4px">
                        <Setting />
                      </el-icon>
                      杂物屏蔽设置
                    </el-button>
                  </template>
                  <div class="filter-popover">
                    <div class="pop-title">
                      屏蔽杂物 (非零式模式下生效)
                    </div>
                    <div
                      class="filter-list"
                      :style="{
                        opacity: isRaidFilterActive ? 0.5 : 1,
                        pointerEvents: isRaidFilterActive ? 'none' : 'auto',
                      }"
                    >
                      <ElCheckbox
                        v-model="systemFilterSettings.cards"
                        label="九宫幻卡"
                        size="small"
                      />
                      <ElCheckbox
                        v-model="systemFilterSettings.materia"
                        label="魔晶石"
                        size="small"
                      />
                      <ElCheckbox
                        v-model="systemFilterSettings.music"
                        label="乐谱"
                        size="small"
                      />
                      <ElCheckbox
                        v-model="systemFilterSettings.book"
                        label="零式断章"
                        size="small"
                      />
                      <ElCheckbox
                        v-model="systemFilterSettings.totem"
                        label="极神图腾"
                        size="small"
                      />
                      <ElCheckbox
                        v-model="systemFilterSettings.other"
                        label="经验值/金币"
                        size="small"
                      />

                      <template v-if="availableSeries.length > 0">
                        <div
                          class="pop-title"
                          style="margin: 8px 0 4px; padding-top: 8px"
                        >
                          屏蔽装备系列
                        </div>
                        <el-checkbox-group
                          v-model="systemFilterSettings.maskedSeries"
                          style="
                            display: flex;
                            flex-direction: column;
                            gap: 4px;
                          "
                        >
                          <ElCheckbox
                            v-for="s in availableSeries"
                            :key="s"
                            :label="s"
                            size="small"
                          >
                            {{ s }}系列
                          </ElCheckbox>
                        </el-checkbox-group>
                      </template>
                    </div>
                  </div>
                </el-popover>
              </div>
              <div class="acts">
                <span class="hint-small">Ctrl + 鼠标左键 = 复制，Alt + 鼠标左键 = 单独显示</span>
              </div>
            </div>
            <div class="sec-body" style="position: relative">
              <div v-if="isRaidFilterActive" class="section-mask" />
              <el-check-tag
                v-for="item in visibleUniqueItems"
                :key="item"
                :checked="isItemChecked(item)"
                :class="{
                  'readonly-tag': isRaidFilterActive,
                }"
                class="mini-tag-el item-tag"
                @click.stop="handleItemClick($event, item)"
              >
                {{ item }}
              </el-check-tag>
            </div>
          </div>
        </div>

        <div class="main-viewport" style="position: relative">
          <el-tabs
            v-if="filteredRecords.length > 0"
            v-model="viewMode"
            class="mode-tabs-el"
            type="card"
          >
            <el-tab-pane label="详细记录" name="list">
              <div class="list-container-el">
                <el-table
                  :data="paginatedRecords"
                  style="width: 100%"
                  class="loot-record-table"
                  cell-class-name="loot-cell"
                >
                  <el-table-column label="周" width="60" align="center">
                    <template #default="scope">
                      <div
                        class="col-week-interactive"
                        @click.stop="handleRecordTrigger($event, scope.row)"
                        @contextmenu.prevent="handleRecordTrigger($event, scope.row)"
                      >
                        <div
                          v-if="recordWeekCorrections[scope.row.key]"
                          class="week-correction-display"
                        >
                          <div class="original-week">
                            W{{
                              getRaidWeekIndex(
                                scope.row.timestamp,
                                GAME_VERSION_CONFIG.RAID_START_TIME,
                              )
                            }}
                          </div>
                          <el-icon class="week-arrow">
                            <ArrowDown />
                          </el-icon>
                          <div class="corrected-week">
                            W{{
                              getRaidWeekIndex(
                                scope.row.timestamp,
                                GAME_VERSION_CONFIG.RAID_START_TIME,
                              ) + (recordWeekCorrections[scope.row.key] || 0)
                            }}
                          </div>
                        </div>
                        <div v-else class="col-week">
                          W{{
                            getRaidWeekIndex(
                              scope.row.timestamp,
                              GAME_VERSION_CONFIG.RAID_START_TIME,
                            )
                          }}
                          <el-tooltip
                            placement="top"
                            :enterable="false"
                          >
                            <template #content>
                              可能归属周错误（通常发生在周二压线进本）。<br>点击可选择将其归入上一周。
                            </template>
                            <el-icon
                              v-if="
                                rawSuspiciousKeys.has(scope.row.key)
                                  && !recordWeekCorrections[scope.row.key]
                              "
                              class="week-warning-icon"
                            >
                              <Warning />
                            </el-icon>
                          </el-tooltip>
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="时间" width="140">
                    <template #default="scope">
                      <div class="col-time">
                        <span class="time-date">{{
                          formatTime(scope.row.timestamp)
                        }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="物品" width="220">
                    <template #default="scope">
                      <div class="col-item">
                        <span class="item-text">{{ scope.row.item }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="获得者" width="260">
                    <template #default="scope">
                      <div
                        class="winner-selector-trigger"
                        @click.stop="openWinnerPopover($event, scope.row)"
                      >
                        <div
                          v-if="recordPlayerCorrections[scope.row.key]"
                          class="correction-winner-display"
                        >
                          <div class="original-row" title="原始记录获得者">
                            <span class="correction-label">原始记录:</span>
                            <LootPlayerRoll
                              v-if="getOriginalRollInfo(scope.row)"
                              :roll="getOriginalRollInfo(scope.row)!"
                              :show-only-role="showOnlyRole"
                              :get-player-role="getPlayerRole"
                              class="original-display"
                            />
                            <PlayerDisplay
                              v-else
                              :name="scope.row.player"
                              :role="getPlayerRole(scope.row.player)"
                              :show-only-role="showOnlyRole"
                              class="original-display"
                            />
                          </div>
                          <div class="corrected-row">
                            <el-icon class="correction-arrow">
                              <BottomRight />
                            </el-icon>
                            <LootPlayerRoll
                              v-if="getWinnerRollInfo(scope.row)"
                              :roll="getWinnerRollInfo(scope.row)!"
                              is-winner
                              :show-only-role="showOnlyRole"
                              :get-player-role="getPlayerRole"
                            />
                          </div>
                        </div>
                        <template v-else>
                          <LootPlayerRoll
                            v-if="getWinnerRollInfo(scope.row)"
                            :roll="getWinnerRollInfo(scope.row)!"
                            is-winner
                            :show-only-role="showOnlyRole"
                            :get-player-role="getPlayerRole"
                          />
                          <div v-else class="no-winner">
                            未分配
                          </div>
                        </template>
                        <el-icon class="winner-edit-icon">
                          <Edit />
                        </el-icon>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="其他 Roll 点记录">
                    <template #default="scope">
                      <div class="col-rolls">
                        <LootPlayerRoll
                          v-for="roll in getOtherRolls(scope.row)"
                          :key="roll.player"
                          :roll="roll"
                          :show-only-role="showOnlyRole"
                          :get-player-role="getPlayerRole"
                        />
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="60" align="center">
                    <template #default="scope">
                      <el-popconfirm
                        title="确定永久删除吗？"
                        confirm-button-text="删除"
                        cancel-button-text="取消"
                        @confirm="deleteRecord(scope.row)"
                      >
                        <template #reference>
                          <el-button
                            type="danger"
                            :icon="Delete"
                            size="small"
                            circle
                            plain
                          />
                        </template>
                      </el-popconfirm>
                    </template>
                  </el-table-column>
                </el-table>

                <div class="pagination-box">
                  <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="50"
                    layout="total, prev, pager, next"
                    :total="filteredRecords.length"
                    small
                  />
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane name="summary" :disabled="!isRaidRolesComplete" lazy>
              <template #label>
                <el-tooltip
                  :disabled="isRaidRolesComplete"
                  :content="ROLE_SETTING_HINT"
                  placement="top"
                >
                  <span>按玩家</span>
                </el-tooltip>
              </template>
              <div class="tabs-sort-control">
                <LootSortSegmented v-model="summarySortMode" />
                <div class="v-divider-mini" />
                <LootDisplayFilterSegmented v-model="playerSummaryFilterMode" />
              </div>
              <div class="summary-grid has-sort-control">
                <div
                  v-for="player in sortedSummaryPlayers"
                  :key="player"
                  class="summary-card"
                >
                  <div class="summary-header">
                    <PlayerDisplay
                      :name="player"
                      :role="getPlayerRole(player)"
                      :show-only-role="showOnlyRole"
                    />
                  </div>
                  <div>
                    <div
                      v-for="item in getFilteredItemsInPlayerSummary(player)"
                      :key="item.name"
                      class="summary-item"
                      :class="{ 'is-not-obtained': item.count === 0 }"
                    >
                      <span class="s-name" :title="item.name">{{
                        item.name
                      }}</span>
                      <SummaryItemTags :item="item" />
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane name="slot" :disabled="!isRaidRolesComplete" lazy>
              <template #label>
                <el-tooltip
                  :disabled="isRaidRolesComplete"
                  :content="ROLE_SETTING_HINT"
                  placement="top"
                >
                  <span>按部位</span>
                </el-tooltip>
              </template>
              <div class="tabs-sort-control">
                <LootSortSegmented v-model="slotSortMode" />
                <div class="v-divider-mini" />
                <LootDisplayFilterSegmented v-model="slotSummaryFilterMode" />
              </div>
              <div class="summary-grid slot-grid has-sort-control">
                <div
                  v-for="slot in displaySlots"
                  :key="slot"
                  class="summary-card"
                >
                  <div class="summary-header">
                    {{ slot }}
                  </div>
                  <div>
                    <div
                      v-for="player in getSortedPlayersInSlot(
                        slotSummary[slot] || {},
                        slot,
                      )"
                      :key="player"
                      class="summary-item"
                      :class="{
                        'is-not-obtained':
                          (slotSummary[slot]?.[player] || 0) === 0,
                      }"
                    >
                      <PlayerDisplay
                        class="s-name"
                        :name="player"
                        :role="getPlayerRole(player)"
                        :show-only-role="showOnlyRole"
                      />
                      <div class="s-right-group">
                        <SummaryItemTags
                          :item="
                            getSlotItemTagInfo(
                              player,
                              slot,
                              slotSummary[slot]?.[player] || 0,
                            )
                          "
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane name="week" :disabled="!isRaidRolesComplete" lazy>
              <template #label>
                <el-tooltip
                  :disabled="isRaidRolesComplete"
                  :content="ROLE_SETTING_HINT"
                  placement="top"
                >
                  <span>按CD周</span>
                </el-tooltip>
              </template>
              <div class="tabs-sort-control">
                <LootSortSegmented v-model="weekSortMode" />
              </div>
              <div class="week-content-wrapper">
                <div
                  class="summary-grid has-sort-control"
                  :class="{ 'is-compact-role': showOnlyRole }"
                >
                  <div
                    v-for="week in sortedWeeks"
                    :key="week"
                    class="summary-card"
                    @contextmenu.prevent
                  >
                    <div class="summary-header">
                      {{ getRecordFormattedWeekLabel(week) }}
                    </div>
                    <div class="week-list-body">
                      <div
                        v-for="recordsGroup in [getSortedRecordsInWeek(week)]"
                        :key="recordsGroup.length + week"
                      >
                        <template
                          v-for="(rec, idx) in recordsGroup"
                          :key="rec.key"
                        >
                          <div
                            class="summary-item week-record-row"
                            :class="{
                              'is-corrected': recordWeekCorrections[rec.key],
                              'is-suspicious':
                                rawSuspiciousKeys.has(rec.key)
                                && !recordWeekCorrections[rec.key],
                            }"
                            @contextmenu.prevent="
                              handleRecordTrigger($event, rec)
                            "
                            @click.stop="handleRecordTrigger($event, rec)"
                            @mouseenter="handleWeekItemEnter($event, rec)"
                            @mouseleave="handleWeekItemLeave"
                          >
                            <div class="week-row-aside">
                              <PlayerDisplay
                                :name="rec.player"
                                :role="getPlayerRole(rec.player)"
                                :show-only-role="showOnlyRole"
                                name-class="week-player-name"
                              />
                            </div>
                            <div class="week-row-main">
                              <span class="week-item-name">{{
                                rec.item
                              }}</span>
                              <el-icon
                                v-if="
                                  rawSuspiciousKeys.has(rec.key)
                                    && !recordWeekCorrections[rec.key]
                                "
                                class="row-status-icon is-warning"
                              >
                                <Warning />
                              </el-icon>
                              <el-icon
                                v-if="recordWeekCorrections[rec.key]"
                                class="row-status-icon is-info"
                              >
                                <Timer />
                              </el-icon>
                            </div>
                          </div>
                          <div
                            v-if="shouldShowWeekDivider(recordsGroup, idx)"
                            class="week-list-divider"
                          />
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <el-tooltip
                v-model:visible="isSharedTooltipVisible"
                :virtual-ref="sharedTooltipRef"
                virtual-triggering
                placement="top"
                :content="weekTooltipContent"
                popper-class="week-suspicious-tooltip"
              />
            </el-tab-pane>

            <el-tab-pane name="chart" :disabled="!isRaidRolesComplete" lazy>
              <template #label>
                <el-tooltip
                  :disabled="isRaidRolesComplete"
                  :content="ROLE_SETTING_HINT"
                  placement="top"
                >
                  <span>图表分析</span>
                </el-tooltip>
              </template>
              <LootStatisticsPanel
                :records="normalizedRecords"
                :players="visibleAllPlayers"
                :get-actual-player="getActualPlayer"
                :get-player-role="getPlayerRole"
                :record-week-corrections="recordWeekCorrections"
                :sync-start-date="syncStartDate"
                :player-visibility="showOnlyRole ? 'role' : 'all'"
              />
            </el-tab-pane>

            <el-tab-pane name="bis" :disabled="!isRaidRolesComplete" lazy>
              <template #label>
                <el-tooltip
                  :disabled="isRaidRolesComplete"
                  :content="ROLE_SETTING_HINT"
                  placement="top"
                >
                  <div style="display: flex; align-items: center; gap: 4px">
                    <span>BIS分配</span>
                    <span
                      v-if="isRaidRolesComplete && !isBisConfigComplete"
                      class="dot-warn"
                      style="margin: 0"
                    />
                  </div>
                </el-tooltip>
              </template>
              <BisAllocator
                v-model="bisConfig"
                v-model:sort-mode="bisSortMode"
                :players="visibleAllPlayers"
                :records="normalizedRecords"
                :get-player-role="getPlayerRole"
                :get-actual-player="getActualPlayer"
                :show-only-role="showOnlyRole"
              />
            </el-tab-pane>
          </el-tabs>

          <!-- 筛选结果为空时的引导 -->
          <div v-else class="empty-placeholder">
            <div class="empty-icon">
              <el-icon><Search /></el-icon>
            </div>
            <div class="empty-title">
              未发现匹配记录
            </div>
            <p class="empty-desc">
              当前筛选条件过于严格，数据库中有数据但未能匹配。<br>
              请尝试<span class="empty-highlight">清除筛选条件</span>或调整时间范围。
            </p>
            <div class="empty-hint">
              <el-button type="info" plain @click="resetFilters">
                显示所有掉落
              </el-button>
            </div>
          </div>

          <!-- 共享的获得者变更 Popover -->
          <el-popover
            :visible="!!popoverTargetRecord"
            :virtual-ref="popoverTriggerRef"
            virtual-triggering
            :persistent="false"
            :hide-after="0"
            placement="bottom"
            :width="240"
            popper-class="winner-change-popper"
          >
            <div v-if="popoverTargetRecord" class="winner-change-popover">
              <div class="popover-header">
                <div class="popover-title">
                  变更获得者
                </div>
                <el-button
                  v-if="popoverOpenedWithCorrection[popoverTargetRecord.key]"
                  type="primary"
                  link
                  size="small"
                  class="restore-btn"
                  @click="handleWinnerChange(popoverTargetRecord, popoverTargetRecord.player)"
                >
                  恢复原始记录
                </el-button>
              </div>
              <div class="popover-desc">
                将掉落记录手动转移至其他玩家名下
              </div>
              <ElSelect
                :model-value="getRecordPlayer(popoverTargetRecord)"
                placeholder="选择新获得者"
                filterable
                size="small"
                class="winner-select-bar"
                @change="(val: string) => handleWinnerChange(popoverTargetRecord!, val)"
              >
                <ElOption
                  v-for="p in visibleAllPlayers"
                  :key="p"
                  :label="(showOnlyRole && getPlayerRole(p)) || p"
                  :value="p"
                >
                  <div class="select-player-row">
                    <PlayerDisplay
                      :name="p"
                      :role="getPlayerRole(p)"
                      :show-only-role="showOnlyRole"
                    />
                  </div>
                </ElOption>
              </ElSelect>
            </div>
          </el-popover>

          <el-popover
            v-model:visible="isMenuVisible"
            :virtual-ref="contextMenuRef"
            virtual-triggering
            :persistent="false"
            :hide-after="0"
            popper-class="context-menu-popper"
            :width="180"
            :show-arrow="false"
            placement="bottom-start"
          >
            <div v-if="contextMenuRecord" class="custom-context-menu">
              <div class="menu-info-header">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatTime(contextMenuRecord.timestamp!) }}</span>
              </div>
              <div class="menu-divider" />
              <div class="menu-action-item" @click="handleCorrectionClick">
                <el-icon class="action-arrow">
                  <component
                    :is="
                      recordWeekCorrections[contextMenuRecord.key]
                        ? RefreshLeft
                        : RefreshRight
                    "
                  />
                </el-icon>
                <span class="action-label">
                  {{
                    recordWeekCorrections[contextMenuRecord.key]
                      ? '归回原始周'
                      : '归入上一周'
                  }}
                </span>
              </div>
            </div>
          </el-popover>
        </div>
      </main>

      <!-- 数据库完全为空时的引导 -->
      <div v-else class="empty-container">
        <!-- 核心引导流程：步进式 -->
        <div class="empty-placeholder compact-guide">
          <!-- 状态 1: 未设置目录 -->
          <template v-if="!currentHandle">
            <div class="empty-guide-main" style="position: relative">
              <div
                v-if="isDragOverWindow"
                class="setup-drag-zone"
                :class="{ 'is-active': isDragOverZone }"
                @drop.stop.prevent="handleZoneDrop"
                @dragover.prevent
                @dragenter="isDragOverZone = true"
                @dragleave="isDragOverZone = false"
              >
                <el-icon class="guide-icon">
                  <UploadFilled />
                </el-icon>
                <span>释放文件以导入备份</span>
              </div>
              <div class="empty-info-side">
                <div class="empty-title">
                  欢迎使用 Loot History
                </div>
                <p class="empty-desc">
                  选择你的<span class="empty-highlight">FFXIV 日志文件夹</span>，开始记录掉落。
                </p>
                <div class="empty-hint">
                  <el-button type="primary" size="large" @click="setLogPath">
                    选择日志目录
                  </el-button>
                  <el-button
                    type="info"
                    plain
                    size="large"
                    @click="importInputRef?.click()"
                  >
                    导入备份数据
                  </el-button>
                </div>
              </div>
              <div class="guide-img-box">
                <img
                  src="@/assets/screenshots/lootHistoryGuide.jpg"
                  alt="Guide"
                  class="guide-img"
                >
              </div>
            </div>
          </template>

          <!-- 状态 2: 已设置目录，配置时间范围 -->
          <template v-else-if="showTimeSetup">
            <div class="empty-title">
              设置同步范围
            </div>
            <p class="empty-desc">
              已关联目录：<span class="empty-highlight">{{
                currentHandle.name
              }}</span><br>
              请指定你想要同步的历史记录起始时间。
            </p>
            <div class="setup-form">
              <div class="setup-row">
                <span class="setup-label">起始时间:</span>
                <el-date-picker
                  v-model="syncStartDate"
                  type="datetime"
                  placeholder="起始时间"
                  format="YYYY/MM/DD HH:mm"
                  value-format="YYYY-MM-DDTHH:mm"
                  :clearable="false"
                />
              </div>
              <div class="setup-row">
                <span class="setup-label">截止时间:</span>
                <el-date-picker
                  v-model="syncEndDate"
                  type="datetime"
                  placeholder="现在 (可选)"
                  format="YYYY/MM/DD HH:mm"
                  value-format="YYYY-MM-DDTHH:mm"
                />
              </div>
            </div>
            <div class="empty-hint" style="margin-top: 24px">
              <el-button plain size="large" @click="currentHandle = null">
                返回重选
              </el-button>
              <el-button type="primary" size="large" @click="startInitialSync">
                开始解析并导入
              </el-button>
            </div>
          </template>

          <!-- 状态 3: 已设置目录，但数据库依然为空 (可能正在同步或同步结果为空) -->
          <template v-else>
            <div
              class="ready-state-container"
              style="
                position: relative;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
              "
            >
              <div
                v-if="isDragOverWindow"
                class="setup-drag-zone"
                :class="{ 'is-active': isDragOverZone }"
                @drop.stop.prevent="handleZoneDrop"
                @dragover.prevent
                @dragenter="isDragOverZone = true"
                @dragleave="isDragOverZone = false"
              >
                <el-icon class="guide-icon">
                  <UploadFilled />
                </el-icon>
                <span>释放文件以导入备份</span>
              </div>

              <div class="empty-title">
                {{ isSyncing ? '正在同步数据' : '准备就绪' }}
              </div>
              <p class="empty-desc">
                {{
                  isSyncing
                    ? '正在处理日志文件，请稍候。'
                    : '数据库当前为空。你可以开始解析数据，或从备份文件恢复。'
                }}
              </p>
              <div class="empty-hint">
                <el-button
                  v-if="!isSyncing"
                  type="primary"
                  size="large"
                  @click="syncLogFiles(true)"
                >
                  开始解析数据
                </el-button>
                <el-button
                  v-if="!isSyncing"
                  plain
                  size="large"
                  @click="importInputRef?.click()"
                >
                  导入备份数据
                </el-button>
                <el-button
                  v-if="!isSyncing"
                  plain
                  size="large"
                  @click="showTimeSetup = true"
                >
                  调整时间范围
                </el-button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <ElDialog
        v-model="showExportDialog"
        title="选择导出内容"
        width="360px"
        append-to-body
        destroy-on-close
      >
        <div v-if="showExportDialog" class="export-selection-list">
          <ElCheckbox v-model="exportForm.loot">
            {{ LABELS.LOOT }} ({{ lootRecords.length }})
          </ElCheckbox>
          <ElCheckbox v-model="exportForm.roles">
            {{
              LABELS.ROLES
            }}
          </ElCheckbox>
          <ElCheckbox v-model="exportForm.bis">
            {{ LABELS.BIS }}
          </ElCheckbox>
          <ElCheckbox v-model="exportForm.mapping">
            {{
              LABELS.MAPPING
            }}
          </ElCheckbox>
          <ElCheckbox v-model="exportForm.weekCorrection">
            {{
              LABELS.WEEK_CORRECTION
            }}
          </ElCheckbox>
          <ElCheckbox v-model="exportForm.playerCorrection">
            {{
              LABELS.PLAYER_CORRECTION
            }}
          </ElCheckbox>
          <ElCheckbox v-model="exportForm.settings">
            {{
              LABELS.SETTINGS
            }}
          </ElCheckbox>
        </div>
        <template v-if="showExportDialog" #footer>
          <span class="dialog-footer">
            <el-button @click="showExportDialog = false">取消</el-button>
            <el-button type="primary" @click="confirmExport">立即导出</el-button>
          </span>
        </template>
      </ElDialog>

      <ElDialog
        v-model="showImportConfirmDialog"
        title="选择导入内容"
        width="400px"
        append-to-body
        destroy-on-close
      >
        <div v-if="showImportConfirmDialog && importDataPending" class="import-preview-box">
          <p class="import-hint-text">
            发现备份文件，请选择要导入的部分：
          </p>
          <div class="import-selection-list">
            <ElCheckbox
              v-model="importForm.loot"
              :disabled="!importDataPending.r?.length"
            >
              {{ LABELS.LOOT }} ({{ importDataPending.r?.length || 0 }} 条)
              <span
                v-if="!importDataPending.r?.length"
                class="import-not-found-hint"
              >- 备份文件中未发现记录</span>
              <span v-else-if="!importDiffs.loot" class="import-identical-hint">(与现有记录一致)</span>
            </ElCheckbox>
            <ElCheckbox
              v-model="importForm.bis"
              :disabled="
                !importDataPending.bisConfig
                  && !importDataPending.c?.bisConfig
                  && !importDataPending.c?.bis
              "
            >
              {{ LABELS.BIS }}
              <span
                v-if="
                  !importDataPending.bisConfig
                    && !importDataPending.c?.bisConfig
                    && !importDataPending.c?.bis
                "
                class="import-not-found-hint"
              >- 备份文件中未发现数据</span>
              <span v-else-if="!importDiffs.bis" class="import-identical-hint">(与现有配置一致)</span>
            </ElCheckbox>
            <ElCheckbox
              v-model="importForm.roles"
              :disabled="!importDataPending.c?.roles"
            >
              {{ LABELS.ROLES }}
              <span
                v-if="!importDataPending.c?.roles"
                class="import-not-found-hint"
              >- 备份文件中未发现数据</span>
              <span v-else-if="!importDiffs.roles" class="import-identical-hint">(与现有设置一致)</span>
            </ElCheckbox>
            <ElCheckbox
              v-model="importForm.mapping"
              :disabled="!importDataPending.c?.map"
            >
              {{ LABELS.MAPPING }}
              <span
                v-if="!importDataPending.c?.map"
                class="import-not-found-hint"
              >- 备份文件中未发现数据</span>
              <span
                v-else-if="!importDiffs.mapping"
                class="import-identical-hint"
              >(与现有设置一致)</span>
            </ElCheckbox>
            <ElCheckbox
              v-model="importForm.weekCorrection"
              :disabled="!importDataPending.c?.weekCorrections"
            >
              {{ LABELS.WEEK_CORRECTION }}
              <span
                v-if="!importDataPending.c?.weekCorrections"
                class="import-not-found-hint"
              >- 未发现数据</span>
              <span
                v-else-if="!importDiffs.weekCorrection"
                class="import-identical-hint"
              >(与现有设置一致)</span>
            </ElCheckbox>
            <ElCheckbox
              v-model="importForm.playerCorrection"
              :disabled="!importDataPending.c?.playerCorrections"
            >
              {{ LABELS.PLAYER_CORRECTION }}
              <span
                v-if="!importDataPending.c?.playerCorrections"
                class="import-not-found-hint"
              >- 未发现数据</span>
              <span
                v-else-if="!importDiffs.playerCorrection"
                class="import-identical-hint"
              >(与现有设置一致)</span>
            </ElCheckbox>
            <ElCheckbox
              v-model="importForm.settings"
              :disabled="
                !importDataPending.c?.filter
                  && importDataPending.c?.raidActive === undefined
              "
            >
              {{ LABELS.SETTINGS }}
              <span
                v-if="
                  !importDataPending.c?.filter
                    && importDataPending.c?.raidActive === undefined
                "
                class="import-not-found-hint"
              >- 未发现数据</span>
              <span
                v-else-if="!importDiffs.settings"
                class="import-identical-hint"
              >(与现有设置一致)</span>
            </ElCheckbox>
          </div>
          <div
            v-if="
              (importForm.bis && importDiffs.bis)
                || (importForm.roles && importDiffs.roles)
                || (importForm.mapping && importDiffs.mapping)
                || (importForm.weekCorrection && importDiffs.weekCorrection)
                || (importForm.playerCorrection && importDiffs.playerCorrection)
                || (importForm.settings && importDiffs.settings)
            "
            class="import-warning-info"
          >
            <el-icon><Warning /></el-icon>
            <span>所选配置项导入后将覆盖当前设置</span>
          </div>
          <div
            v-else-if="
              (importForm.bis
                || importForm.roles
                || importForm.mapping
                || importForm.weekCorrection
                || importForm.playerCorrection
                || importForm.settings)
                && !importDiffs.bis
                && !importDiffs.roles
                && !importDiffs.mapping
                && !importDiffs.weekCorrection
                && !importDiffs.playerCorrection
                && !importDiffs.settings
            "
            class="import-success-info"
          >
            <el-icon><CircleCheckFilled /></el-icon>
            <span>所选配置项已与本地同步，无需重复导入</span>
          </div>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showImportConfirmDialog = false">取消</el-button>
            <el-button type="primary" @click="confirmImport">确认导入</el-button>
          </span>
        </template>
      </ElDialog>

      <ElDialog
        v-model="showClearDialog"
        title="清空数据选项"
        width="400px"
        append-to-body
        destroy-on-close
      >
        <div v-if="showClearDialog" class="clear-selection-list">
          <div class="clear-selection-header">
            <p class="clear-warning-text">
              请选择要彻底删除的数据项：
            </p>
            <div class="clear-quick-actions">
              <el-button
                link
                type="primary"
                size="small"
                @click="
                  clearForm = {
                    loot: true,
                    bis: true,
                    roles: true,
                    mapping: true,
                    weekCorrection: true,
                    playerCorrection: true,
                    settings: true,
                  }
                "
              >
                全选
              </el-button>
              <el-button
                link
                size="small"
                @click="
                  clearForm = {
                    loot: !clearForm.loot,
                    bis: !clearForm.bis,
                    roles: !clearForm.roles,
                    mapping: !clearForm.mapping,
                    weekCorrection: !clearForm.weekCorrection,
                    playerCorrection: !clearForm.playerCorrection,
                    settings: !clearForm.settings,
                  }
                "
              >
                反选
              </el-button>
            </div>
          </div>
          <ElCheckbox v-model="clearForm.loot">
            {{ LABELS.LOOT }} ({{ lootRecords.length }})
          </ElCheckbox>
          <ElCheckbox v-model="clearForm.roles">
            {{
              LABELS.ROLES
            }}
          </ElCheckbox>
          <ElCheckbox v-model="clearForm.bis">
            {{ LABELS.BIS }}
          </ElCheckbox>
          <ElCheckbox v-model="clearForm.mapping">
            {{
              LABELS.MAPPING
            }}
          </ElCheckbox>
          <ElCheckbox v-model="clearForm.weekCorrection">
            {{
              LABELS.WEEK_CORRECTION
            }}
          </ElCheckbox>
          <ElCheckbox v-model="clearForm.playerCorrection">
            {{
              LABELS.PLAYER_CORRECTION
            }}
          </ElCheckbox>
          <ElCheckbox v-model="clearForm.settings">
            {{ LABELS.SETTINGS }} (重置)
          </ElCheckbox>
        </div>
        <div class="clear-danger-hint">
          <el-icon><Warning /></el-icon>
          <span>选中的数据将被永久删除，无法撤销。</span>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showClearDialog = false">取消</el-button>
            <el-button type="danger" @click="confirmClear">确定清空</el-button>
          </span>
        </template>
      </ElDialog>
      <ElDialog
        v-model="showManualAddDialog"
        title="手动添加记录"
        width="400px"
        append-to-body
        destroy-on-close
      >
        <ElForm v-if="showManualAddDialog" label-width="80px">
          <ElFormItem label="时间">
            <el-date-picker
              v-model="manualForm.timestamp"
              type="datetime"
              placeholder="选择获得时间"
              style="width: 100%"
            />
          </ElFormItem>
          <ElFormItem label="物品">
            <ElAutocomplete
              v-model="manualForm.item"
              :fetch-suggestions="querySearchItems"
              placeholder="请输入物品名称"
              style="width: 100%"
            />
          </ElFormItem>
          <ElFormItem label="获得者">
            <ElAutocomplete
              v-model="manualForm.player"
              :fetch-suggestions="querySearchPlayers"
              placeholder="请输入玩家名称"
              style="width: 100%"
            />
          </ElFormItem>
        </ElForm>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showManualAddDialog = false">取消</el-button>
            <el-button type="primary" @click="submitManualRecord">确定添加</el-button>
          </span>
        </template>
      </ElDialog>

      <ElDialog
        v-model="showCustomCorrectionDialog"
        title="自定义修正管理"
        width="850px"
        append-to-body
        destroy-on-close
        class="premium-correction-dialog"
      >
        <div v-if="showCustomCorrectionDialog" class="premium-correction-layout">
          <div class="correction-sidebar">
            <div
              class="nav-item"
              :class="{ active: activeCorrectionTab === 'player' }"
              @click="activeCorrectionTab = 'player'"
            >
              <div class="nav-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="nav-content">
                <div class="nav-title">
                  获得者修正
                </div>
                <div class="nav-status">
                  {{ filteredPlayerCorrections.length }} 个条目
                </div>
              </div>
            </div>
            <div
              class="nav-item"
              :class="{ active: activeCorrectionTab === 'week' }"
              @click="activeCorrectionTab = 'week'"
            >
              <div class="nav-icon">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="nav-content">
                <div class="nav-title">
                  CD周数修正
                </div>
                <div class="nav-status">
                  {{ filteredWeekCorrections.length }} 个条目
                </div>
              </div>
            </div>

            <div class="sidebar-footer">
              <el-input
                v-model="correctionSearch"
                placeholder="搜索内容..."
                prefix-icon="Search"
                size="small"
                clearable
              />
            </div>
          </div>

          <div class="correction-main">
            <div class="main-header">
              <h3>
                {{ activeCorrectionTab === 'player' ? '获得者修正管理' : 'CD周数修正管理' }}
              </h3>
              <p>可以撤销手动进行的改动，恢复最原始的系统记录。</p>
            </div>

            <div class="correction-grid-wrapper scroll-thin">
              <div
                v-for="item in (activeCorrectionTab === 'player' ? filteredPlayerCorrections : filteredWeekCorrections)"
                :key="item.key"
                class="correction-card-compact"
              >
                <div class="card-main-row">
                  <div class="item-primary-info">
                    <div class="item-name" :title="item.itemName">
                      {{ item.itemName }}
                    </div>
                    <div class="item-time">
                      {{ formatTime(item.record.timestamp) }}
                    </div>
                  </div>

                  <div class="card-comparison-inline">
                    <div class="comp-box old">
                      <div class="value">
                        <template v-if="activeCorrectionTab === 'player'">
                          <PlayerDisplay :name="item.oldVal" :role="getPlayerRole(item.oldVal)" :show-only-role="false" />
                        </template>
                        <template v-else>
                          <span class="week-text">{{ item.oldVal }}</span>
                        </template>
                      </div>
                    </div>

                    <div class="comp-arrow">
                      <el-icon><Right /></el-icon>
                    </div>

                    <div class="comp-box new">
                      <div class="value">
                        <template v-if="activeCorrectionTab === 'player'">
                          <PlayerDisplay :name="item.newVal" :role="getPlayerRole(item.newVal)" :show-only-role="false" />
                        </template>
                        <template v-else>
                          <span class="week-text">{{ item.newVal }}</span>
                        </template>
                      </div>
                    </div>
                  </div>

                  <div class="card-actions">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="restoreCorrection(item)"
                    >
                      <el-icon><RefreshLeft /></el-icon>
                      还原
                    </el-button>
                  </div>
                </div>
              </div>

              <div
                v-if="(activeCorrectionTab === 'player' ? filteredPlayerCorrections : filteredWeekCorrections).length === 0"
                class="premium-empty"
              >
                <el-icon class="empty-icon">
                  <CircleCheckFilled />
                </el-icon>
                <p>暂无符合条件的修正项</p>
              </div>
            </div>
          </div>
        </div>
      </ElDialog>
    </template>

    <input
      ref="importInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleImportFile"
    >
  </div>
</template>

<style lang="scss">
:root {
  --ffxiv-stripe-color: rgba(0, 0, 0, 0.08);
  --ffxiv-diagonal-texture: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 12px,
    var(--ffxiv-stripe-color) 12px,
    var(--ffxiv-stripe-color) 24px
  );
}

html,
body,
#app {
  height: 100%;
  width: 100%;
  overflow: hidden !important;
  background-color: #f8fafc !important;
  color-scheme: light;
  margin: 0;
  padding: 0 !important;
}

html.dark,
html.dark body {
  background-color: #0f172a !important;
  color-scheme: dark;
  --ffxiv-stripe-color: rgba(255, 255, 255, 0.08);
}

::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  background-clip: padding-box;
  border-radius: 5px;
}
html.dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

.ffxiv-diagonal-bg {
  background-image: var(--ffxiv-diagonal-texture);
}

.ffxiv-diagonal-mask {
  position: relative !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  -webkit-user-drag: none !important;
  -webkit-touch-callout: none !important;
  cursor: not-allowed !important;

  &::after {
    content: '' !important;
    position: absolute !important;
    inset: 0 !important;
    z-index: var(--ffxiv-mask-z, 9999) !important;
    background: var(--ffxiv-mask-bg, transparent) !important;
    background-image: var(--ffxiv-diagonal-texture) !important;
    pointer-events: auto !important;
    cursor: not-allowed !important;
  }

  * {
    pointer-events: none !important;
    user-select: none !important;
    -webkit-user-drag: none !important;
    -webkit-user-select: none !important;
  }
}

.section-mask {
  position: absolute;
  inset: 0;
  z-index: 100;
  cursor: not-allowed !important;
  user-select: none !important;
  -webkit-user-drag: none !important;
  pointer-events: auto !important;
  --mask-overlay: linear-gradient(
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.4)
  );

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
    background: var(--mask-overlay);
    background-image: var(--ffxiv-diagonal-texture);
  }
}

html.dark .section-mask {
  --mask-overlay: linear-gradient(
    rgba(22, 24, 35, 0.8),
    rgba(22, 24, 35, 0.95)
  );
}

.path-toolbar {
  .date-picker-el,
  .range-sep {
    transform: translateY(-1.5px) !important;
  }
}

.theme-toggle-fixed {
  position: fixed;
  top: 10px;
  right: 12px;
  z-index: 10000;
}

.guide-popover-popper,
.role-settings-popper {
  padding: 0 !important;
}
</style>

<style lang="scss" scoped>
.app-container {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  background-color: #f8fafc;
  font-family:
    'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  color: #1e293b;
  display: flex;
  flex-direction: column;
}

.is-onboarding {
  max-height: 100vh;
  overflow: hidden;
}

.app-header {
  height: 48px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  padding: 0 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}
.brand-container {
  width: 100%;
  max-width: 1400px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand h1 {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}
.version-tag {
  background: #eff6ff;
  color: #3b82f6;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  border: 1px solid #dbeafe;
}

.path-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  flex-shrink: 0;
  height: 32px;
  box-sizing: border-box;
}
.tool-btn {
  height: 28px !important;
  padding: 0 8px !important;
  border: none !important;
  background: transparent !important;
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.tool-btn :deep(i) {
  font-size: 14px;
}
.tool-btn:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08) !important;
}
.tool-btn.el-button--danger:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.05) !important;
}
.v-divider {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
  margin: 0 4px;
}
.op-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 4px;
  font-weight: normal;
}
.path-toolbar :deep(.el-button) {
  height: 28px !important;
  margin: 0 !important;
  padding: 0 10px !important;
  font-weight: 600;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 0 !important;
}
.path-toolbar :deep(.el-input__wrapper) {
  height: 28px !important;
  background: #f8fafc;
  box-shadow: 0 0 0 1px #e2e8f0 inset !important;
  padding: 0 8px !important;
  box-sizing: border-box !important;
  display: flex;
  align-items: center;
}
.path-toolbar :deep(.el-input__wrapper):hover {
  box-shadow: 0 0 0 1px #cbd5e1 inset !important;
  background: #f1f5f9;
}
.path-toolbar :deep(.el-input__wrapper).is-focus {
  box-shadow:
    0 0 0 1px #3b82f6 inset,
    0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  background: white;
}
.path-toolbar :deep(.el-input__inner) {
  font-size: 12px;
  color: #1e293b;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  padding: 0 !important;
  padding-left: 24px !important;
  height: 28px !important;
  line-height: 28px !important;
  border: none !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  white-space: nowrap;
}
.header-right :deep(.el-switch__label) {
  white-space: nowrap;
}

.control-bar {
  margin: 0 auto 12px;
  width: calc(100% - 48px);
  max-width: 1400px;
  padding: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.filter-panel {
  width: calc(100% - 48px);
  max-width: 1400px;
  margin: 0 auto 12px;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.sec-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  padding: 8px 8px;
  background: white;
  border-bottom: 1px solid #f1f5f9;
}

.loading-txt {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.loading-sub-txt {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
  width: 240px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

html.dark .loading-sub-txt {
  color: rgba(255, 255, 255, 0.4);
}

.sec-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.title-main {
  font-size: 14px;
  color: #1e293b;
}

.hint-small {
  font-size: 10px;
  color: #94a3b8;
  font-weight: normal;
}

.hint-action {
  font-size: 11px;
  color: #64748b;
  font-weight: normal;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.header-sep {
  width: 1px;
  height: 14px;
  background-color: #cbd5e1;
  margin: 0 4px;
}

.switch-box {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}
.switch-label {
  font-size: 12px;
  font-weight: normal;
  color: #475569;
}

.sec-header .acts {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.act-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.act-divider {
  width: 1px;
  height: 16px;
  background: #e2e8f0;
}

.soft-action-btn {
  background-color: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  color: #64748b !important;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.soft-action-btn .el-icon {
  font-size: 14px;
}

.el-button.soft-action-btn {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.soft-action-btn .el-icon {
  font-size: 14px;
}

.el-button.soft-action-btn:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.el-button.soft-action-btn:active {
  background-color: #e2e8f0;
}

.el-button.soft-action-btn.primary {
  font-weight: 600;
  color: #334155;
}

.help-link {
  color: #94a3b8 !important;
  font-weight: normal !important;
}
.help-link:hover {
  color: #3b82f6 !important;
}

.sec-body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 8px;
  max-height: 160px;
  overflow-y: auto;
  align-content: flex-start;
  background: #fdfdfd;
  position: relative;
}

.mask-content {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  padding: 10px 20px;
  border-radius: 24px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.05),
    0 4px 6px -2px rgba(0, 0, 0, 0.02),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.8);
  animation: premium-float 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes premium-float {
  from {
    transform: translateY(12px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
.mini-tag-el {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}
.el-check-tag.player-tag {
  height: 24px;
  line-height: 22px;
  padding: 0 8px;
  font-size: 12px;
}
.el-check-tag.player-tag.readonly-tag {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}
.el-check-tag.player-tag.readonly-tag:hover {
  background-color: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-regular);
  transform: none;
}
.el-check-tag.player-tag.readonly-tag.is-checked {
  opacity: 1;
}
.el-check-tag.player-tag.readonly-tag.is-checked:hover {
  background-color: var(--el-color-primary);
  color: white;
  transform: none;
}
.el-check-tag.item-tag {
  height: 22px;
  line-height: 20px;
  padding: 0 4px;
  font-size: 11px;
}
.el-check-tag.item-tag.readonly-tag {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}
.el-check-tag.item-tag.readonly-tag:hover {
  background-color: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-regular);
  transform: none;
}
.el-check-tag.item-tag.readonly-tag.is-checked {
  opacity: 1;
}
.el-check-tag.item-tag.readonly-tag.is-checked:hover {
  background-color: var(--el-color-primary);
  color: white;
  transform: none;
}
.popover-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 320px;
  max-width: 100%;
  box-sizing: border-box;
}

.merge-selector-box {
  width: 100%;
}

.selector-title {
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '';
    width: 3px;
    height: 14px;
    background: #3b82f6;
    border-radius: 2px;
  }
}

.procedure-steps-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f8fafc;
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;

  .step-dot {
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0.4;
    transition: all 0.2s;

    &.is-active {
      opacity: 1;
      font-weight: bold;
    }

    .step-num {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #cbd5e1;
      color: white;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-label {
      font-size: 12px;
    }

    &.hide.is-active .step-num {
      background: #ef4444;
    }
    &.show.is-active .step-num {
      background: #3b82f6;
    }
  }

  .step-arrow {
    color: #cbd5e1;
    font-size: 12px;
  }
}

.merge-guide-desc {
  font-size: 11px;
  line-height: 1.5;
  color: #64748b;
  padding: 10px 12px;
  background: #f0f9ff;
  border-radius: 10px;
  border: 1px solid #e0f2fe;
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;

  .el-icon {
    font-size: 14px;
    color: #3b82f6;
    margin-top: 1px;
    flex-shrink: 0;
  }

  .guide-content {
    flex: 1;
    strong {
      color: #0369a1;
      font-weight: 800;
    }
    p {
      margin: 0;
      &:first-child {
        margin-bottom: 4px;
      }
    }
  }
}

.selector-tags {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 2px;
  margin-bottom: 12px;
}

.merge-check-tag {
  height: 36px !important;
  min-height: 36px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 8px !important;
  margin: 0 !important;
  background: white !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
  transition: all 0.2s !important;
  cursor: pointer;
  position: relative;

  &:hover {
    border-color: #3b82f6 !important;
    background: #f8fbff !important;
  }

  &.is-checked {
    &.is-hiding {
      background: #fee2e2 !important;
      border-color: #ef4444 !important;
    }
    &.is-showing {
      background: #dbeafe !important;
      border-color: #3b82f6 !important;
    }
  }

  .tag-label-name {
    transform: scale(0.9);
  }

  .selection-badge {
    position: absolute;
    top: -1px;
    right: -1px;
    padding: 1px 4px;
    border-radius: 0 6px 0 6px;
    font-size: 8px;
    font-weight: 800;
    color: white;
    z-index: 10;

    span {
      display: none;
    } /* 这么窄的地方就不写字了 */

    &.hide {
      background: #ef4444;
    }
    &.show {
      background: #3b82f6;
    }
  }
}

@keyframes slideInDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.confirm-merge-btn-new {
  width: 100%;
  height: 36px !important;
  border-radius: 10px !important;
  font-weight: 800 !important;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.mapping-box {
  border-top: 1px dashed #e2e8f0;
  padding-top: 16px;
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mapping-item-row {
  display: flex;
  align-items: center;
  background: white;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    border-color: #cbd5e1;
  }

  .map-from,
  .map-to {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;

    .map-tag-hint {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 4px;
      padding: 1px 4px;
      border-radius: 4px;
      width: fit-content;
    }
  }

  .map-from .map-tag-hint {
    background: #fee2e2;
    color: #ef4444;
  }
  .map-to .map-tag-hint {
    background: #dbeafe;
    color: #3b82f6;
  }

  .map-arrow {
    color: #cbd5e1;
    font-size: 16px;
  }

  .map-remove {
    margin-left: 2px;
    opacity: 0.4;
    &:hover {
      opacity: 1;
    }
  }
}

.selector-tags::-webkit-scrollbar {
  width: 4px;
}
.selector-tags::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.selector-tags :deep(.mini-tag-el) {
  margin: 0 !important;
  display: inline-flex !important;
  justify-content: center;
  align-items: center;
  width: 100% !important;
  height: 24px;
  padding: 0 4px;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
}
.selector-tags :deep(.el-check-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.mapping-item-row {
  display: flex;
  align-items: center;
  background: #f8fafc;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  gap: 6px;

  .map-from,
  .map-to {
    flex: 1;
    display: flex;
    flex-direction: column;
    font-size: 12px;
    font-weight: 600;
    color: #1e293b;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .map-tag-hint {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    opacity: 0.6;
    line-height: 1;
    margin-bottom: 2px;
  }

  .map-arrow {
    color: #94a3b8;
    font-size: 14px;
    flex-shrink: 0;
  }

  .map-remove {
    flex-shrink: 0;
    padding: 2px !important;
    height: auto !important;
    &:hover {
      color: #ef4444;
    }
  }
}

html.dark {
  .procedure-steps-compact {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    .step-dot .step-num {
      background: rgba(255, 255, 255, 0.1);
    }
    .step-dot.hide.is-active .step-num {
      background: #ef4444;
    }
    .step-dot.show.is-active .step-num {
      background: #3b82f6;
    }
  }

  .merge-guide-desc {
    background: rgba(59, 130, 246, 0.05);
    border-color: rgba(59, 130, 246, 0.1);
    color: rgba(255, 255, 255, 0.5);
    .guide-content strong {
      color: #7dd3fc;
    }
    .el-icon {
      color: #60a5fa;
    }
  }

  .merge-check-tag {
    background: rgba(255, 255, 255, 0.03) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;

    &:hover {
      border-color: #3b82f6 !important;
    }

    &.is-checked {
      &.is-hiding {
        border-color: #ef4444 !important;
        background: rgba(239, 68, 68, 0.1) !important;
      }
      &.is-showing {
        border-color: #3b82f6 !important;
        background: rgba(59, 130, 246, 0.1) !important;
      }
    }
  }

  .mapping-box {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .mapping-item-row {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
    .map-from,
    .map-to {
      color: rgba(255, 255, 255, 0.9);
    }
  }
}
.role-config-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.role-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: bold;
}
.role-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.role-label {
  width: 30px;
  font-weight: bold;
  font-size: 12px;
  text-align: right;
}
.confirm-merge-btn {
  width: 100%;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid var(--border-light);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  z-index: 9999;
  padding: 4px 0;
  min-width: 130px;
}
.context-menu-header {
  padding: 8px 16px;
  font-size: 11px;
  background: #f8fafc;
  color: #64748b;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 4px;
}
.context-menu-item {
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  color: #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.context-menu-item:hover {
  background: #f1f5f9;
  color: var(--primary-color);
}
.context-menu-item.current-role {
  background-color: #eff6ff;
  color: var(--primary-color);
  font-weight: bold;
}
.context-menu-item.current-role:hover {
  background-color: #dbeafe;
}
.context-menu-item.danger {
  color: #ef4444;
}
.context-menu-item.danger:hover {
  background: #fef2f2;
}
.divider {
  height: 1px;
  background: var(--border-light);
  margin: 4px 0;
}
.check-mark {
  font-size: 10px;
}

.suggestion-box {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 10px;
}
.suggest-title {
  font-size: 10px;
  color: #b45309;
  font-weight: 800;
  margin-bottom: 6px;
}
.suggest-item {
  font-size: 11px;
  color: #92400e;
  padding: 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}
.suggest-item:hover {
  background: #fef3c7;
}
.suggest-item b {
  color: #d97706;
}

.mapping-list {
  margin-top: 8px;
  border-top: 1px solid var(--border-light);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
}
.mapping-list-title {
  font-size: 10px;
  font-weight: 800;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}
.mapping-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  font-size: 11px;
  color: var(--text-secondary);
}
.mapping-tag span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-container-el {
  width: 100%;
  margin: 0;
  background: white;
  border-radius: 0 0 12px 12px;
  border-top: none;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}
:deep(.loot-cell) {
  padding: 4px 0 !important;
}
:deep(.el-table__header) {
  margin: 0 !important;
}
:deep(.el-table__row) {
  transition: background-color 0.2s;
}

.col-time {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.time-date {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
}

.col-week {
  font-size: 11px;
  color: #64748b;
  font-weight: 800;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.col-item {
  padding-right: 16px;
  overflow: hidden;
}
.item-text {
  font-weight: 800;
  font-size: 11px;
  color: #334155;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
  overflow: hidden;
}

.type-direct {
  color: #64748b;
}
.winner-badge.badge-direct {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #475569;
}
.winner-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.winner-val {
  background: rgba(0, 0, 0, 0.05);
  padding: 0 4px;
  border-radius: 4px;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
}
.no-winner {
  color: #cbd5e1;
  font-style: italic;
  font-size: 11px;
  padding: 0 4px;
}
.week-list-body {
  padding: 4px 0;
}

.week-list-divider {
  height: 1px;
  border-top: 1px dashed #e2e8f0;
  margin: 4px 12px;
}

.week-record-row {
  margin: 0 !important;
  padding: 6px 12px !important;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex !important;
  align-items: center;
  justify-content: space-between;
}

.week-record-row:last-child {
  border-bottom: none;
}

.week-record-row:hover {
  background-color: #f8fafc;
}

.week-row-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.week-item-name {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-row-aside {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-right: 12px;
  width: 105px;
  justify-content: flex-start;
  transition: width 0.2s ease;
}

.is-compact-role .week-row-aside {
  width: 32px;
}

.week-player-name {
  font-size: 12px;
  color: #475569;
  font-weight: 600;
}

.week-record-row.is-suspicious {
  background-color: #fff7ed;
}
.week-record-row.is-suspicious:hover {
  background-color: #ffedd5;
}
.week-record-row.is-suspicious .week-item-name {
  color: #c2410c;
  font-weight: 700;
}

.week-record-row.is-corrected {
  background-color: #eff6ff;
}
.week-record-row.is-corrected:hover {
  background-color: #dbeafe;
}
.week-record-row.is-corrected .week-item-name {
  color: #1e40af;
  font-weight: 700;
}

.row-status-icon {
  font-size: 14px;
}
.row-status-icon.is-warning {
  color: #f97316;
}
.row-status-icon.is-info {
  color: #3b82f6;
}
@keyframes suspicious-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(249, 115, 22, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
  }
}
.mini-item-tag:hover {
  border-color: #3b82f6;
  background-color: #f0f9ff;
  color: #3b82f6;
}

.mode-tabs-el :deep(.el-tab-pane) {
  background: white;
  border: 1px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-sizing: border-box;
}

.context-menu-popper {
  padding: 0 !important;
  border-radius: 12px !important;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(226, 232, 240, 0.8) !important;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.95) !important;
  overflow: hidden;
}

.custom-context-menu {
  display: flex;
  flex-direction: column;
}

.menu-info-header {
  padding: 10px 14px;
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
}

.menu-divider {
  height: 1px;
  background: #f1f5f9;
}

.menu-action-item {
  padding: 10px 14px;
  font-size: 13px;
  color: #1e293b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.2s ease;
  margin: 4px;
  border-radius: 8px;
  white-space: nowrap;
}

.action-arrow {
  color: #3b82f6;
  font-size: 16px !important;
  flex-shrink: 0;
}

.action-label {
  flex: 1;
}

.menu-action-item:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

.menu-action-item .el-icon {
  font-size: 16px;
}

.col-rolls {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 2px 0;
}
.mr-player {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.no-rolls-hint {
  font-size: 11px;
  color: #cbd5e1;
  font-style: italic;
}

.tabs-sort-control {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-action-item:hover {
  background-color: #f5f5f5;
}

.action-arrow {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.action-label {
  flex: 1;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  width: 100%;
  margin: 0;
  padding: 16px;
  background: white;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-sizing: border-box;
}

.summary-grid.has-sort-control {
  padding-top: 48px;
}

.summary-grid.slot-grid {
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
}
.summary-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}
.summary-card:hover {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border-color: #cbd5e1;
}
.summary-header {
  padding: 0 8px;
  height: 32px;
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 800;
  color: #334155;
  font-size: 13px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.summary-item {
  padding: 6px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  border-bottom: 1px solid #f8fafc;
}
.s-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #334155;
  font-weight: 500;
}
.summary-item:last-child {
  border-bottom: none;
}
.summary-layer-section {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  html.dark & {
    border-color: rgba(255, 255, 255, 0.08);
  }
}
.summary-layer-section:last-child {
  border-bottom: none;
}
.layer-sidebar {
  width: 24px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  writing-mode: vertical-lr;
  text-orientation: upright;
  letter-spacing: -1px;
  padding: 8px 0;
  flex-shrink: 0;
  min-height: 32px;
  html.dark & {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
  }
}
.layer-rows {
  flex: 1;
  min-width: 0;
}
.summary-item {
  content-visibility: auto;
  contain-intrinsic-size: 1px 40px;
}
.layer-rows .summary-item {
  border-bottom: 1px solid #f8fafc;
}
.layer-rows .summary-item:last-child {
  border-bottom: none;
}
.summary-item.is-not-obtained {
  opacity: 0.5;
  filter: grayscale(0.8);
}
.summary-item.is-not-obtained .s-name {
  color: #94a3b8;
  font-weight: 400;
}
.summary-item.is-not-obtained .count-badge {
  background: transparent;
  color: #cbd5e1;
  border-color: #e2e8f0;
}

.pagination-el-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.pagination-box {
  padding: 12px 16px;
  display: flex;
  align-items: center;
}

.initial-loading {
  position: fixed;
  inset: 0;
  background: #f8fafc;
  z-index: 5000;
  overflow: hidden;
}

.skeleton-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.skeleton-header {
  height: 48px;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .brand {
    width: 140px;
    height: 24px;
  }
  .toolbar {
    width: 400px;
    height: 24px;
  }
}

.skeleton-page-main {
  flex: 1;
  padding: 24px;
  max-width: 1400px;
  width: calc(100% - 48px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .control {
    width: 100%;
    height: 40px;
    border-radius: 8px;
  }
  .skeleton-filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
    .filter-box {
      width: 100%;
      height: 120px;
      border-radius: 12px;
    }
  }
}

.skeleton-content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  .card {
    height: 160px;
    border-radius: 12px;
  }
}

.skeleton-item {
  background: #edf2f7;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

html.dark {
  .initial-loading {
    background: #0f172a;
  }
  .skeleton-header {
    background: #1e293b;
    border-color: rgba(255, 255, 255, 0.05);
  }
  .skeleton-item {
    background: rgba(255, 255, 255, 0.05);
    &::after {
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.03) 50%,
        transparent 100%
      );
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(4px);
}
.spinner {
  width: 32px;
  height: 32px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}
.loading-txt {
  font-weight: 700;
  color: #1e293b;
}

.loading-card-wide {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 800px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  text-align: left;

  .loading-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
  }

  .spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .loading-title {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
  }

  .parsing-lists {
    display: flex;
    height: 500px;
    gap: 16px;
  }

  .list-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .list-divider {
    width: 1px;
    background: #f1f5f9;
    margin: 0 4px;
  }

  .list-head {
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .list-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 12px;

    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: #e2e8f0;
      border-radius: 3px;
    }
  }

  .file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 2px;
    transition: all 0.2s;
    overflow: hidden;

    .file-info-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;

      .el-icon {
        font-size: 14px;
        flex-shrink: 0;
      }

      .file-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .file-size {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      opacity: 0.7;
      flex-shrink: 0;
      min-width: 70px;
      text-align: right;
    }

    &.done {
      color: #059669;
      background: #ecfdf5;

      .el-icon {
        color: #10b981;
      }
    }

    &.pending {
      color: #94a3b8;

      .el-icon {
        opacity: 0.6;
      }
    }
  }

  .more-hint {
    padding: 8px;
    color: #cbd5e1;
    text-align: center;
    font-style: italic;
    font-size: 12px;
  }
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: #94a3b8;
}
.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.2;
}
.hint-txt {
  font-size: 13px;
  color: #94a3b8;
  margin: 6px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-leave-to {
  opacity: 0;
}

.filter-popover {
  padding: 4px;
}
.pop-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 4px;
}
.filter-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.filter-list .el-checkbox {
  height: 24px;
}

.main-viewport {
  width: calc(100% - 48px);
  max-width: 1400px;
  margin: 0 auto 32px;
}

.mode-tabs-el {
  margin-top: 8px;
  padding-top: 6px;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__header) {
  margin: 0 !important;
  border-bottom: none !important;
  padding: 0 !important;
  overflow: visible !important;
}

:deep(.el-tabs__nav-wrap) {
  overflow: visible !important;
  padding-left: 0 !important;
}

:deep(.el-tabs__nav-scroll) {
  overflow: visible !important;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  border: none !important;
}

.mode-tabs-el :deep(.el-tabs__header .el-tabs__item) {
  border: 1px solid #e2e8f0 !important;
  background: #f8fafc !important;
  margin-right: -1px !important;
  transition: all 0.2s ease;
  color: #64748b;
  height: 40px;
  line-height: 40px;
  border-radius: 0 !important;
  box-sizing: border-box;
  margin-bottom: -1px;
}

.mode-tabs-el :deep(.el-tabs__header .el-tabs__item:first-child) {
  border-top-left-radius: 8px !important;
  margin-left: 0 !important;
}

.mode-tabs-el :deep(.el-tabs__header .el-tabs__item:last-child) {
  border-top-right-radius: 8px !important;
}

.mode-tabs-el :deep(.el-tabs__header .el-tabs__item.is-active) {
  background: white !important;
  color: var(--primary-color) !important;
  font-weight: 800;
  border-bottom-color: white !important;
  position: relative;
  z-index: 5;
}

.summary-grid,
.list-container-el {
  position: relative;
  z-index: 1;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item:not(.is-active):hover) {
  background: #f1f5f9;
  color: #475569;
}

.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  transition: padding 0.2s ease-out;
}

.empty-guide-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  width: 100%;
  max-width: 1200px;
}

.empty-info-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

@media (max-height: 750px) {
  .empty-placeholder {
    padding: 20px;
  }
  .empty-title {
    font-size: 26px;
    margin-bottom: 4px;
  }
  .empty-desc {
    font-size: 15px;
    margin-bottom: 12px;
  }
}

@media (max-height: 580px) {
  .empty-container {
    padding-bottom: 0;
    padding-top: 0;
    align-items: center;
  }
  .empty-placeholder {
    padding: 16px 24px 12px;
  }

  .empty-guide-main {
    flex-direction: row;
    text-align: left;
    align-items: center;
    justify-content: center;
    gap: 40px;
  }

  .empty-info-side {
    flex: 0 1 auto;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .empty-icon {
    display: block !important;
    max-height: 48px;
    opacity: 0.8;
    margin-bottom: 8px;
    overflow: visible;
    pointer-events: auto;
    line-height: 1;
  }

  .guide-img-box {
    margin-left: 0;
    margin-bottom: 0;
  }

  .empty-title {
    font-size: 18px;
  }
  .empty-desc {
    font-size: 13px;
  }

  .setup-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    max-width: 500px;
    padding: 8px;
    gap: 12px;
  }
}

.compact-guide {
  margin-top: 0 !important;
}

.empty-placeholder:hover {
  border-color: #3b82f6;
  background: #fbfcfe;
}

html.dark .empty-placeholder:hover {
  background: transparent;
  border-color: #60a5fa;
}

.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  flex: 1;
  box-sizing: border-box;
  background-color: #f8fafc;
}

.empty-title {
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.empty-desc {
  font-size: 18px;
  color: #64748b;
  line-height: 1.8;
  margin-bottom: 16px;
}

.empty-highlight {
  color: #3b82f6;
  font-weight: 700;
  padding: 0 4px;
}

.empty-hint {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.drop-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  opacity: 0.8;
}

.drop-hint::before {
  content: '💡';
  font-size: 14px;
}

html.dark .drop-hint {
  color: rgba(255, 255, 255, 0.4);
}

.empty-hint :deep(.el-button) {
  padding: 12px 32px;
  font-weight: 600;
  border-radius: 10px;
}

.setup-form {
  background: #f8fafc;
  padding: 20px;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.setup-label {
  font-weight: 700;
  color: #475569;
  font-size: 14px;
  white-space: nowrap;
}

.setup-row :deep(.el-date-editor) {
  flex: 1;
}

.guide-img-box {
  border-radius: 9.5px;
  overflow: hidden;
  max-width: 500px;
  width: auto;
  flex-shrink: 1;
  background: transparent;
}

.guide-img {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 58vh;
  height: auto;
  object-fit: contain;
  opacity: 1;
}

@media (max-height: 750px) {
  .guide-img {
    max-height: 48vh;
  }
}

@media (max-height: 580px) {
  .guide-img {
    max-height: 50vh;
    max-width: 320px;
  }
}

.guide-img:hover {
  opacity: 1;
  transition: opacity 0.2s ease;
}

.hint-txt {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 11px;
  width: 100%;
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
}

.drag-guide-zone {
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  height: 80px;
  z-index: 9999;
  background-color: rgba(236, 245, 255, 0.95);
  border: 2px dashed #409eff;
  border-radius: 8px;

  html.dark & {
    background-color: rgba(37, 38, 50, 0.95);
    border-color: #3b82f6;
  }
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #409eff;
  font-weight: bold;
  font-size: 16px;
  gap: 4px;
  backdrop-filter: blur(4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  animation: fadeIn 0.2s ease-out;
  transition: all 0.2s ease;
}

.drag-guide-zone.is-active {
  background-color: rgba(217, 236, 255, 0.98);
  border-color: #337ecc;
  transform: scale(1.01);
  box-shadow: 0 12px 32px rgba(64, 158, 255, 0.3);
}

.drag-guide-zone > * {
  pointer-events: none;
}

.setup-drag-zone {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.95);
  border: 2px dashed #409eff;
  border-radius: 12px;

  html.dark & {
    background-color: rgba(37, 38, 50, 0.95);
    border-color: #3b82f6;
  }
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #409eff;
  font-weight: bold;
  font-size: 16px;
  gap: 8px;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
  transition: all 0.2s ease;
}

.setup-drag-zone.is-active {
  background-color: rgba(236, 245, 255, 0.98);
  border-color: #337ecc;
  transform: scale(1.02);
  box-shadow: 0 12px 32px rgba(64, 158, 255, 0.2);
}

.setup-drag-zone > * {
  pointer-events: none;
}

.guide-icon {
  font-size: 32px;
  margin-bottom: 4px;
}
.role-settings-content-popover {
  padding: 12px 14px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 8px;
  padding: 0;
}

.role-setup-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-setup-label {
  flex-shrink: 0;
  width: 24px;
  display: flex;
  justify-content: center;
  transform: scale(0.85);
}

.role-divider {
  margin: 10px 0 6px;
  padding-bottom: 2px;
  border-bottom: 1px dashed #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
}

.role-divider::before {
  content: '';
  width: 2px;
  height: 10px;
  background: #3b82f6;
  margin-right: 4px;
  border-radius: 2px;
}

.special-role-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.special-role-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
}

.special-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.special-item {
  display: inline-flex;
}

.loot-record-table :deep(th.el-table__cell) {
  background-color: #f8fafc;
  color: #64748b;
  font-weight: 800;
  font-size: 12px;
}

.loot-record-table :deep(.el-table__row) {
  content-visibility: auto;
  contain-intrinsic-size: 1px 48px;
}

.loot-record-table :deep(th.el-table__cell) {
  background-color: #f8fafc;
  color: #64748b;
  font-weight: 800;
  font-size: 12px;
}

.guide-content-popover {
  padding: 20px 24px;
  font-size: 13px;
  line-height: 1.5;
  color: #334155;

  .guide-section {
    margin-bottom: 20px;

    .el-icon {
      color: #3b82f6;
      vertical-align: text-bottom;
      margin-right: 4px;
    }

    &:last-child {
      margin-bottom: 0;
    }

    h4 {
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 700;
      margin: 0 0 8px 0;
      line-height: 1.4;
      color: #0f172a;

      .el-icon {
        font-size: 15px;
      }
    }

    p {
      margin: 0 0 6px 0;
      line-height: 1.5;
      color: #334155;

      &:last-child {
        margin-bottom: 0;
      }
    }

    ol,
    ul {
      margin: 6px 0;
      padding-left: 20px;

      li {
        margin-bottom: 4px;
        line-height: 1.5;
        color: #334155;
        padding-left: 2px;

        &:last-child {
          margin-bottom: 0;
        }

        strong {
          color: #1e293b;
          font-weight: 600;
        }
      }
    }

    code {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 12px;
      font-weight: 500;
      background-color: #f1f5f9;
      color: #3b82f6;
      line-height: 1.4;
      margin: 0 2px;
    }
  }

  .warning-box {
    border: 1px solid rgba(251, 191, 36, 0.4);
    border-radius: 6px;
    padding: 6px 12px;
    margin: 8px 0;
    background-color: #fffbeb;

    p {
      margin: 0 0 4px 0;
      color: #92400e;

      &:last-child {
        margin-bottom: 0;
      }

      strong {
        color: #b45309;
        font-weight: 700;
      }
    }

    ul {
      margin: 4px 0 0 0;
      padding-left: 18px;

      li {
        margin-bottom: 2px;
        color: #92400e;

        &:last-child {
          margin-bottom: 0;
        }

        strong {
          color: #b45309;
        }
      }
    }
  }
}
</style>

<style lang="scss">
.control-bar {
  margin: 0 auto 12px;
  width: calc(100% - 48px);
  max-width: 1400px;
  padding: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .sync-btn-fixed {
    width: 92px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    white-space: nowrap;
    transition: none !important;
    padding: 0; /* 使用固定宽度时，减小 padding 扰动 */

    :deep(span) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }

  .dot-warn {
    width: 6px;
    height: 6px;
    background-color: #f59e0b;
    border-radius: 50%;
    margin-left: 4px;
    flex-shrink: 0;
  }
}

.control-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

html.dark {
  .app-container {
    background-color: #161823;
    color: rgba(255, 255, 255, 0.9);
  }

  .app-header {
    background: rgba(22, 24, 35, 0.85);
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .filter-section,
  .summary-card,
  .list-container-el,
  .initial-loading,
  .summary-grid,
  .setup-form,
  .role-setup-item,
  .suggestion-box,
  .context-menu,
  .selector-tags {
    background-color: #252632;
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .sec-header,
  .summary-header,
  .role-config-header,
  .menu-info-header,
  .context-menu-header {
    background: #252632;
    border-bottom-color: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.9);
  }

  .sec-body,
  .mapping-tag,
  .empty-container,
  .initial-loading {
    background-color: #161823;
  }

  .loading-card,
  .setup-form,
  .loading-overlay {
    background-color: #252632;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .loading-overlay {
    background-color: rgba(22, 24, 35, 0.85);
  }

  .empty-title,
  .loading-title {
    color: rgba(255, 255, 255, 0.95);
  }

  .empty-desc,
  .loading-subtitle {
    color: rgba(255, 255, 255, 0.5);
  }

  .setup-label {
    color: rgba(255, 255, 255, 0.7);
  }

  .spinner-large,
  .spinner {
    border-color: rgba(255, 255, 255, 0.1);
    border-top-color: #3b82f6;
  }

  .mode-tabs-el .el-tab-pane {
    background-color: #252632;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .mode-tabs-el .el-tabs__header .el-tabs__item {
    background-color: #161823 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: rgba(255, 255, 255, 0.5);
  }
  .mode-tabs-el .el-tabs__header .el-tabs__item.is-active {
    background-color: #252632 !important;
    color: #60a5fa !important;
    border-bottom-color: #252632 !important;
  }
  .status-pass {
    background-color: rgba(255, 255, 255, 0.02) !important;
    color: #475569 !important;
  }

  .summary-item,
  .week-record-row,
  .menu-divider,
  .role-divider,
  .divider,
  .mapping-list {
    border-bottom-color: rgba(255, 255, 255, 0.06);
    border-top-color: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.5);
  }

  .week-record-row:last-child,
  .summary-item:last-child {
    border-bottom: none;
  }

  .s-name,
  .item-text,
  .title-main,
  .week-item-name,
  .week-player-name,
  .setup-label,
  .menu-action-item,
  .context-menu-item,
  .selector-title,
  .switch-label {
    color: rgba(255, 255, 255, 0.9) !important;
  }

  .hint-small,
  .hint-txt,
  .no-rolls-hint,
  .no-winner,
  .time-date,
  .col-week,
  .menu-info-header {
    color: rgba(255, 255, 255, 0.5);
  }

  .hint-txt {
    border-top-color: rgba(255, 255, 255, 0.06) !important;
  }

  .soft-action-btn,
  .hint-action {
    background-color: rgba(255, 255, 255, 0.08) !important;
    border-color: transparent !important;
    color: rgba(255, 255, 255, 0.8) !important;
    &:hover {
      background-color: rgba(255, 255, 255, 0.15) !important;
      color: #ffffff !important;
    }
  }

  .path-toolbar .el-input__wrapper {
    background-color: rgba(255, 255, 255, 0.08) !important;
    box-shadow: none !important;
  }
  .path-toolbar .el-input__inner {
    color: rgba(255, 255, 255, 0.9) !important;
    background-color: transparent !important;
  }
  .path-toolbar .el-input__wrapper:hover,
  .path-toolbar .el-input__wrapper.is-focus {
    background-color: rgba(255, 255, 255, 0.12) !important;
  }

  .el-table {
    --el-table-bg-color: #252632;
    --el-table-tr-bg-color: #252632;
    --el-table-header-bg-color: #252632;
    --el-table-border-color: rgba(255, 255, 255, 0.06);
    background-color: #252632;
  }

  .loot-record-table th.el-table__cell {
    background-color: #252632 !important;
    color: rgba(255, 255, 255, 0.7);
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }

  .el-table__row:hover > td {
    background-color: rgba(255, 255, 255, 0.04) !important;
  }

  .week-record-row:hover {
    background-color: rgba(255, 255, 255, 0.06) !important;
  }
  .menu-action-item:hover,
  .summary-card:hover,
  .context-menu-item:hover {
    background-color: rgba(255, 255, 255, 0.06) !important;
  }

  .week-record-row.is-suspicious {
    background-color: rgba(255, 77, 79, 0.15) !important;
    box-shadow: inset 0 0 0 1px rgba(255, 77, 79, 0.2);
    .week-item-name {
      color: #ffabadd9 !important;
    }
  }
  .week-record-row.is-suspicious:hover {
    background-color: rgba(255, 77, 79, 0.2) !important;
  }

  .week-record-row.is-corrected {
    background-color: rgba(94, 129, 244, 0.15) !important;
    box-shadow: inset 0 0 0 1px rgba(94, 129, 244, 0.2);
    .week-item-name {
      color: #8baaffd1 !important;
    }
  }

  .context-menu-popper {
    background: #252632 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
  }
  .pop-title {
    color: rgba(255, 255, 255, 0.9);
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .v-divider,
  .act-divider {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .el-dialog {
    background-color: #252632;
    border-color: rgba(255, 255, 255, 0.1);
    .el-dialog__title {
      color: rgba(255, 255, 255, 0.9);
    }
  }

  .el-button:not(.el-button--primary):not(.el-button--danger):not(
      .el-button--info
    ) {
    background-color: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: rgba(255, 255, 255, 0.9) !important;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1) !important;
      border-color: #60a5fa !important;
      color: #60a5fa !important;
    }
  }

  .initial-loading,
  .empty-container {
    background-color: #161823 !important;
  }

  .el-pagination {
    --el-pagination-bg-color: transparent;
    --el-pagination-button-bg-color: rgba(255, 255, 255, 0.08);
    --el-pagination-button-color: rgba(255, 255, 255, 0.5);
    --el-pagination-button-disabled-bg-color: transparent;
    --el-pagination-hover-color: #60a5fa;
  }

  .el-check-tag {
    background-color: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.6);

    &.is-checked {
      background-color: rgba(255, 255, 255, 0.15);
      color: #60a5fa;
      font-weight: 600;
    }

    &:not(.is-checked):hover {
      background-color: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.9);
    }

    &:not(.is-checked) {
      --el-tag-bg-color: rgba(255, 255, 255, 0.08);
      --el-tag-text-color: rgba(255, 255, 255, 0.6);
      --el-tag-border-color: transparent;
    }
  }

  .el-checkbox__label {
    color: rgba(255, 255, 255, 0.9);
  }

  .loading-txt {
    color: rgba(255, 255, 255, 0.7);
  }

  .stats-panel {
    background-color: #161823 !important;
  }

  .chart-container {
    background-color: #252632 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  .summary-header {
    background-color: #1e1f29 !important;
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
    color: rgba(255, 255, 255, 0.7);
  }

  .summary-card {
    background-color: #252632 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  .summary-card:hover {
    border-color: rgba(255, 255, 255, 0.2) !important;
    background-color: #2a2b36 !important;
  }

  .count-single {
    background-color: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: rgba(255, 255, 255, 0.4) !important;
  }

  .week-list-divider {
    border-top-color: rgba(255, 255, 255, 0.06) !important;
  }

  .chart-title {
    color: rgba(255, 255, 255, 0.9) !important;
  }

  .chart-subtitle {
    color: rgba(255, 255, 255, 0.5) !important;
  }

  .bis-view-panel,
  .bis-config-panel {
    background-color: #252632 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  .bis-table th,
  .sticky-col {
    background-color: #252632 !important;
    color: rgba(255, 255, 255, 0.9) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  .bis-table td {
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: rgba(255, 255, 255, 0.9) !important;
  }

  .status-need {
    background-color: rgba(16, 185, 129, 0.2) !important;
    color: #34d399 !important;
  }

  .status-greed {
    background-color: rgba(245, 158, 11, 0.15) !important;
    color: #fbbf24 !important;
  }

  .status-greed-tome {
    background-color: rgba(56, 189, 248, 0.15) !important;
    color: #38bdf8 !important;
  }

  .status-pass {
    background-color: rgba(255, 255, 255, 0.02) !important;
    color: rgba(255, 255, 255, 0.3) !important;
  }

  .config-table .check-cell:hover {
    background-color: rgba(255, 255, 255, 0.05) !important;
  }

  .guide-popover-popper {
    background-color: #252632 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;

    .el-popper__arrow::before {
      background-color: #252632 !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
    }

    .guide-content-popover {
      .guide-section {
        margin-bottom: 20px;

        h4 {
          color: rgba(255, 255, 255, 0.95);
        }

        p,
        li {
          color: rgba(255, 255, 255, 0.75);
          &::marker {
            color: rgba(255, 255, 255, 0.35);
          }
        }

        strong {
          color: #60a5fa;
        }
      }

      .warning-box {
        background-color: rgba(234, 179, 8, 0.08);
        border-color: rgba(234, 179, 8, 0.25);
        border-radius: 6px;

        p,
        li {
          color: rgba(255, 255, 255, 0.85);
        }

        strong {
          color: #facc15;
        }
      }

      code {
        background-color: rgba(255, 255, 255, 0.1);
        color: #60a5fa;
      }
    }
  }

  .loading-card-wide {
    background: #252632;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    width: 800px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);

    .loading-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .spinner-small {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-title {
      font-size: 15px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
    }

    .parsing-lists {
      display: flex;
      height: 500px;
      gap: 16px;
    }

    .list-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .list-divider {
      width: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 0 4px;
    }

    .list-head {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 8px;
    }

    .list-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 4px;
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 12px;

      &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
    }

    .file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 2px;
      overflow: hidden;

      .file-info-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;

        .el-icon {
          font-size: 14px;
          flex-shrink: 0;
        }

        .file-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .file-size {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        opacity: 0.5;
        flex-shrink: 0;
        min-width: 70px;
        text-align: right;
      }

      &.done {
        color: #34d399;
        background: rgba(16, 185, 129, 0.1);
      }

      &.pending {
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .more-hint {
      padding: 8px;
      color: rgba(255, 255, 255, 0.3);
      text-align: center;
      font-style: italic;
    }
  }
}

.v-divider-mini {
  width: 1px;
  height: 14px;
  background: #e2e8f0;
  margin: 0 4px;
  html.dark & {
    background: rgba(255, 255, 255, 0.1);
  }
}

.export-selection-list,
.import-selection-list,
.clear-selection-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.clear-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.clear-warning-text {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.clear-quick-actions {
  display: flex;
  gap: 4px;
}

.clear-danger-hint {
  margin-top: 20px;
  padding: 12px;
  background: #fff1f2;
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #e11d48;
  font-size: 12px;
  line-height: 1.6;
  border: 1px solid #ffe4e6;

  .el-icon {
    font-size: 16px;
    margin-top: 1px;
    flex-shrink: 0;
  }

  html.dark & {
    background: rgba(239, 68, 68, 0.05);
    border-color: rgba(239, 68, 68, 0.1);
    color: #fb7185;
  }
}

.import-preview-box {
  .import-hint-text {
    margin-bottom: 16px;
    font-size: 14px;
    color: #64748b;
  }
}

.import-warning-info {
  margin-top: 20px;
  padding: 10px 12px;
  background-color: #fff7ed;
  border: 1px solid #ffedd5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #c2410c;
  font-size: 12px;

  .el-icon {
    font-size: 16px;
  }
}

.import-success-info {
  margin-top: 20px;
  padding: 10px 12px;
  background-color: #f0fdf4;
  border: 1px solid #dcfce7;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #16a34a;
  font-size: 12px;

  .el-icon {
    font-size: 16px;
  }
}

.import-identical-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-left: 8px;
  font-weight: normal;
}

html.dark {
  .import-warning-info {
    background-color: rgba(194, 65, 12, 0.1);
    border-color: rgba(194, 65, 12, 0.2);
    color: #fb923c;
  }
  .import-success-info {
    background-color: rgba(22, 163, 74, 0.1);
    border-color: rgba(22, 163, 74, 0.2);
    color: #4ade80;
  }
}

.winner-selector-trigger {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 2px 4px 2px 0;
  border-radius: 4px;
  transition: all 0.2s;
  position: relative;
  min-width: 120px;

  &:hover {
    background: #f1f5f9;
    .winner-edit-icon {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  html.dark &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .winner-edit-icon {
    opacity: 0.3;
    transition: all 0.2s;
    font-size: 14px;
    color: #3b82f6;
    margin-left: auto;
  }

  .correction-winner-display {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    line-height: 1.1;

    .original-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #7f8ea3;
      margin-left: 2px;
      margin-bottom: 2px;

      .correction-label {
        font-weight: 800;
        font-size: 10px;
        opacity: 0.7;
        white-space: nowrap;
      }

      .original-display {
        opacity: 0.6;
        transform: scale(0.92);
        transform-origin: left center;
      }
    }

    .corrected-row {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: 10px;

      .correction-arrow {
        color: #94a3b8;
        font-size: 14px;
        flex-shrink: 0;
      }
    }
  }
}

.winner-change-popper.el-popper {
  transition:
    opacity 0.08s linear,
    transform 0.08s ease-out !important;
}

.winner-change-popover {
  padding: 4px;
  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;

    .popover-title {
      font-weight: bold;
      font-size: 14px;
      color: #1e293b;
      margin-bottom: 0;

      html.dark & {
        color: #f1f5f9;
      }
    }

    .restore-btn {
      padding: 0;
      font-size: 12px;
      height: auto;
    }
  }

  .popover-desc {
    font-size: 11px;
    color: #64748b;
    margin-bottom: 12px;
    opacity: 0.8;
  }
}

.winner-select-bar {
  width: 100%;
}

.select-player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.premium-correction-dialog {
  .el-dialog__header {
    margin-right: 0 !important;
    padding: 20px 24px;
    border-bottom: 1px solid #f1f5f9;
    html.dark & { border-color: rgba(255, 255, 255, 0.05); }
  }
  .el-dialog__body {
    padding: 0 !important;
    overflow: hidden;
  }
}

.premium-correction-layout {
  display: flex;
  height: 550px;
  background: #ffffff;

  html.dark & {
    background: #1a1b26;
  }

  .correction-sidebar {
    width: 200px;
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    padding: 16px 0;

    html.dark & {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.05);
    }

    .nav-item {
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border-left: 3px solid transparent;
      margin-bottom: 4px;

      &:hover {
        background: rgba(59, 130, 246, 0.05);
      }

      &.active {
        background: #fff;
        border-left-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);

        html.dark & { background: rgba(59, 130, 246, 0.1); }

        .nav-title { color: #1e293b; font-weight: 700; html.dark & { color: #f1f5f9; } }
      }

      .nav-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        color: #64748b;
        font-size: 18px;

        html.dark & { background: #2d2e3d; color: #94a3b8; }

        .el-icon { font-size: 18px; }
      }

      &.active .nav-icon {
        background: #3b82f6;
        color: #fff;
        box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
      }

      .nav-content {
        .nav-title { font-size: 14px; color: #64748b; margin-bottom: 2px; }
        .nav-status { font-size: 12px; color: #94a3b8; }
      }
    }

    .sidebar-footer {
      margin-top: auto;
      padding: 0 20px;
    }
  }

  .correction-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 20px 24px;

    .main-header {
      margin-bottom: 16px;
      h3 { font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; html.dark & { color: #f1f5f9; } }
      p { color: #64748b; margin: 0; font-size: 12px; }
    }

    .correction-grid-wrapper {
      flex: 1;
      overflow-y: auto;
      padding-right: 8px;
      padding-top: 4px; /* 为 hover 上浮效果留出空间 */

      &::-webkit-scrollbar { width: 5px; }
      &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    }

    .correction-card-compact {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border-color: #3b82f6;
      }

      html.dark & {
        background: #252632;
        border-color: rgba(255, 255, 255, 0.05);
        &:hover { border-color: #3b82f6; background: #2d2e3d; }
      }

      .card-main-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .item-primary-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        .item-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          html.dark & { color: #f1f5f9; }
        }
        .item-time { font-size: 10px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; opacity: 0.6; line-height: 1.2; margin-top: 1px; }
      }

      .card-comparison-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f8fafc;
        border-radius: 6px;
        padding: 4px 10px;
        min-width: 280px;

        html.dark & { background: rgba(0, 0, 0, 0.2); }

        .comp-box {
          flex: 1;
          display: flex;
          justify-content: center;
          .value {
            font-size: 12px;
            .week-text { font-weight: 700; color: #64748b; html.dark & { color: #94a3b8; } }
          }
        }

        .comp-arrow {
          color: #94a3b8;
          font-size: 12px;
          opacity: 0.4;
        }

        .new .value .week-text { color: #10b981; }
      }

      .card-actions {
        margin-left: 4px;
        .el-button { font-weight: 600; font-size: 11px; padding: 4px 0; }
      }
    }
  }
}

.premium-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #94a3b8;
  opacity: 0.6;
  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  p { font-size: 13px; margin: 0; }
}

.sync-status-container {
  display: inline-flex;
  align-items: center;
  margin: 0 6px;
  position: relative;
  width: 70px;
  height: 24px;
}
.sync-hint-text {
  font-size: 10px;
  color: #94a3b8;
  white-space: nowrap;
  font-weight: 500;
  width: 100%;
  text-align: center;
}
.sync-hint-text.is-success {
  color: #10b981;
  font-weight: 700;
}
.col-week-interactive {
  cursor: pointer;
  padding: 4px 0;
  &:hover {
    background-color: rgba(0,0,0,0.02);
    border-radius: 4px;
  }
}
.week-correction-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
}
.original-week {
  text-decoration: line-through;
  opacity: 0.5;
  font-size: 10px;
}
.corrected-week {
  color: #3b82f6;
  font-weight: 800;
  font-size: 12px;
}
.week-arrow {
  font-size: 10px;
  color: #94a3b8;
  margin: -1px 0;
}
.week-warning-icon {
  color: #f97316;
  font-size: 12px;
  margin-left: 1px;
  vertical-align: -2px;
  animation: suspicious-pulse 2s infinite;
}
</style>
