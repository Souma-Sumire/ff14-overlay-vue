<script setup lang="ts">
import type { MessageBoxInputData } from 'element-plus'
import type { BisPreset } from '@/utils/bisPresets'
import type { BisConfig, BisRow, BisValue, LegacyBisConfig } from '@/utils/bisUtils'
import type { LootRecord } from '@/utils/lootParser'
import {
  ArrowDown,
  Delete,
  Edit,
  InfoFilled,
  List,
  MagicStick,
  Plus,
  QuestionFilled,
  Right,
  Setting,
  User,
  Warning,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, inject, ref, watch } from 'vue'
import { getPresetsForRole } from '@/utils/bisPresets'
import {

  isPlayerComplete as checkPlayerComplete,
  DEFAULT_ROWS,
  LAYER_CONFIG,

} from '@/utils/bisUtils'

import { getRoleType, PART_ORDER, ROLE_DEFINITIONS } from '@/utils/lootParser'

import { getCurrentWeekNumber } from '@/utils/raidWeekUtils'
import PlayerDisplay from './PlayerDisplay.vue'

const props = defineProps<{
  players: string[]
  records: LootRecord[]
  modelValue: BisConfig | LegacyBisConfig | undefined
  getPlayerRole?: (name: string) => string | null | undefined
  getActualPlayer?: (p: string) => string
  showOnlyRole?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: BisConfig): void
}>()

const getDisplayName = inject('getDisplayName', (n: string) => n)

const tooltipsOpen = ref<Record<string, boolean>>({})

const showConfigDialog = ref(false)
const excludedPlayers = ref<Set<string>>(new Set())
const customAllocations = ref<Record<string, string>>({})

const config = ref<BisConfig>({
  playerBis: {},
  plannedWeeks: 8,
  manualObtained: {},
})

const showCorrectionDialog = ref(false)

const showImportConfirmDialog = ref(false)
const showPresetConfirmDialog = ref(false)
const importDiffs = ref<PlayerDiff[]>([])
const pendingPresetData = ref<{
  player: string
  preset: BisPreset
  diff: PlayerDiff | null
} | null>(null)

const importWeeks = ref<number | undefined>(undefined)

const STATUS_MAP = {
  pass: { text: '放弃', class: 'status-pass' },
  need: { text: '需求', class: 'status-need' },
  greed: { text: '贪婪', class: 'status-greed-tome' },
  assigned: { text: '分配', class: 'status-assigned' },
} as const

const layeredViewRows = computed(() => {
  return LAYER_CONFIG.map((layer) => {
    const rows = layer.items
      .map(id => DEFAULT_ROWS.find(r => r.id === id))
      .filter((r): r is BisRow => !!r)
    return {
      name: layer.name,
      rows,
    }
  })
})

const configRows = computed(() => {
  const order = PART_ORDER as string[]
  return [...DEFAULT_ROWS].sort((a, b) => {
    const ia = order.indexOf(a.keywords)
    const ib = order.indexOf(b.keywords)
    if (ia === -1 && ib === -1)
      return 0
    if (ia === -1)
      return 1
    if (ib === -1)
      return -1
    return ia - ib
  })
})

const eligiblePlayers = computed(() => {
  return props.players.filter(isEligible)
})

const expandedPlayerPresets = ref<Set<string>>(new Set())

const isConfigComplete = computed(() => {
  for (const role of ROLE_DEFINITIONS) {
    if (!checkPlayerComplete(config.value, role))
      return false
  }
  return true
})

const incompletePlayerCount = computed(() => {
  return ROLE_DEFINITIONS.filter(
    role => !checkPlayerComplete(config.value, role),
  ).length
})

const validationAlerts = computed(() => {
  const alerts: { id: string, type: 'info' | 'warning', message: string }[] = []
  const weeks = config.value.plannedWeeks || 8

  const itemsToValidate = [
    { id: 'coating', name: '硬化药' },
    { id: 'twine', name: '强化纤维' },
    { id: 'tome', name: '神典石' },
    { id: 'solvent', name: '强化药' },
  ]

  itemsToValidate.forEach((item) => {
    let total = 0
    eligiblePlayers.value.forEach((p) => {
      total += getNeededCount(p, item.id)
    })

    if (total > weeks) {
      alerts.push({
        id: item.id,
        type: 'warning',
        message: `${item.name}: 总需求(${total}) 大于 计划周数(${weeks})，这是不可能的分配。`,
      })
    }
  })

  return alerts
})

function generateEquipLines(rows: BisRow[]): string[] {
  const lines: string[] = []
  rows.forEach((row) => {
    const needs: string[] = []
    const greeds: string[] = []

    // 队长分配具有最高优先级
    if (customAllocations.value[row.id]) {
      const p = customAllocations.value[row.id]!
      let displayName = getDisplayName(props.getPlayerRole?.(p) || p)
      displayName = displayName.replace(/^LEFT:/, '').trim()
      lines.push(`/p ${row.name}：${displayName} (队长分配)`)
      return
    }

    eligiblePlayers.value.forEach((p) => {
      if (excludedPlayers.value.has(p))
        return

      let displayName = getDisplayName(props.getPlayerRole?.(p) || p)
      displayName = displayName.replace(/^LEFT:/, '').trim()

      const status = getLogicStatus(p, row)
      if (status === 'need') {
        needs.push(displayName)
      }
      else if (status === 'greed') {
        greeds.push(displayName)
      }
    })

    let content = ''
    if (needs.length > 0) {
      content = needs.join('、')
    }
    else if (greeds.length > 0) {
      content = greeds.join('、')
    }
    else {
      content = '随便ROLL'
    }

    lines.push(`/p ${row.name}：${content}`)
  })
  return lines
}

function getFF14WeekNumber(): number {
  if (!props.records || props.records.length === 0)
    return 1
  return getCurrentWeekNumber(props.records.map(r => r.timestamp))
}

function handleCopyMacro(command: { name: string, rows: BisRow[] } | 'all') {
  const now = new Date()
  const weekNum = getFF14WeekNumber()
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`
  let text = ''
  let message = ''

  if (command === 'all') {
    const lines = [`/p <第${weekNum}周分配优先级> ${dateStr}`]

    layeredViewRows.value.forEach((layer) => {
      lines.push(...generateEquipLines(layer.rows))
    })

    text = lines.join('\n')
    message = `已复制全层宏 (共${lines.length}行)`
  }
  else {
    const lines = [`/p <第${weekNum}周${command.name}分配优先级> ${dateStr}`]
    lines.push(...generateEquipLines(command.rows))
    text = lines.join('\n')
    message = `已复制 ${command.name} 分配宏`
  }

  if (!text)
    return

  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success(message)
    })
    .catch(() => {
      ElMessage.error('复制失败')
    })
}

function isPlayerAssigned(player: string): boolean {
  return Object.values(customAllocations.value).includes(player)
}

function togglePlayerExclusion(player: string) {
  if (excludedPlayers.value.has(player)) {
    excludedPlayers.value.delete(player)
  }
  else {
    excludedPlayers.value.add(player)
  }
}

function getStorageKey(player: string): string {
  if (!props.getPlayerRole)
    return player
  const role = props.getPlayerRole(player)
  if (role && !role.startsWith('LEFT:') && !role.startsWith('SUB:')) {
    return role
  }
  return player
}

function exportBisData() {
  const parts = ROLE_DEFINITIONS.filter(
    role => !!config.value.playerBis[role],
  ).map((role) => {
    const dataBinary = DEFAULT_ROWS.map((row) => {
      const val = config.value.playerBis[role]?.[row.id]
      if (row.type === 'toggle') {
        return val === 'raid' ? '1' : '0'
      }
      else {
        return typeof val === 'number' && val > 0 ? '1' : '0'
      }
    }).join('')
    const data = Number.parseInt(dataBinary, 2).toString(36)
    return `${role}:${data}`
  })
  const str = parts.join(';')
  navigator.clipboard.writeText(str).then(() => {
    ElMessage.success('BIS 设置已复制到剪贴板')
  })
}

function importBisData() {
  ElMessageBox.prompt('请粘贴 BIS 设置字符串', '导入 BIS 设置', {
    confirmButtonText: '下一步',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '在此粘贴...',
    customClass: 'bis-import-message-box',
    inputValidator: (value) => {
      if (!value)
        return '内容不能为空'
      const parts = value
        .trim()
        .split(';')
        .filter(p => p.trim())
      if (parts.length === 0)
        return '格式错误：无法识别有效的分隔符'

      let validCount = 0

      for (const part of parts) {
        if (part.startsWith('weeks:'))
          continue
        const segs = part.split(':')

        if (segs.length !== 2) {
          return `数据格式错误："${part.slice(0, 10)}..."`
        }

        const [role, data] = segs

        if (!data || !/^[0-9a-z]+$/i.test(data)) {
          return `数据校验失败：职位 "${role || '未知'}" 的设置已损坏`
        }

        if (ROLE_DEFINITIONS.includes(role as any)) {
          validCount++
        }
      }

      if (validCount === 0)
        return '未找到匹配当前团队的有效设置数据'
      return true
    },
  })
    .then((res) => {
      const { value } = res as MessageBoxInputData
      if (!value)
        return
      parseAndPreviewBisData(value)
    })
    .catch(() => {
      // 用户取消
    })
}

interface BisChange {
  label: string
  oldVal: string
  newVal: string
}

interface PlayerDiff {
  name: string
  role: string
  isNew: boolean
  changes: BisChange[]
  newConfig: Record<string, BisValue>
}

function getValDisplay(row: BisRow, val: BisValue | undefined): string {
  if (row.type === 'toggle') {
    if (val === 'raid')
      return '零式'
    if (val === 'tome')
      return '点数'
    return '未设置'
  }
  if (typeof val !== 'number')
    throw new Error(`[BisAllocator] 数据异常: ${row.name} 应为数字，实际为 ${val}`)
  return val.toString()
}

function getValClass(val: string) {
  if (val === '零式')
    return 'is-raid'
  if (val === '点数')
    return 'is-tome'
  return ''
}

function parseAndPreviewBisData(rawInput: string) {
  try {
    const trimmedVal = rawInput.trim()
    if (!trimmedVal)
      throw new Error('输入内容为空')

    const parts = trimmedVal.split(';').filter(p => p.trim())
    if (parts.length === 0)
      throw new Error('无效的格式')

    const diffs: PlayerDiff[] = []

    importWeeks.value = undefined
    parts.forEach((part) => {
      if (part.startsWith('weeks:')) {
        const weeks = Number.parseInt(part.split(':')[1] || '0')
        if (!Number.isNaN(weeks)) {
          importWeeks.value = weeks
        }
        return
      }
      const segs = part.split(':')
      if (segs.length !== 2)
        return
      const role = segs[0]
      const data = segs[1]

      if (!role || !data || !ROLE_DEFINITIONS.includes(role as any))
        return

      // 找到本地对应职位的玩家名（用于预览显示）
      const localPlayers = eligiblePlayers.value.filter(
        p => props.getPlayerRole?.(p) === role,
      )
      const pName = localPlayers[0] || role

      const dataBinary = Number.parseInt(data, 36)
        .toString(2)
        .padStart(DEFAULT_ROWS.length, '0')

      const newConfig: Record<string, BisValue> = {}
      DEFAULT_ROWS.forEach((row, idx) => {
        const char = dataBinary[idx]
        if (row.type === 'toggle') {
          newConfig[row.id] = char === '1' ? 'raid' : 'tome'
        }
        else {
          newConfig[row.id] = char === '1' ? 1 : 0
        }
      })

      const currentConfig = config.value.playerBis[role] || {}
      const changes: BisChange[] = []
      let hasChanges = false

      DEFAULT_ROWS.forEach((row) => {
        const oldV = currentConfig[row.id]
        const newV = newConfig[row.id]
        const sOld = getValDisplay(row, oldV)
        const sNew = getValDisplay(row, newV)
        if (sOld !== sNew) {
          hasChanges = true
          changes.push({ label: row.name, oldVal: sOld, newVal: sNew })
        }
      })

      if (hasChanges) {
        diffs.push({
          name: pName,
          role,
          isNew: Object.keys(currentConfig).length === 0,
          changes,
          newConfig,
        })
      }
    })

    if (diffs.length === 0) {
      ElMessage.info('未检测到有效的设置变更。')
      return
    }

    importDiffs.value = diffs
    showImportConfirmDialog.value = true
  }
  catch (e: any) {
    console.error(e)
    ElMessage.error(e.message || '解析失败')
  }
}

function confirmImportBis() {
  confirmImportAction()
}

// 稍微重构一下以支持周数导入

function confirmImportAction() {
  const newPlayerBis = { ...config.value.playerBis }
  importDiffs.value.forEach((diff) => {
    newPlayerBis[diff.role] = {
      ...newPlayerBis[diff.role],
      ...diff.newConfig,
    }
  })
  config.value.playerBis = newPlayerBis
  if (importWeeks.value !== undefined) {
    config.value.plannedWeeks = importWeeks.value
  }
  showImportConfirmDialog.value = false
  ElMessage.success(`成功更新 ${importDiffs.value.length} 个职位的配置`)
}

function setBis(player: string, rowId: string, type: BisValue) {
  const storageKey = getStorageKey(player)
  if (!config.value.playerBis[storageKey])
    config.value.playerBis[storageKey] = {}
  const current = config.value.playerBis[storageKey]![rowId]
  if (current === type) {
    delete config.value.playerBis[storageKey]![rowId]
  }
  else {
    config.value.playerBis[storageKey]![rowId] = type
  }
}

function setNeededCount(player: string, rowId: string, count: number) {
  const storageKey = getStorageKey(player)
  if (!config.value.playerBis[storageKey])
    config.value.playerBis[storageKey] = {}
  config.value.playerBis[storageKey]![rowId] = count
}

function applyPreset(player: string, preset: BisPreset) {
  const storageKey = getStorageKey(player)
  const currentConfig = config.value.playerBis[storageKey] || {}
  const newConfig = { ...preset.config }

  const changes: BisChange[] = []
  DEFAULT_ROWS.forEach((row) => {
    const oldV = currentConfig[row.id]
    const newV = newConfig[row.id]

    const sOld = getValDisplay(row, oldV)
    const sNew = getValDisplay(row, newV)

    if (sOld !== sNew) {
      changes.push({
        label: row.name,
        oldVal: sOld,
        newVal: sNew,
      })
    }
  })

  if (changes.length === 0) {
    ElMessage.info('当前设置与预设相同，无需更改')
    return
  }

  const diff: PlayerDiff = {
    name: player,
    role: props.getPlayerRole?.(player) || 'Unknown',
    isNew: Object.keys(currentConfig).length === 0,
    changes,
    newConfig,
  }

  pendingPresetData.value = { player, preset, diff }
  showPresetConfirmDialog.value = true
}

function confirmApplyPreset() {
  if (!pendingPresetData.value?.diff)
    return

  const { player, preset, diff } = pendingPresetData.value
  const storageKey = getStorageKey(player)

  if (!config.value.playerBis[storageKey]) {
    config.value.playerBis[storageKey] = {}
  }

  Object.assign(config.value.playerBis[storageKey], diff.newConfig)

  showPresetConfirmDialog.value = false
  pendingPresetData.value = null
  ElMessage.success(`已应用预设: ${preset.name} (${player})`)
}

function getObtainedCount(player: string, row: BisRow): number {
  if (!props.records)
    return 0
  const keywords = row.keywords
    .replace(/，/g, ',')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (keywords.length === 0)
    return 0

  const logCount = props.records.filter((r) => {
    const actual = props.getActualPlayer
      ? props.getActualPlayer(r.player)
      : r.player
    if (actual !== player)
      return false
    return keywords.some(k => r.item.includes(k))
  }).length

  const storageKey = getStorageKey(player)
  const manual = config.value.manualObtained?.[storageKey]?.[row.id] || 0
  return Math.max(0, logCount + manual)
}

function getManualObtained(player: string, rowId: string): number {
  const key = getStorageKey(player)
  return config.value.manualObtained?.[key]?.[rowId] || 0
}

function setManualObtained(player: string, rowId: string, val: number) {
  const key = getStorageKey(player)
  if (!config.value.manualObtained)
    config.value.manualObtained = {}
  if (!config.value.manualObtained[key])
    config.value.manualObtained[key] = {}
  config.value.manualObtained[key]![rowId] = val
}

function hasObtained(player: string, row: BisRow): boolean {
  return getObtainedCount(player, row) > 0
}

function getLogicReason(player: string, row: BisRow): string {
  return getLogicDetails(player, row).reason
}

function getLogicStatus(
  player: string,
  row: BisRow,
): 'need' | 'greed' | 'pass' | 'assigned' {
  return getLogicDetails(player, row).status
}

function getLogicDetails(
  player: string,
  row: BisRow,
): {
  status: 'need' | 'greed' | 'pass' | 'assigned'
  reason: string
} {
  const customAlloc = customAllocations.value[row.id]

  // 1. 队长分配逻辑
  if (customAlloc) {
    if (customAlloc === player)
      return { status: 'assigned', reason: '队长指定分配 (最高优先级)' }
    return { status: 'pass', reason: '队长已指定给他人' }
  }

  // 2. 已被排除/请假
  if (excludedPlayers.value.has(player)) {
    return { status: 'pass', reason: '玩家已请假/被排除' }
  }

  // 3. 特殊物品兜底逻辑 (神典石/药/纤维 - ID在 SPECIAL_ITEMS 中且是 count 类型)
  const SPECIAL_ITEMS = ['coating', 'twine', 'tome', 'solvent']
  if (SPECIAL_ITEMS.includes(row.id) && row.type === 'count') {
    // 计算每个人基于“需求量”的基础状态
    const playerStatuses = eligiblePlayers.value.map((p) => {
      // 排除的人视为 Pass 且 infinite obtained (不参与 min 比较)
      if (excludedPlayers.value.has(p))
        return { p, status: 'pass' as const, obtained: Infinity }

      const pNeeded = getNeededCount(p, row.id)
      const pObtained = getObtainedCount(p, row)
      // 基础规则: 拿够了就 Pass, 没拿够 Need
      const s = pObtained >= pNeeded ? 'pass' : 'need'

      return { p, status: s, obtained: pObtained }
    })

    // 检查“有效玩家”是否全员 Pass
    const activeStatuses = playerStatuses.filter(x => !excludedPlayers.value.has(x.p))

    // 如果没有有效玩家，回归基础逻辑
    if (activeStatuses.length === 0) {
      return getBaseLogicDetails(player, row)
    }

    const allPass = activeStatuses.every(x => x.status === 'pass')

    if (allPass) {
      // 触发兜底贪婪
      const minObtained = Math.min(...activeStatuses.map(x => x.obtained))
      const myInfo = activeStatuses.find(x => x.p === player)

      if (!myInfo)
        return { status: 'pass', reason: '未知错误/无效玩家' }

      if (myInfo.obtained === minObtained) {
        return { status: 'greed', reason: `全员需求满足，作为获得最少者 (${myInfo.obtained}个) 兜底贪婪` }
      }
      return { status: 'pass', reason: `全员需求满足，但不是获得最少者 (${myInfo.obtained} > ${minObtained})` }
    }

    // 如果并非全员 Pass，则按基础逻辑返回
    return getBaseLogicDetails(player, row)
  }

  // 4. 其他常规物品
  return getBaseLogicDetails(player, row)
}

function getBaseLogicDetails(
  player: string,
  row: BisRow,
): { status: 'need' | 'greed' | 'pass', reason: string } {
  const obtained = getObtainedCount(player, row)

  if (row.type === 'count') {
    const needed = getNeededCount(player, row.id)
    if (obtained >= needed) {
      return { status: 'pass', reason: `已获得 ${obtained} 个 (需求 ${needed} 个)` }
    }
    return { status: 'need', reason: `需求 ${needed} 个，当前 ${obtained} 个` }
  }

  // Toggle 类型
  if (hasObtained(player, row)) {
    return { status: 'pass', reason: '已获得该装备' }
  }

  const val = getBisValue(player, row.id)
  if (val === 'raid') {
    return { status: 'need', reason: 'BIS 设为“零式” (需求，未获得)' }
  }
  return { status: 'greed', reason: 'BIS 设为“点数” (贪婪，未获得)' }
}

function calculateBaseStatus(
  player: string,
  row: BisRow,
): 'need' | 'greed' | 'pass' {
  return getBaseLogicDetails(player, row).status
}

function getOriginalStatus(
  player: string,
  row: BisRow,
): 'need' | 'greed' | 'pass' {
  return calculateBaseStatus(player, row)
}

function getStatusBaseText(player: string, row: BisRow): string {
  const status = getLogicStatus(player, row)
  return STATUS_MAP[status]?.text || ''
}

function isLegacyConfig(val: any): val is LegacyBisConfig {
  if (!val || typeof val !== 'object' || !val.playerBis)
    return false
  const firstKey = Object.keys(val.playerBis)[0]
  if (!firstKey)
    return false
  return Array.isArray(val.playerBis[firstKey])
}

function isEligible(player: string) {
  if (!props.getPlayerRole)
    return false
  const role = props.getPlayerRole(player)
  if (!role)
    return false
  return !role.startsWith('LEFT:') && !role.startsWith('SUB:')
}

function getCurrentMatchedPresetName(player: string) {
  const role = props.getPlayerRole?.(player)
  if (!role)
    return null

  const storageKey = getStorageKey(player)
  const currentConfig = config.value.playerBis[storageKey]
  if (!currentConfig || Object.keys(currentConfig).length === 0)
    return null

  const { recommended, others } = getPresetsForRole(role)
  const allPresets = [...recommended, ...others]

  for (const preset of allPresets) {
    let isMatch = true
    for (const key of Object.keys(preset.config)) {
      if (currentConfig[key] !== preset.config[key]) {
        isMatch = false
        break
      }
    }
    if (isMatch)
      return preset.name
  }
  return null
}

function hasAnyPresets(player: string) {
  const role = props.getPlayerRole?.(player)
  const presets = getPresetsForRole(role)
  return presets.recommended.length > 0 || presets.others.length > 0
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      return
    }

    let nextConfig: BisConfig

    if (isLegacyConfig(newVal)) {
      const migrated: BisConfig = { playerBis: {}, plannedWeeks: 8, manualObtained: {} }
      const raw = JSON.parse(JSON.stringify(newVal))
      Object.keys(raw.playerBis).forEach((player) => {
        migrated.playerBis[player] = {}
        const list = raw.playerBis[player]
        if (list) {
          list.forEach((id: string) => {
            if (migrated.playerBis[player]) {
              migrated.playerBis[player]![id] = 'raid'
            }
          })
        }
      })
      nextConfig = migrated
    }
    else {
      const standard = newVal as BisConfig
      nextConfig = {
        ...standard,
        plannedWeeks: standard.plannedWeeks ?? 8,
        manualObtained: standard.manualObtained ?? {},
        playerBis: JSON.parse(JSON.stringify(standard.playerBis || {})),
      }
    }

    // 确保所有有效玩家的计数型物品都有默认值 1
    eligiblePlayers.value.forEach((p) => {
      const key = getStorageKey(p)
      if (!nextConfig.playerBis[key])
        nextConfig.playerBis[key] = {}

      const pConfig = nextConfig.playerBis[key]!
      DEFAULT_ROWS.filter(r => r.type === 'count').forEach((r) => {
        if (typeof pConfig[r.id] !== 'number') {
          pConfig[r.id] = 1
        }
      })
    })

    if (JSON.stringify(nextConfig) !== JSON.stringify(config.value)) {
      config.value = nextConfig
    }
  },
  { immediate: true, deep: true },
)

watch(
  eligiblePlayers,
  (players) => {
    players.forEach((p) => {
      const key = getStorageKey(p)
      if (!config.value.playerBis[key]) {
        config.value.playerBis[key] = {}
      }

      const pConfig = config.value.playerBis[key]!
      DEFAULT_ROWS.filter(r => r.type === 'count').forEach((r) => {
        if (typeof pConfig[r.id] !== 'number') {
          pConfig[r.id] = 1
        }
      })
    })
  },
  { deep: true, immediate: true },
)

watch(
  config,
  (newVal) => {
    if (JSON.stringify(newVal) !== JSON.stringify(props.modelValue)) {
      emit('update:modelValue', newVal)
    }
  },
  { deep: true },
)

function getBisValue(player: string, rowId: string): BisValue | undefined {
  return config.value.playerBis[getStorageKey(player)]?.[rowId]
}

function isRaidBis(player: string, rowId: string) {
  return getBisValue(player, rowId) === 'raid'
}

function isTomeBis(player: string, rowId: string) {
  return getBisValue(player, rowId) === 'tome'
}

function getNeededCount(player: string, rowId: string): number {
  const val = getBisValue(player, rowId)
  if (typeof val !== 'number')
    throw new Error(`[BisAllocator] 数据异常: ${player} 在 ${rowId} 的值应为数字，实际为 ${val}`)
  return val
}

function getCellClass(player: string, row: BisRow): string {
  const status = getLogicStatus(player, row)
  const base = STATUS_MAP[status]?.class || ''
  return excludedPlayers.value.has(player) ? `${base} is-excluded` : base
}

const getRoleGroupClass = getRoleType
</script>

<template>
  <div class="bis-allocator">
    <div class="bis-toolbar">
      <el-button
        size="small"
        type="primary"
        plain
        class="setup-trigger-btn"
        @click="showConfigDialog = true"
      >
        <el-icon style="margin-right: 4px">
          <Setting />
        </el-icon>
        <span>设置 BIS</span>
        <span v-if="!isConfigComplete" class="dot-warn" />
      </el-button>

      <el-button
        size="small"
        plain
        class="setup-trigger-btn"
        @click="showCorrectionDialog = true"
      >
        <el-icon style="margin-right: 4px">
          <Edit />
        </el-icon>
        <span>野队获取修正</span>
      </el-button>

      <el-dropdown
        v-if="isConfigComplete"
        trigger="click"
        @command="handleCopyMacro"
      >
        <el-button size="small">
          复制分配宏<el-icon class="el-icon--right">
            <ArrowDown />
          </el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="all">
              全层
            </el-dropdown-item>
            <el-dropdown-item
              v-for="layer in layeredViewRows"
              :key="layer.name"
              :command="layer"
              divided
            >
              {{ layer.name }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-popover
        v-if="isConfigComplete"
        placement="top"
        title="分配宏生成规则"
        :width="320"
        trigger="hover"
      >
        <template #reference>
          <el-icon class="macro-help-icon">
            <QuestionFilled />
          </el-icon>
        </template>
        <div class="macro-help-content">
          <div class="intro">
            生成可以直接在游戏内发送的分配宏（/p）。
          </div>
          <div class="rule-item">
            <strong>1. 优先需求</strong>
            <span>仅显示BIS设为“零式”且尚未获得的玩家。</span>
          </div>
          <div class="rule-item">
            <strong>2. 次选贪婪</strong>
            <span>若无需求者，显示其余尚未获得的玩家。</span>
          </div>
          <div class="rule-item">
            <strong>3. 兜底机制</strong>
            <span>若全员不需要，显示“随便ROLL”。</span>
          </div>
        </div>
      </el-popover>
    </div>

    <div v-if="isConfigComplete" class="bis-view-panel">
      <div class="table-container">
        <table class="bis-table">
          <thead>
            <tr>
              <th class="sticky-col col-layer" style="z-index: 30" />
              <th class="sticky-col col-item" style="z-index: 30">
                装备 \ 玩家
              </th>
              <th
                v-for="p in eligiblePlayers"
                :key="p"
                :class="{ 'is-excluded': excludedPlayers.has(p) }"
              >
                <div class="premium-header-player">
                  <PlayerDisplay
                    :name="p"
                    :role="getPlayerRole?.(p)"
                    :show-only-role="showOnlyRole"
                  />
                  <div
                    class="leave-tag-trigger"
                    :class="{
                      'is-away': excludedPlayers.has(p),
                      'is-disabled': isPlayerAssigned(p),
                    }"
                    @click.stop="
                      isPlayerAssigned(p) ? null : togglePlayerExclusion(p)
                    "
                  >
                    <template v-if="excludedPlayers.has(p)">
                      <span>已请假</span>
                    </template>
                    <template v-else>
                      <el-icon style="margin-right: 2px">
                        <User />
                      </el-icon>
                      <span>请假</span>
                    </template>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="layer in layeredViewRows" :key="layer.name">
              <tr
                v-for="(row, rIdx) in layer.rows"
                :key="row.id"
                :class="{
                  'is-layer-end': rIdx === layer.rows.length - 1,
                }"
              >
                <td
                  v-if="rIdx === 0"
                  :rowspan="layer.rows.length"
                  class="sticky-col col-layer layer-cell"
                >
                  {{ layer.name }}
                </td>
                <td class="sticky-col col-item row-header">
                  <div class="equip-cell-content">
                    <span>{{ row.name }}</span>
                    <el-tooltip
                      v-model:visible="tooltipsOpen[row.id]"
                      placement="right"
                      trigger="click"
                      popper-class="captain-player-tooltip-new"
                      effect="dark"
                      :offset="15"
                      :hide-after="0"
                    >
                      <template #content>
                        <div class="tooltip-title">
                          将 <span>{{ row.name }}</span> 分配给
                        </div>
                        <div class="tooltip-player-list">
                          <div
                            v-for="p in eligiblePlayers"
                            :key="p"
                            class="tooltip-player-item"
                            :class="{
                              'is-disabled': excludedPlayers.has(p),
                              'is-active': customAllocations[row.id] === p,
                            }"
                            @click="
                              !excludedPlayers.has(p)
                                && (customAllocations[row.id] = p)
                            "
                          >
                            <div class="player-option-item">
                              <PlayerDisplay
                                :name="p"
                                :role="getPlayerRole?.(p)"
                                :show-only-role="showOnlyRole"
                              />
                              <span
                                class="mini-status-tag" :class="[
                                  getOriginalStatus(p, row),
                                ]"
                              >
                                {{ STATUS_MAP[getOriginalStatus(p, row)].text }}
                              </span>
                            </div>
                          </div>
                          <div
                            v-if="customAllocations[row.id]"
                            class="tooltip-divider"
                          />
                          <div
                            v-if="customAllocations[row.id]"
                            class="tooltip-player-item clear-btn"
                            @click="customAllocations[row.id] = ''"
                          >
                            <el-icon><Delete /></el-icon>
                            <span>取消分配</span>
                          </div>
                        </div>
                      </template>
                      <div
                        class="assign-tag-trigger"
                        :class="{
                          'is-active': customAllocations[row.id],
                          'is-open': tooltipsOpen[row.id],
                        }"
                      >
                        <template v-if="customAllocations[row.id]">
                          <PlayerDisplay
                            :name="customAllocations[row.id]!"
                            :role="
                              props.getPlayerRole?.(customAllocations[row.id]!)
                            "
                            :show-only-role="showOnlyRole"
                          />
                          <span class="p-status">已分配</span>
                        </template>
                        <template v-else>
                          <el-icon style="margin-right: 2px">
                            <Plus />
                          </el-icon>
                          <span>分配</span>
                        </template>
                      </div>
                    </el-tooltip>
                  </div>
                </td>
                <td
                  v-for="p in eligiblePlayers"
                  :key="p"
                  :class="getCellClass(p, row)"
                >
                  <div class="cell-status-container">
                    <el-tooltip
                      :content="getLogicReason(p, row)"
                      placement="auto"
                      :hide-after="0"
                      popper-class="bis-logic-tooltip"
                    >
                      <div class="status-text-wrapper">
                        <span class="status-main">{{
                          getStatusBaseText(p, row)
                        }}</span>
                        <span
                          v-if="
                            row.type === 'count' && getNeededCount(p, row.id) > 1
                          "
                          class="status-meta"
                        >
                          ({{ getObtainedCount(p, row) }}/{{
                            getNeededCount(p, row.id)
                          }})
                        </span>
                      </div>
                    </el-tooltip>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="logic-note">
        * 注：当某物品所有有效玩家都判定为放弃时，系统会自动找出“已获得数量最少”的玩家（可能有多人），将其状态改为贪婪 (Greed)。
      </div>
    </div>

    <div v-else class="bis-onboarding">
      <div class="onboarding-card">
        <div class="icon-circle">
          <el-icon><List /></el-icon>
        </div>
        <h3>开启 BIS 分配</h3>
        <p>尚未设置团队成员的 BIS，无法生成分配推荐。</p>
        <el-button type="primary" size="large" @click="showConfigDialog = true">
          立即开始设置
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="showConfigDialog"
      width="auto"
      append-to-body
      class="bis-config-dialog"
      destroy-on-close
      align-center
    >
      <div class="bis-config-panel-container">
        <div class="bis-config-header-row">
          <div class="bis-storage-info">
            <el-icon><InfoFilled /></el-icon>
            <span>提示：此 BIS 设置跟随职位（MT/ST等），不跟随具体玩家。</span>
          </div>
          <div class="planned-weeks-config">
            <span class="label">你们计划清几周CD：</span>
            <el-input-number
              v-model="config.plannedWeeks"
              :min="1"
              :max="16"
              size="small"
              controls-position="right"
              class="weeks-stepper"
            />
          </div>
        </div>
        <div v-if="validationAlerts.length > 0" class="validation-alerts">
          <div
            v-for="alert in validationAlerts"
            :key="alert.id"
            class="validation-alert" :class="[alert.type]"
          >
            <el-icon class="alert-icon">
              <InfoFilled v-if="alert.type === 'info'" />
              <Warning v-else />
            </el-icon>
            <span class="alert-msg">{{ alert.message }}</span>
          </div>
        </div>
        <div class="table-scroll-wrapper">
          <table class="bis-table config-table">
            <thead>
              <tr>
                <th class="sticky-col">
                  装备 \ 玩家
                </th>
                <th
                  v-for="p in eligiblePlayers"
                  :key="p"
                  :class="[
                    {
                      'header-incomplete': !checkPlayerComplete(
                        config,
                        getStorageKey(p),
                      ),
                    },
                    { 'is-excluded': excludedPlayers.has(p) },
                    getRoleGroupClass(getPlayerRole?.(p)),
                  ]"
                >
                  <div class="vert-header">
                    <PlayerDisplay
                      :name="p"
                      :role="getPlayerRole?.(p)"
                      :show-only-role="showOnlyRole"
                    />
                    <div class="header-action-area">
                      <span
                        v-if="!checkPlayerComplete(config, getStorageKey(p))"
                        class="incomplete-label"
                      >未填写</span>
                      <div class="preset-apply-zone">
                        <el-dropdown
                          v-if="hasAnyPresets(p)"
                          trigger="click"
                          popper-class="bis-preset-popper"
                          @command="(cmd: any) => applyPreset(p, cmd)"
                          @visible-change="
                            (v: boolean) =>
                              !v && expandedPlayerPresets.delete(p)
                          "
                        >
                          <el-button
                            size="small"
                            class="preset-btn"
                            :class="{
                              'is-matched': getCurrentMatchedPresetName(p),
                            }"
                          >
                            <el-icon
                              v-if="!getCurrentMatchedPresetName(p)"
                              class="magic-icon"
                            >
                              <MagicStick />
                            </el-icon>
                            <span
                              v-if="getCurrentMatchedPresetName(p)"
                              class="matched-name-inline"
                              :title="getCurrentMatchedPresetName(p) ?? ''"
                            >{{ getCurrentMatchedPresetName(p) }}</span>
                            <span v-else>一键预设</span>
                          </el-button>
                          <template #dropdown>
                            <el-dropdown-menu class="bis-preset-dropdown">
                              <!-- 推荐预设 -->
                              <el-dropdown-item
                                v-for="preset in getPresetsForRole(
                                  getPlayerRole?.(p),
                                ).recommended"
                                :key="preset.name"
                                :command="preset"
                              >
                                <div class="preset-item-content">
                                  <el-icon><MagicStick /></el-icon>
                                  <span>{{ preset.name }}</span>
                                </div>
                              </el-dropdown-item>

                              <!-- 逻辑：如果没有推荐项，直接显示全部；如果有且未展开，显示展开按钮 -->
                              <template
                                v-if="
                                  getPresetsForRole(getPlayerRole?.(p))
                                    .recommended.length === 0
                                "
                              >
                                <el-dropdown-item
                                  v-for="preset in getPresetsForRole(
                                    getPlayerRole?.(p),
                                  ).others"
                                  :key="preset.name"
                                  :command="preset"
                                >
                                  <div class="preset-item-content">
                                    <el-icon><MagicStick /></el-icon>
                                    <span>{{ preset.name }}</span>
                                  </div>
                                </el-dropdown-item>
                              </template>

                              <template
                                v-else-if="
                                  getPresetsForRole(getPlayerRole?.(p)).others
                                    .length > 0
                                "
                              >
                                <div
                                  v-if="!expandedPlayerPresets.has(p)"
                                  class="preset-expand-divider"
                                  @click.stop="expandedPlayerPresets.add(p)"
                                >
                                  <div class="divider-line" />
                                  <div class="expand-action">
                                    <span>更多同职能预设</span>
                                    <el-icon><ArrowDown /></el-icon>
                                  </div>
                                  <div class="divider-line" />
                                </div>
                                <template v-else>
                                  <el-dropdown-item
                                    v-for="(preset, idx) in getPresetsForRole(
                                      getPlayerRole?.(p),
                                    ).others"
                                    :key="preset.name"
                                    :command="preset"
                                    :divided="idx === 0"
                                  >
                                    <div class="preset-item-content">
                                      <el-icon><MagicStick /></el-icon>
                                      <span>{{ preset.name }}</span>
                                    </div>
                                  </el-dropdown-item>
                                </template>
                              </template>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                      </div>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in configRows" :key="row.id">
                <td class="sticky-col row-header" :class="[{ 'is-group-end': row.id === 'weapon' || row.id === 'feet' || row.id === 'ring' }]">
                  {{ row.name }}
                </td>
                <td
                  v-for="p in eligiblePlayers"
                  :key="p"
                  class="split-cell-container"
                  :class="[{ 'is-group-end': row.id === 'weapon' || row.id === 'feet' || row.id === 'ring' }]"
                >
                  <div v-if="row.type === 'toggle'" class="split-cell">
                    <div
                      class="half-cell left-raid"
                      :class="{ active: isRaidBis(p, row.id) }"
                      @click="setBis(p, row.id, 'raid')"
                    >
                      零式
                    </div>
                    <div
                      class="half-cell right-tome"
                      :class="{ active: isTomeBis(p, row.id) }"
                      @click="setBis(p, row.id, 'tome')"
                    >
                      点数
                    </div>
                  </div>

                  <div v-else class="count-cell">
                    <div class="count-wrapper">
                      <el-input-number
                        :model-value="getNeededCount(p, row.id)"
                        :min="0"
                        :max="8"
                        size="small"
                        controls-position="right"
                        class="mini-stepper"
                        @update:model-value="
                          (v) => setNeededCount(p, row.id, v || 0)
                        "
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <div class="footer-left">
            <el-button-group>
              <el-button size="small" @click="exportBisData">
                导出 BIS 设置
              </el-button>
              <el-button size="small" @click="importBisData">
                导入 BIS 设置
              </el-button>
            </el-button-group>
          </div>
          <div class="footer-right">
            <div class="config-status-msg">
              <span v-if="incompletePlayerCount > 0">
                还剩 {{ incompletePlayerCount }} 个职位的 BIS 尚未填完
              </span>
            </div>
            <el-button
              type="primary"
              size="small"
              @click="showConfigDialog = false"
            >
              完成并关闭
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showImportConfirmDialog"
      title="确认导入 BIS 设置"
      width="600px"
      append-to-body
      destroy-on-close
      align-center
    >
      <div v-if="importDiffs.length === 0" class="import-empty-msg">
        没有检测到有效的变更数据。
      </div>
      <div v-else class="import-diff-container">
        <p class="import-summary">
          检测到 {{ importDiffs.length }} 位玩家的设置变更。
        </p>
        <div v-for="diff in importDiffs" :key="diff.name" class="diff-card">
          <div class="diff-header">
            <PlayerDisplay
              :name="diff.name"
              :role="diff.role"
              :show-only-role="showOnlyRole"
            />
            <span v-if="diff.isNew" class="diff-tag">新设置</span>
            <span v-else class="diff-tag update">更新</span>
          </div>
          <div class="diff-items">
            <div
              v-for="(change, idx) in diff.changes"
              :key="idx"
              class="diff-row"
            >
              <span class="diff-label">{{ change.label }}</span>
              <div class="diff-values">
                <span class="val old" :class="getValClass(change.oldVal)">{{
                  change.oldVal
                }}</span>
                <el-icon><Right /></el-icon>
                <span class="val new" :class="getValClass(change.newVal)">{{
                  change.newVal
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer" style="justify-content: flex-end; gap: 12px">
          <el-button @click="showImportConfirmDialog = false">
            取消
          </el-button>
          <el-button
            type="primary"
            :disabled="importDiffs.length === 0"
            @click="confirmImportBis"
          >
            确认应用
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showPresetConfirmDialog"
      title="确认预设变更"
      width="600px"
      append-to-body
      destroy-on-close
      align-center
    >
      <div v-if="pendingPresetData?.diff" class="import-diff-container">
        <p class="import-summary">
          应用 [{{ pendingPresetData.preset.name }}] 将会产生以下变更：
        </p>
        <div class="diff-card">
          <div class="diff-header">
            <PlayerDisplay
              :name="pendingPresetData.diff.name"
              :role="pendingPresetData.diff.role"
              :show-only-role="showOnlyRole"
            />
            <span v-if="pendingPresetData.diff.isNew" class="diff-tag">新设置</span>
            <span v-else class="diff-tag update">更新</span>
          </div>
          <div class="diff-items">
            <div
              v-for="(change, idx) in pendingPresetData.diff.changes"
              :key="idx"
              class="diff-row"
            >
              <span class="diff-label">{{ change.label }}</span>
              <div class="diff-values">
                <span class="val old" :class="getValClass(change.oldVal)">{{
                  change.oldVal
                }}</span>
                <el-icon><Right /></el-icon>
                <span class="val new" :class="getValClass(change.newVal)">{{
                  change.newVal
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer" style="justify-content: flex-end; gap: 12px">
          <el-button @click="showPresetConfirmDialog = false">
            取消
          </el-button>
          <el-button type="primary" @click="confirmApplyPreset">
            确认应用
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showCorrectionDialog"
      title="野队已获得数修正"
      width="auto"
      append-to-body
      destroy-on-close
      align-center
    >
      <div class="bis-config-panel-container">
        <div class="bis-storage-info">
          <el-icon><InfoFilled /></el-icon>
          <span>此处记录玩家在固定队记录之外（如野队）获得的装备。最终统计 = 掉落记录数 + 野队修正数。</span>
        </div>
        <div class="table-scroll-wrapper">
          <table class="bis-table config-table">
            <thead>
              <tr>
                <th class="sticky-col">
                  装备 \ 玩家
                </th>
                <th
                  v-for="p in eligiblePlayers"
                  :key="p"
                  :class="[
                    { 'is-header-away': excludedPlayers.has(p) },
                    getRoleGroupClass(getPlayerRole?.(p)),
                  ]"
                >
                  <PlayerDisplay
                    :name="p"
                    :role="getPlayerRole?.(p)"
                    :show-only-role="showOnlyRole"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in configRows" :key="row.id">
                <td class="sticky-col row-header" :class="[{ 'is-group-end': row.id === 'weapon' || row.id === 'feet' || row.id === 'ring' }]">
                  {{ row.name }}
                </td>
                <td
                  v-for="p in eligiblePlayers"
                  :key="p"
                  class="count-cell" :class="[{ 'is-group-end': row.id === 'weapon' || row.id === 'feet' || row.id === 'ring' }]"
                >
                  <div class="correction-input-wrapper">
                    <el-input
                      :model-value="getManualObtained(p, row.id) || 0"
                      size="small"
                      class="mini-input correction-input"
                      :class="{ 'is-nonzero': getManualObtained(p, row.id) !== 0 }"
                      @input="v => setManualObtained(p, row.id, parseInt(v) || 0)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer" style="justify-content: flex-end">
          <el-button type="primary" size="small" @click="showCorrectionDialog = false">
            完成
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.bis-allocator {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.bis-toolbar {
  margin: 12px 12px 0px 12px;
  display: flex;
  align-items: center;
  min-height: 32px;

  // Element Plus 按钮自带左边距，我们不需要 gap
  :deep(.el-button + .el-button),
  :deep(.el-button + .el-dropdown),
  :deep(.el-dropdown + .el-button),
  :deep(.el-dropdown + .el-dropdown) {
    margin-left: 12px;
  }
}

.setup-trigger-btn {
  position: relative;
  font-weight: 600;
}

.macro-help-icon {
  color: #94a3b8;
  cursor: pointer;
  margin-left: 4px;
  font-size: 16px;
  outline: none;

  &:hover {
    color: #475569;
  }
}

.macro-help-content {
  font-size: 13px;
  line-height: 1.5;
  color: #334155;

  html.dark & {
    color: #e2e8f0;
  }

  .intro {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;

    html.dark & {
      color: #94a3b8;
      border-color: #334155;
    }
  }

  .rule-item {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    strong {
      display: block;
      color: #3b82f6;
      font-weight: 600;
      margin-bottom: 2px;
    }

    span {
      display: block;
      color: #475569;
      html.dark & {
        color: #cbd5e1;
      }
    }
  }
}

.bis-onboarding {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 8px;
  margin: 0 12px 12px;
  border: 2px dashed #e2e8f0;
}

.onboarding-card {
  text-align: center;
  max-width: 400px;
  padding: 40px;

  h3 {
    font-size: 20px;
    color: #1e293b;
    margin: 16px 0 8px;
  }
  p {
    color: #64748b;
    margin-bottom: 24px;
    line-height: 1.6;
  }
}

.icon-circle {
  width: 64px;
  height: 64px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto;
}

.bis-config-dialog {
  :deep(.el-dialog) {
    width: fit-content !important;
    min-width: 600px;
    max-width: 95vw !important;
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
  }

  :deep(.el-dialog__body) {
    padding: 20px;
    padding-top: 10px;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.config-status-msg {
  color: #f56c6c;
  font-size: 13px;
  font-weight: 600;
}

.bis-view-panel {
  flex: 1;
  overflow: auto;
  border-radius: 6px;
  background: #f8fafc;
  padding: 12px;
  padding-top: 0;
  box-shadow: none;

  .table-container {
    max-width: 1400px;
    margin: 0 auto;
  }
}

.bis-storage-info {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;

  html.dark & {
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
  }
}

.bis-config-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;

  .bis-storage-info {
    margin-bottom: 0;
    flex: 1;
  }
}

.planned-weeks-config {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;

  html.dark & {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    html.dark & {
      color: #94a3b8;
    }
  }

  .weeks-stepper {
    width: 80px !important;
  }
}

.captain-alloc-menu {
  width: 240px;
  padding: 0;
  // 移除自定义背景和边框，使用 Element Plus 默认风格
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;

  .captain-menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 4px;
    font-size: 11px;
    font-weight: bold;
    color: #94a3b8 !important; // 强制灰蓝色
    text-transform: uppercase;
    letter-spacing: 0.03em;

    span {
      color: #94a3b8 !important; // 再次确保文字不红
    }

    .el-button {
      padding: 0;
      height: auto;
      font-size: 11px;
      color: #f87171 !important; // 仅清空按钮红
    }
  }

  .captain-menu-scroll {
    max-height: 480px;
    overflow-y: auto;
    padding-bottom: 4px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.3);
      border-radius: 2px;
    }
  }

  .layer-group-title {
    padding: 4px 16px 2px;
    font-size: 10px;
    font-weight: bold;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    opacity: 0.8;
  }

  .alloc-row-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0px 12px 0px 16px; // 极致压缩垂直间距
    gap: 4px; // 缩小 gap

    .item-name {
      font-size: 11px;
      color: #71717a;
      white-space: nowrap;
      html.dark & {
        color: #a1a1aa;
      }
    }

    .compact-assign-trigger {
      width: 90px;
      height: 18px; // 强制更矮
      background: rgba(0, 0, 0, 0.03);
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 6px;
      cursor: pointer;
      transition: all 0.2s;

      .trigger-text {
        font-size: 10px; // 字体微调
        color: #71717a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .trigger-icon {
        font-size: 9px;
        color: #94a3b8;
      }

      &:hover {
        background: #fff;
        border-color: #3b82f6;
        .trigger-text {
          color: #3b82f6;
        }
      }

      &.has-val {
        background: #f0fdf4;
        border-color: #bbf7d0;
        .trigger-text {
          color: #16a34a;
          font-weight: 700;
        }
      }

      html.dark & {
        background: rgba(255, 255, 255, 0.05);
        border-color: #334155;
        .trigger-text {
          color: #9ca3af;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #3b82f6;
        }

        &.has-val {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
          .trigger-text {
            color: #10b981;
          }
        }
      }
    }
  }
}

.exclude-players-menu {
  width: 200px;
  padding: 0;

  .captain-menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 4px;
    font-size: 11px;
    font-weight: bold;
    color: #94a3b8 !important;
    text-transform: uppercase;
    letter-spacing: 0.03em;

    span {
      color: #94a3b8 !important;
    }

    .el-button {
      padding: 0;
      height: auto;
      font-size: 11px;
      color: #f87171 !important;
    }
  }

  .exclude-menu-scroll {
    max-height: 300px;
    overflow-y: auto;
    padding: 4px 0;
  }
}

.player-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px; // 缩小 gap
}

// 队长分配专用下拉框样式
.captain-player-popper {
  :deep(.el-select-dropdown__wrap) {
    max-height: none !important; // 移除滚动条高度限制
  }
  :deep(.el-select-dropdown__list) {
    padding: 2px 0;
  }
  :deep(.el-select-dropdown__item) {
    height: 26px !important; // 压缩行高
    line-height: 26px !important;
    padding: 0 12px;

    &.is-disabled {
      background-color: transparent !important;
    }
  }
}

.mini-status-tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: bold;
  line-height: 1;

  &.need {
    color: #16a34a;
    background: #f0fdf4;
    html.dark & {
      color: #4ade80;
      background: rgba(22, 163, 74, 0.2);
    }
  }
  &.greed {
    color: #0284c7;
    background: #f0f9ff;
    html.dark & {
      color: #38bdf8;
      background: rgba(12, 74, 110, 0.2);
    }
  }
  &.pass {
    color: #94a3b8;
    background: #f8fafc;
    html.dark & {
      color: #64748b;
      background: rgba(255, 255, 255, 0.05);
    }
  }
}

.validation-alerts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.validation-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;

  &.info {
    background: #f0f9ff;
    color: #0369a1;
    border: 1px solid #e0f2fe;
    html.dark & {
      background: rgba(14, 165, 233, 0.1);
      border-color: rgba(14, 165, 233, 0.2);
    }
  }

  &.warning {
    background: #fff1f2;
    color: #be123c;
    border: 1px solid #ffe4e6;
    html.dark & {
      background: rgba(244, 63, 94, 0.1);
      border-color: rgba(244, 63, 94, 0.2);
    }
  }

  .alert-icon {
    font-size: 14px;
  }
}

.bis-config-panel-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: fit-content;
  margin: 0 auto;
}

.table-scroll-wrapper {
  margin: 0 auto;
  width: fit-content;
  max-width: 100%;
  border: 1px solid #475569;
  border-radius: 8px;
  overflow: auto;
  background: #fff;
  max-height: 75vh;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: radial-gradient(white, black);

  &.is-editing {
    border-color: #3b82f6;
  }
}

.bis-table {
  width: max-content;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
  border: none;

  th,
  td {
    box-sizing: border-box;
    text-align: center;
    width: 90px;
    min-width: 90px;
    max-width: 90px;
    padding: 0 !important;
    height: 32px;
    border-right: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
    vertical-align: middle;

    &:last-child {
      border-right: 1px solid #475569;
    }
  }

  tr.is-group-end td,
  tr.is-group-end th {
    border-bottom: 2px solid #475569 !important;
  }

  tr:last-child td {
    border-bottom: 1px solid #475569;
  }

  th {
    background: #f1f5f9;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    color: #475569;
    border-top: 1px solid #475569;
    border-bottom: 1px solid #94a3b8;
  }

  tr.is-layer-end td {
    border-bottom: 1px solid #475569;
  }

  .col-layer {
    width: 32px;
    min-width: 32px;
    max-width: 32px;
    left: 0;
    border-left: 1px solid #475569;
    border-right: 1px solid #475569;
  }

  .col-item {
    width: 85px;
    min-width: 85px;
    max-width: 85px;
    font-weight: 700;
    color: #334155;
    border-right: 1px solid #475569;
  }

  .layer-cell {
    background: #f8fafc;
    color: #1e293b;
    font-weight: 800;
    font-size: 11px;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0;
    padding: 0;
    line-height: 1.1;
    text-shadow: none;
    border-bottom-color: #475569;
  }

  td.col-item {
    background: #f8fafc;
  }

  &.config-table {
    width: max-content;

    border: none !important;

    tr:first-child th {
      border-top: none !important;
    }

    .sticky-col {
      width: 72px;
      border-left: none !important;
      border-right: 1px solid #475569;
    }

    th:last-child,
    td:last-child {
      border-right: none !important;
    }

    tr:last-child td {
      border-bottom: none !important;
    }

    th,
    td {
      width: 100px;
      min-width: 100px;
      max-width: 100px;
      border-right: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      overflow: hidden;

      &.is-group-end {
        border-bottom: 1px solid #475569 !important;
      }
    }

    th {
      height: auto !important;
      padding: 4px 0 !important;

      :deep(.player-display) {
        flex-direction: column;
        gap: 0;
        width: 100%;

        .p-name {
          font-size: 10px;
          max-width: 90px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .role-tag {
          transform: scale(0.8);
          margin-bottom: -2px;
        }
      }
    }
  }
}

.premium-header-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0;

  :deep(.player-display) {
    flex-direction: column;
    gap: 0;
  }

  .leave-tag-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 18px;
    min-width: 48px;
    padding: 0 4px;
    border-radius: 4px;
    background: transparent;
    color: #94a3b8;
    font-size: 10px;
    cursor: pointer;
    user-select: none;
    font-weight: 800;
    opacity: 0.6;
    transition: opacity 0.2s ease;
    border: 1px solid transparent;

    span {
      color: inherit;
    }

    &:hover:not(.is-disabled) {
      opacity: 1;
      background: rgba(59, 130, 246, 0.08);
      color: #3b82f6;
      border-color: rgba(59, 130, 246, 0.15);
    }

    &.is-away {
      opacity: 1 !important;
      background: #f87171 !important;
      color: #ffffff !important;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(248, 113, 113, 0.3);
      border: none;

      span {
        color: #ffffff !important;
      }

      &:hover {
        background: #ef4444 !important;
      }
    }

    &.is-disabled {
      opacity: 0.1;
      cursor: not-allowed;
    }

    html.dark & {
      color: #64748b;

      &:hover:not(.is-disabled) {
        background: rgba(255, 255, 255, 0.05);
        color: #f1f5f9;
        border-color: rgba(255, 255, 255, 0.1);
      }

      &.is-away {
        background: #ef4444 !important;
        color: #ffffff !important;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        border: none;

        span {
          color: #ffffff !important;
        }
      }
    }
  }

}

.equip-cell-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 0 4px;
  gap: 0;
  height: 100%;
  overflow: hidden;

  span {
    font-size: 11px;
    color: #475569;
    font-weight: 700;
    white-space: nowrap;
    html.dark & {
      color: #94a3b8;
    }
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  .assign-tag-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 16px;
    width: auto;
    min-width: 32px;
    padding: 0 3px;
    flex-shrink: 0;
    border-radius: 2px;
    color: #64748b;
    font-size: 9px;
    cursor: pointer;
    user-select: none;
    font-weight: 500;
    opacity: 0.8;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    overflow: hidden;
    white-space: nowrap;

    span {
      display: inline;
    }

    &:hover, &.is-active, &.is-open {
      width: auto;
      min-width: 32px;
      padding: 0 3px;
      opacity: 1;

      span {
        display: inline;
      }
    }

    span {
      color: inherit;
    }

    &.is-open {
      opacity: 1 !important;
      background: #dcfce7 !important;
      color: #10b981 !important;
      border-color: #10b981 !important;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.15) !important;

      span {
        color: #10b981 !important;
        font-weight: 900 !important;
      }
    }

    &:hover {
      opacity: 1;
      background: rgba(16, 185, 129, 0.08);
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.15);
    }

    &.is-active {
      display: inline-flex;
      width: auto;
      height: 14px;
      opacity: 1 !important;
      background: transparent !important; /* 彻底移除绿色底 */
      border: none !important;
      box-shadow: none;
      padding: 0;
      margin-left: -2px;

      :deep(.player-display) {
        transform: scale(0.9);
        .player-name-text { display: none !important; }
      }

      .p-status {
        display: none !important;
      }

      &:hover {
        opacity: 0.8 !important;
      }
    }

    html.dark & {
      color: #64748b;

      &.is-open {
        opacity: 1 !important;
        background: rgba(16, 185, 129, 0.35) !important;
        color: #34d399 !important;
        border-color: #10b981 !important;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2) !important;

        span {
          color: #34d399 !important;
        }
      }

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #10b981;
        border-color: rgba(16, 185, 129, 0.2);
      }

      &.is-active {
        background: transparent !important;
        color: #10b981 !important;
        box-shadow: none;
        border: none;

        span {
          color: #10b981 !important;
        }
      }
    }
  }
}

.cell-status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  height: 100%;
}

.status-main {
  font-weight: 700;
}

.status-meta {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.8;
  margin-top: 2px;
}

.status-text-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vert-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}

.header-action-area {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.incomplete-label {
  font-size: 10px;
  font-weight: 700;
  color: #fff !important;
  background: #f87171;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.2;
  box-shadow: 0 2px 4px rgba(248, 113, 113, 0.2);
}

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 10;
}

.bis-table th.sticky-col {
  z-index: 20;
}

.preset-expand-divider {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;

  .divider-line {
    flex: 1;
    height: 1px;
    background: #e2e8f0;

    html.dark & {
      background: #334155;
    }
  }

  .expand-action {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    white-space: nowrap;

    &:hover {
      color: #3b82f6;
    }
  }

  &:hover {
    .expand-action {
      color: #3b82f6;
    }
    .divider-line {
      background: #cbd5e1;
    }
  }
}

.bis-preset-dropdown {
  max-height: 320px;
  overflow-y: auto;

  :deep(.el-dropdown-menu__item) {
    padding: 0 8px;
    line-height: 20px;
    height: auto;
    font-size: 12px;

    .el-icon {
      font-size: 12px;
      margin-right: 4px;
    }
  }
}

.status-need {
  background-color: #dcfce7 !important;
  color: #15803d !important;
}
.status-greed-tome {
  background-color: #f0f9ff !important;
  color: #0369a1 !important;
}
.status-pass {
  background-color: #f8fafc !important;
  color: #94a3b8 !important;
}
.status-assigned {
  background-color: #f0fdf4 !important;
  color: #16a34a !important;
  font-weight: 800;
  border: 1px solid #bbf7d0 !important;
  z-index: 1;
}

.row-header {
  text-align: center !important;
}

.split-cell {
  background: #f1f5f9;
  border-radius: 8px;
  margin: 0 auto;
  padding: 3px;
  display: flex;
  gap: 4px;
  width: 92px;
  height: 28px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  box-sizing: border-box;
}

.half-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 1px;
  white-space: nowrap;

  &.left-raid.active {
    background: #6366f1;
    color: #fff;
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
  }

  &.right-tome.active {
    background: #0ea5e9;
    color: #fff;
    box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);
  }

  &:not(.active):hover {
    background: #fff;
    color: #64748b;
  }
}

.count-value {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: #64748b;
  font-size: 12px;
}

.mini-stepper {
  width: 76px !important;
  :deep(.el-input__wrapper) {
    padding-left: 8px;
    padding-right: 30px;
    box-shadow: 0 0 0 1px #e2e8f0 inset;
    background-color: #f8fafc;
    &:hover,
    &.is-focus {
      box-shadow: 0 0 0 1px #3b82f6 inset;
    }
  }
  :deep(.el-input-number__increase),
  :deep(.el-input-number__decrease) {
    width: 24px;
    background: #f1f5f9;
    border-left: 1px solid #e2e8f0;
    color: #64748b;
    &:hover {
      color: #3b82f6;
      background: #eff6ff;
    }
  }
}

.preset-apply-zone {
  display: flex;
  justify-content: center;
}

.preset-btn {
  height: 20px;
  padding: 0 6px;
  overflow: hidden;
  font-size: 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;

  &:hover {
    background: #f1f5f9;
    color: #334155;
    border-color: #cbd5e1;
    transform: translateY(-1.5px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: translateY(0);
  }

  .magic-icon {
    margin-right: 2px;
    font-size: 10px;
    color: #f59e0b; /* Amber icon for 'Magic' feel without clashing bg */
    flex-shrink: 0;
  }

  &.is-matched {
    color: #3b82f6 !important;
    border-color: #3b82f6 !important;
    background: #eff6ff !important;

    html.dark & {
      background: rgba(59, 130, 246, 0.1) !important;
    }
  }

  .matched-name-inline {
    display: inline-block;
    max-width: 85px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: normal;
    font-size: 10px;
  }
}

.preset-item-content {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
  font-weight: 500;

  .el-icon {
    color: #f59e0b;
    font-size: 14px;
  }
}

html.dark {
  .preset-btn {
    background: #1e1f29 !important;
    border-color: #334155 !important;
    color: #94a3b8 !important;

    &:hover {
      background: #2a2b36 !important;
      color: #e2e8f0 !important;
      border-color: #475569 !important;
    }
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

html.dark {
  .bis-allocator {
    .config-header-actions {
      background: #1e1f29;
      border-color: rgba(255, 255, 255, 0.1);
    }

    .bis-view-panel {
      background: #16171f;
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow: none;
    }

    .bis-table {
      th,
      td {
        border-right-color: #334155;
        border-bottom-color: #1e1f29;
      }

      th {
        border-top-color: #1e293b;
        background: #1e1f29;
        color: #94a3b8;
        border-bottom-color: #475569;
      }

      tr.is-layer-end td {
        border-bottom-color: #475569;
      }

      .col-layer {
        background: #1e1f29;
        border-left-color: #475569;
        border-right-color: #475569;
      }

      .col-item {
        background: #1e1f29;
        border-right-color: #475569;
      }

      .layer-cell {
        background: #1e1f29;
        color: #cbd5e1;
        border-bottom-color: #475569;
      }

      td.col-item {
        background: #1e1f29;
      }

      .status-need {
        background-color: #064e3b !important;
        color: #6ee7b7 !important;
      }
      .status-greed-tome {
        background-color: #0c4a6e !important;
        color: #7dd3fc !important;
      }
      .status-pass {
        background-color: #1e293b !important;
        color: #64748b !important;
      }
      .status-assigned {
        background-color: #10b981 !important;
        color: #064e3b !important;
        font-weight: 800;
        border-color: #34d399;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
        transform: scale(1.02);
      }
    }

    .row-header {
      color: #94a3b8;
    }

    .bis-onboarding {
      background: #16171f;
      border-color: rgba(255, 255, 255, 0.08);
    }

    .onboarding-card {
      h3 {
        color: rgba(255, 255, 255, 0.9);
      }
      p {
        color: #94a3b8;
      }
    }

    .icon-circle {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
  }
}

.import-diff-container {
  max-height: 500px;
  overflow-y: auto;
  padding: 4px;
}

.import-empty-msg {
  text-align: center;
  padding: 40px;
  color: #64748b;
  font-size: 14px;
}

.import-summary {
  margin-bottom: 16px;
  color: #475569;
  font-weight: 600;
  font-size: 14px;
}

.diff-card {
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
  overflow: hidden;

  html.dark & {
    background: #1e1f29;
    border-color: #334155;
  }
}

.diff-header {
  padding: 12px 16px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;

  html.dark & {
    background: #2a2b36;
    border-bottom-color: #334155;
  }
}

.diff-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  background: #dcfce7;
  color: #15803d;

  &.update {
    background: #e0f2fe;
    color: #0369a1;
  }
}

.diff-items {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diff-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #e2e8f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  html.dark & {
    border-bottom-color: #334155;
  }
}

.diff-label {
  color: #64748b;
  min-width: 60px;
}

.diff-values {
  display: flex;
  align-items: center;
  gap: 8px;

  .val {
    font-weight: 700;

    &.old {
      color: #94a3b8;
      text-decoration: line-through;
      opacity: 0.6;
    }

    &.new {
      color: #3b82f6;
    }

    &.is-raid {
      color: #15803d !important;
      html.dark & {
        color: #6ee7b7 !important;
      }
    }

    &.is-tome {
      color: #0369a1 !important;
      html.dark & {
        color: #7dd3fc !important;
      }
    }
  }
}

.is-excluded {
  opacity: 0.4;
  text-decoration: line-through;
  filter: grayscale(1);
  background-color: rgba(0, 0, 0, 0.02) !important;

  html.dark & {
    background-color: rgba(255, 255, 255, 0.05) !important;
  }
}

.correction-input-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  .correction-input {
    width: 32px !important;
    height: 20px;

    :deep(.el-input__wrapper) {
      padding: 0;
      text-align: center;
      background: transparent;
      box-shadow: none;
      border-bottom: 1px solid transparent;
      border-radius: 0;
      height: 20px;

      &:hover, &.is-focus {
        border-bottom-color: #3b82f6;
      }
    }

    :deep(.el-input__inner) {
      height: 20px;
      line-height: 20px;
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      font-size: 11px;
      color: #94a3b8;
    }

    &.is-nonzero {
      :deep(.el-input__inner) {
        color: #3b82f6;
      }
      :deep(.el-input__wrapper) {
        border-bottom-color: #3b82f6;
      }
    }

    html.dark & {
      :deep(.el-input__wrapper) {
        border-bottom-color: #334155;
      }
      &.is-nonzero :deep(.el-input__inner) {
        color: #60a5fa;
      }
    }
  }
}

.is-header-away {
  opacity: 0.6;
}

.logic-note {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  font-style: italic;
}
</style>

<style lang="scss">
html.dark {
  .bis-config-dialog,
  .bis-import-message-box {
    .el-dialog,
    .el-message-box {
      background-color: #1a1b26;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
  }

  .table-scroll-wrapper {
    background: #1a1b26;
    border-color: #2d2e3d;
    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    &::-webkit-scrollbar-thumb {
      background: #2d2e3d;
      border-radius: 4px;
    }
  }

  .bis-table {
    background-color: #1a1b26;
    border-top: 1px solid #2d2e3d;

    th {
      background-color: #1a1b26 !important;
      color: #9ca3af;
      border-right-color: #2d2e3d;
      border-bottom: 2px solid #232433;
      font-weight: 600;
    }

    td {
      background-color: #1a1b26 !important;
      border-right-color: #2d2e3d;
      border-bottom-color: #232433;
      color: #d1d5db;
    }

  }

  .header-incomplete {
    background-color: rgba(244, 63, 94, 0.1) !important;
    color: #fb7185 !important;
  }

  .split-cell {
    background: #1a1b26;
    border-color: #2d2e3d;
    padding: 3px;
  }

  .half-cell:not(.active) {
    color: #4b5563;
    &:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #9ca3af;
    }
  }

  .half-cell.active {
    &.left-raid {
      background: #4f46e5;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.3),
        0 0 10px rgba(79, 70, 229, 0.2);
    }
    &.right-tome {
      background: #0284c7;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.3),
        0 0 10px rgba(2, 132, 199, 0.2);
    }
  }

  .mini-stepper {
    .el-input__wrapper {
      background-color: #1a1b26 !important;
      border: 1px solid #2d2e3d !important;
      box-shadow: none !important;
    }
    .el-input-number__increase,
    .el-input-number__decrease {
      background: #11121d !important;
      border-color: #2d2e3d !important;
      color: #6b7280 !important;
      &:hover {
        background: #1a1b26 !important;
        color: #3b82f6 !important;
      }
    }
    .el-input__inner {
      color: #e5e7eb !important;
    }
  }

  .row-header {
    color: #9ca3af;
    background-color: #1a1b26 !important;
  }

  .sticky-col {
    background-color: #1a1b26 !important;
    border-right-color: #2d2e3d !important;
  }

  .bis-import-message-box {
    .el-textarea__inner {
      background-color: #11121d;
      color: #d1d5db;
      border-color: #2d2e3d;
      &:focus {
        border-color: #3b82f6;
      }
    }
  }
}

.bis-import-message-box {
  .el-textarea__inner {
    min-height: 84px !important;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }
}
</style>

<style lang="scss">
// 队长分配专用下拉框全局样式 (处理 Teleport)
.el-popper.captain-player-popper,
.el-popper.captain-player-tooltip-new {
  background: #ffffff !important;
  border: 1px solid #e4e7ed !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  padding: 4px !important;

  .el-select-dropdown__wrap {
    max-height: none !important;
  }

  .tooltip-title {
    padding: 4px 8px;
    font-size: 14px;
    color: #475569;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 8px;
    font-weight: 600;

    span {
      font-weight: 700;
      color: #1e293b;
      margin: 0 2px;
    }

    html.dark & {
      color: #94a3b8;
      border-bottom-color: rgba(255, 255, 255, 0.1);
      span {
        color: #f1f5f9;
      }
    }
  }

  .tooltip-player-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 140px;
  }

  .tooltip-player-item {
    padding: 2px 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover:not(.is-disabled) {
      background: rgba(0, 0, 0, 0.05);
    }
    &.is-active {
      background: rgba(59, 130, 246, 0.1);
    }
    &.is-disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    &.clear-btn {
      color: #f87171;
      font-size: 10px;
      font-weight: bold;
      text-align: center;
      padding: 4px 0;
      &:hover {
        background: rgba(248, 113, 113, 0.05);
      }
    }
  }

  .tooltip-divider {
    height: 1px;
    background: #e4e7ed;
    margin: 3px 0;
  }

  .el-popper__arrow {
    &::before {
      background: #ffffff !important;
      border: 1px solid #e4e7ed !important;
      border-top: none !important; // 移除旋转后的“右侧”边框
      border-right: none !important; // 移除旋转后的“右侧”边框
    }
  }

  html.dark & {
    background: #1e293b !important;
    border-color: #334155 !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;

    .tooltip-player-item:hover:not(.is-disabled) {
      background: rgba(255, 255, 255, 0.1);
    }
    .tooltip-divider {
      background: #334155;
    }

    .el-popper__arrow::before {
      background: #1e293b !important;
      border: 1px solid #334155 !important;
      border-top: none !important;
      border-right: none !important;
    }
  }
}

.el-popper.bis-logic-tooltip {
  padding: 4px 8px !important;
  font-size: 11px !important;
  line-height: 1.4 !important;
  min-width: auto !important;
  border-radius: 4px !important;
  background: #1e293b !important;
  color: #ffffff !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;

  .el-popper__arrow::before {
    background: #1e293b !important;
    border: none !important;
  }
}
</style>
