<script setup lang="ts">
import type { CheckboxValueType } from 'element-plus'
import type { ImportedColumnPayload, MitigationPlayerActionsV4Data } from '@/composables/mitigation/useMitigationImportCodec'
import type { ColumnDef, MitigationRow, MitigationSkill, PlayerActionRecord } from '@/types/mitigation'
import { Edit, Filter, Plus, Rank } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as LZString from 'lz-string'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { isMitigationPlayerActionsImportData, parseMitigationImportText } from '@/composables/mitigation/useMitigationImportCodec'
import { createActionId } from '@/utils/actionId'
import { copyToClipboard } from '@/utils/clipboard'
import { getFirstChargeDeficitTime } from '@/utils/mitigationCharges'
import { EXTREME_DAMAGE_THRESHOLD } from '@/utils/mitigationConstants'
import { getMitigationGridColumnWidth, MITIGATION_GRID_WIDTH } from '@/utils/mitigationGridLayout'
import { formatTime } from '@/utils/time'
import Util from '@/utils/util'
import { handleImgError } from '@/utils/xivapi'

type AutoArrangeStrategy = 'max-total' | 'tb-priority' | 'peak-smoothing'
type AutoArrangeCoverageScope = 'self' | 'party'
type AutoArrangeExclusiveScope = 'single' | 'group'
type ContextOverlayId = 'mechanic-ctx' | 'mechanic-edit-ctx' | 'column-ctx' | 'skill-ctx'
type DamageNumberDisplayUnit = 'k' | 'w'

const props = defineProps<{
  rows: MitigationRow[]
  allRows?: MitigationRow[]
  columns: ColumnDef[]
  partyCompositionJobOptions?: Array<{ value: number, label: string }>
  mechanicOptions?: Array<{ actionId: string, action: string }>
  filterMechanics?: string[]
  isDebug?: boolean
  playerActions: PlayerActionRecord[]
  mechanicColors: Record<string, string>
  autoArrangeToleranceSeconds?: number
  damageNumberDisplayUnit?: DamageNumberDisplayUnit
}>()

const emit = defineEmits<{
  (e: 'update:filterMechanics', filter: string[]): void
  (e: 'update:playerActions', actions: PlayerActionRecord[]): void
  (e: 'update:columns', cols: ColumnDef[]): void
  (e: 'update:rows', rows: MitigationRow[]): void
  (e: 'renameMechanic', originalName: string, actionId: string): void
  (e: 'partyColumnAdd', afterColKey?: string): void
  (e: 'partyColumnRemove', colKey: string): void
  (e: 'partyColumnChangeJob', payload: { colKey: string, jobEnum: number }): void
  (e: 'partyColumnReorder', orderedKeys: string[]): void
}>()

const EXCLUSIVE_GROUP_BY_SKILL_ID = new Map<number, string>([
  [7549, 'exclusive-feint'], // 牵制
  [7560, 'exclusive-addle'], // 昏乱
  [7535, 'exclusive-reprisal'], // 雪仇
  [16012, 'exclusive-ranged'], // 防守之桑巴
  [7405, 'exclusive-ranged'], // 行吟
  [16889, 'exclusive-ranged'], // 策动
  [34685, 'exclusive-pct'], // 坦培拉涂层
  [34686, 'exclusive-pct'], // 油性坦培拉涂层
])
const DAMAGE_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})
const damageNumberDisplayUnit = computed<DamageNumberDisplayUnit>(() => props.damageNumberDisplayUnit === 'k' ? 'k' : 'w')

const allMechanics = computed(() => props.mechanicOptions ?? [])
const sourceRows = computed(() => (props.allRows && props.allRows.length > 0) ? props.allRows : props.rows)

function isAoeLike(row: Pick<MitigationRow, 'isAOE' | 'isShare'>) {
  return row.isAOE || !!row.isShare
}

const mechanicTypeMap = computed(() => {
  const map = new Map<string, { isAOE: boolean, isTB: boolean, isShare: boolean }>()
  sourceRows.value.forEach((row) => {
    if (!map.has(row.actionId))
      map.set(row.actionId, { isAOE: row.isAOE, isTB: row.isTB, isShare: !!row.isShare })
  })
  return map
})

const currentFilters = computed(() => props.filterMechanics ?? [])
const currentFilterSet = computed(() => new Set(currentFilters.value))

const aoeMechanics = computed(() => allMechanics.value.filter((mechanic) => {
  const type = mechanicTypeMap.value.get(mechanic.actionId)
  return !!type?.isAOE && !type.isShare
}))
const shareMechanics = computed(() => allMechanics.value.filter(m => mechanicTypeMap.value.get(m.actionId)?.isShare))
const tbMechanics = computed(() => allMechanics.value.filter(m => mechanicTypeMap.value.get(m.actionId)?.isTB))
const normalMechanics = computed(() => allMechanics.value.filter((mechanic) => {
  const type = mechanicTypeMap.value.get(mechanic.actionId)
  return !type?.isAOE && !type?.isTB && !type?.isShare
}))

function getGroupSelectionState(items: Array<{ actionId: string }>) {
  if (items.length === 0)
    return { selected: false, indeterminate: false }

  const selectedCount = items.filter(item => currentFilterSet.value.has(item.actionId)).length
  return {
    selected: selectedCount === items.length,
    indeterminate: selectedCount > 0 && selectedCount < items.length,
  }
}

const aoeSelectionState = computed(() => getGroupSelectionState(aoeMechanics.value))
const shareSelectionState = computed(() => getGroupSelectionState(shareMechanics.value))
const tbSelectionState = computed(() => getGroupSelectionState(tbMechanics.value))
const normalSelectionState = computed(() => getGroupSelectionState(normalMechanics.value))

const isAOESelected = computed(() => aoeSelectionState.value.selected)
const isIndeterminateAOE = computed(() => aoeSelectionState.value.indeterminate)
const isShareSelected = computed(() => shareSelectionState.value.selected)
const isIndeterminateShare = computed(() => shareSelectionState.value.indeterminate)
const isTBSelected = computed(() => tbSelectionState.value.selected)
const isIndeterminateTB = computed(() => tbSelectionState.value.indeterminate)
const isNormalSelected = computed(() => normalSelectionState.value.selected)
const isIndeterminateNormal = computed(() => normalSelectionState.value.indeterminate)

function toggleMechanicGroup(items: Array<{ actionId: string }>, val: boolean) {
  const targetIds = new Set(items.map(item => item.actionId))
  let next = [...currentFilters.value]

  if (val) {
    for (const id of targetIds) {
      if (!currentFilterSet.value.has(id))
        next.push(id)
    }
  }
  else {
    next = next.filter(id => !targetIds.has(id))
  }

  emit('update:filterMechanics', next)
}

function toggleAOEMechanics(val: boolean) {
  toggleMechanicGroup(aoeMechanics.value, val)
}

function toggleShareMechanics(val: boolean) {
  toggleMechanicGroup(shareMechanics.value, val)
}

function toggleTBMechanics(val: boolean) {
  toggleMechanicGroup(tbMechanics.value, val)
}

function toggleNormalMechanics(val: boolean) {
  toggleMechanicGroup(normalMechanics.value, val)
}

function toBooleanCheckboxValue(value: CheckboxValueType) {
  return typeof value === 'boolean' ? value : Boolean(value)
}

function toStringFilterValues(values: CheckboxValueType[]) {
  return values.map(value => String(value))
}

function handleAOEMechanicsChange(value: CheckboxValueType) {
  toggleAOEMechanics(toBooleanCheckboxValue(value))
}

function handleShareMechanicsChange(value: CheckboxValueType) {
  toggleShareMechanics(toBooleanCheckboxValue(value))
}

function handleTBMechanicsChange(value: CheckboxValueType) {
  toggleTBMechanics(toBooleanCheckboxValue(value))
}

function handleNormalMechanicsChange(value: CheckboxValueType) {
  toggleNormalMechanics(toBooleanCheckboxValue(value))
}

function handleFilterMechanicsChange(values: CheckboxValueType[]) {
  emit('update:filterMechanics', toStringFilterValues(values))
}

const cellPopover = reactive<{
  visible: boolean
  target: HTMLElement | undefined
  row: MitigationRow | null
  col: ColumnDef | null
  skill: MitigationSkill | null
}>({
  visible: false,
  target: undefined,
  row: null,
  col: null,
  skill: null,
})

const damagePopover = reactive<{
  visible: boolean
  target: HTMLElement | undefined
  row: MitigationRow | null
}>({
  visible: false,
  target: undefined,
  row: null,
})

const mechanicContextMenu = ref<{ top: number, left: number, anchorTop: number, anchorLeft: number, row: MitigationRow | null }>({
  top: 0,
  left: 0,
  anchorTop: 0,
  anchorLeft: 0,
  row: null,
})
const mechanicEditContextMenu = ref<{ top: number, left: number, anchorTop: number, anchorLeft: number, row: MitigationRow | null }>({
  top: 0,
  left: 0,
  anchorTop: 0,
  anchorLeft: 0,
  row: null,
})
const columnContextMenu = ref<{ top: number, left: number, anchorTop: number, anchorLeft: number, col: ColumnDef | null }>({
  top: 0,
  left: 0,
  anchorTop: 0,
  anchorLeft: 0,
  col: null,
})
const skillContextMenu = ref<{ top: number, left: number, anchorTop: number, anchorLeft: number, col: ColumnDef | null, skill: MitigationSkill | null }>({
  top: 0,
  left: 0,
  anchorTop: 0,
  anchorLeft: 0,
  col: null,
  skill: null,
})
const mechanicContextMenuRef = ref<HTMLElement | null>(null)
const mechanicEditContextMenuRef = ref<HTMLElement | null>(null)
const columnContextMenuRef = ref<HTMLElement | null>(null)
const skillContextMenuRef = ref<HTMLElement | null>(null)
const CONTEXT_MENU_VIEWPORT_PADDING = 8

function isContextOverlay(id: string | null): id is ContextOverlayId {
  return id === 'mechanic-ctx'
    || id === 'mechanic-edit-ctx'
    || id === 'column-ctx'
    || id === 'skill-ctx'
}

function getContextOverlayEstimatedSize(id: ContextOverlayId) {
  if (id === 'mechanic-edit-ctx')
    return { width: 320, height: 220 }
  if (id === 'column-ctx')
    return { width: 180, height: 220 }
  if (id === 'skill-ctx')
    return { width: 240, height: 260 }
  return { width: 180, height: 140 }
}

function clampMenuPosition(
  left: number,
  top: number,
  width = 0,
  height = 0,
) {
  const viewportWidth = window.innerWidth || 0
  const viewportHeight = window.innerHeight || 0
  const maxLeft = Math.max(CONTEXT_MENU_VIEWPORT_PADDING, viewportWidth - width - CONTEXT_MENU_VIEWPORT_PADDING)
  const maxTop = Math.max(CONTEXT_MENU_VIEWPORT_PADDING, viewportHeight - height - CONTEXT_MENU_VIEWPORT_PADDING)
  return {
    left: Math.min(Math.max(CONTEXT_MENU_VIEWPORT_PADDING, left), maxLeft),
    top: Math.min(Math.max(CONTEXT_MENU_VIEWPORT_PADDING, top), maxTop),
  }
}

function getContextMenuPositionFromEvent(event: MouseEvent, overlayId: ContextOverlayId) {
  const estimate = getContextOverlayEstimatedSize(overlayId)
  return clampMenuPosition(event.clientX, event.clientY, estimate.width, estimate.height)
}

function updateContextMenuStatePosition(overlayId: ContextOverlayId, left: number, top: number) {
  if (overlayId === 'mechanic-ctx') {
    mechanicContextMenu.value.left = left
    mechanicContextMenu.value.top = top
    return
  }
  if (overlayId === 'mechanic-edit-ctx') {
    mechanicEditContextMenu.value.left = left
    mechanicEditContextMenu.value.top = top
    return
  }
  if (overlayId === 'column-ctx') {
    columnContextMenu.value.left = left
    columnContextMenu.value.top = top
    return
  }
  skillContextMenu.value.left = left
  skillContextMenu.value.top = top
}

function getContextMenuElement(overlayId: ContextOverlayId) {
  if (overlayId === 'mechanic-ctx')
    return mechanicContextMenuRef.value
  if (overlayId === 'mechanic-edit-ctx')
    return mechanicEditContextMenuRef.value
  if (overlayId === 'column-ctx')
    return columnContextMenuRef.value
  return skillContextMenuRef.value
}

function adjustContextMenuPositionWithinViewport(overlayId: ContextOverlayId) {
  const element = getContextMenuElement(overlayId)
  if (!element)
    return
  const rect = element.getBoundingClientRect()
  let anchorLeft = rect.left
  let anchorTop = rect.top
  if (overlayId === 'mechanic-ctx') {
    anchorLeft = mechanicContextMenu.value.anchorLeft
    anchorTop = mechanicContextMenu.value.anchorTop
  }
  else if (overlayId === 'mechanic-edit-ctx') {
    anchorLeft = mechanicEditContextMenu.value.anchorLeft
    anchorTop = mechanicEditContextMenu.value.anchorTop
  }
  else if (overlayId === 'column-ctx') {
    anchorLeft = columnContextMenu.value.anchorLeft
    anchorTop = columnContextMenu.value.anchorTop
  }
  else {
    anchorLeft = skillContextMenu.value.anchorLeft
    anchorTop = skillContextMenu.value.anchorTop
  }

  const next = clampMenuPosition(anchorLeft, anchorTop, rect.width, rect.height)
  updateContextMenuStatePosition(overlayId, next.left, next.top)
}

async function ensureContextMenuPositionInViewport(overlayId: ContextOverlayId) {
  await nextTick()
  adjustContextMenuPositionWithinViewport(overlayId)
  requestAnimationFrame(() => {
    adjustContextMenuPositionWithinViewport(overlayId)
  })
}

const selectedSkillAutoArrangeUnsupportedReason = computed(() => {
  const skill = skillContextMenu.value.skill
  if (!skill)
    return '当前技能不可用'
  if (!skill.mitigationScope)
    return '该技能不支持自动排轴'
  return ''
})

const isSelectedSkillAutoArrangeSupported = computed(() => !selectedSkillAutoArrangeUnsupportedReason.value)

const mechanicEditor = reactive<{
  row: MitigationRow | null
  type: 'aoe' | 'share' | 'tb' | 'normal'
  damage: number
}>({
  row: null,
  type: 'normal',
  damage: 0,
})

// Global overlay state for mutual exclusivity
const activeOverlay = ref<string | null>(null)

function toggleOverlay(id: string) {
  if (activeOverlay.value === id) {
    activeOverlay.value = null
  }
  else {
    clearOverlays()
    activeOverlay.value = id
  }
}

function handleWindowClick() {
  activeOverlay.value = null
}

function handleWindowResize() {
  if (!isContextOverlay(activeOverlay.value))
    return
  void ensureContextMenuPositionInViewport(activeOverlay.value)
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    clearOverlays()
    return
  }
  if (activeOverlay.value !== 'mechanic-edit-ctx')
    return
  if (event.key === 'Enter') {
    event.preventDefault()
    applyMechanicEditor({ scope: 'single' })
  }
}

onMounted(() => {
  window.addEventListener('click', handleWindowClick)
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleWindowClick)
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('resize', handleWindowResize)
})

// Watch activeOverlay to close hover popovers
watch(activeOverlay, (val) => {
  if (val) {
    cellPopover.visible = false
    damagePopover.visible = false
    if (isContextOverlay(val))
      void ensureContextMenuPositionInViewport(val)
  }
  else {
    mechanicContextMenu.value.row = null
    mechanicEditContextMenu.value.row = null
    columnContextMenu.value.col = null
    skillContextMenu.value.col = null
    skillContextMenu.value.skill = null
    mechanicEditor.row = null
  }
})

function handleRightClickSkill(event: MouseEvent, col: ColumnDef, skill: MitigationSkill) {
  event.preventDefault()
  clearOverlays()
  const pos = getContextMenuPositionFromEvent(event, 'skill-ctx')
  skillContextMenu.value = {
    top: pos.top,
    left: pos.left,
    anchorTop: event.clientY,
    anchorLeft: event.clientX,
    col,
    skill,
  }
  activeOverlay.value = 'skill-ctx'
}

function copyTimelineText(type: 'skill' | 'column') {
  const col = type === 'skill' ? skillContextMenu.value.col : columnContextMenu.value.col
  if (!col)
    return

  let targetSkillId: number | null = null
  let targetSkillName = ''

  if (type === 'skill' && skillContextMenu.value.skill) {
    targetSkillId = skillContextMenu.value.skill.id
    targetSkillName = skillContextMenu.value.skill.name
  }

  const ownerId = col.key
  const actions = props.playerActions.filter(a => a.columnKey === ownerId)
  const visibleSkillIds = new Set(getVisibleSkills(col).map(s => s.id))

  const filteredActions = actions.filter((a) => {
    if (targetSkillId !== null)
      return a.skillId === targetSkillId
    return visibleSkillIds.has(a.skillId)
  })

  const text = filteredActions
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((a) => {
      const sName = targetSkillName || col.skills.find(s => s.id === a.skillId)?.name || '未知'
      return `${formatTime(a.timestamp)} "<${sName}>~"`
    })
    .join('\n')

  if (!text) {
    ElMessage.warning('没有可导出的释放记录')
    return
  }

  copyToClipboard(text).then(() => {
    ElMessage.success('已复制时间轴文本')
    activeOverlay.value = null
  })
}

function getCellSim(row: MitigationRow, col: ColumnDef, skillId: number) {
  const key = `${col.key}_${skillId}`
  return row._sim?.cells[key]
}

function resolveRowKeyByTimestamp(ts: number) {
  const rows = sourceRows.value
  if (rows.length === 0)
    return undefined
  const idx = rows.findIndex(r => r.timestamp >= ts - 0.5)
  if (idx === -1)
    return rows[rows.length - 1]?.key
  return rows[idx]?.key
}

function getSkillMeta(col: ColumnDef, skillId: number) {
  const skill = col.skills.find(s => s.id === skillId)
  return {
    duration: skill?.duration ?? 0,
    recast: skill?.recast ?? 0,
  }
}

function validateActionPlacement(
  col: ColumnDef,
  skillId: number,
  newTimestamp: number,
  ignoreAction?: PlayerActionRecord,
) {
  const columnKey = col.key

  const { recast } = getSkillMeta(col, skillId)
  const skill = col.skills.find(s => s.id === skillId)
  const isChargeBased = (skill?.maxCharges ?? 1) > 1

  const recastWindow = recast
  if (recastWindow > 0 && !isChargeBased) {
    for (const action of props.playerActions) {
      if (ignoreAction && action.id && action.id === ignoreAction.id)
        continue
      if (action.columnKey !== columnKey || action.skillId !== skillId)
        continue
      const otherStart = action.timestamp
      const otherWindow = action.recastOverride ?? recast
      if (newTimestamp < otherStart + otherWindow && otherStart < newTimestamp + recastWindow) {
        ElMessage.error('与已有的技能释放冲突')
        return false
      }
    }
  }

  // Charge-based validation: Ensure no future point in time has negative charges
  if (isChargeBased && skill) {
    const max = skill.maxCharges || 1
    const r = skill.recast || 1

    const allUsages = props.playerActions
      .filter(a => a.columnKey === columnKey && a.skillId === skillId && (!ignoreAction || a.id !== ignoreAction.id))
      .map(a => a.timestamp)
    allUsages.push(newTimestamp)
    allUsages.sort((a, b) => a - b)
    const deficitAt = getFirstChargeDeficitTime(allUsages, max, r)
    if (deficitAt !== null)
      return false
  }

  return true
}

function findValidTimestampInOffsetRange(row: MitigationRow, col: ColumnDef, skillId: number) {
  const columnKey = col.key
  const { duration, recast } = getSkillMeta(col, skillId)
  if (duration <= 0)
    return null

  const baseStart = row.timestamp - duration
  const baseEnd = row.timestamp + duration
  if (recast <= 0)
    return row.timestamp

  let intervals: Array<[number, number]> = [[baseStart, baseEnd]]
  for (const action of props.playerActions) {
    if (action.columnKey !== columnKey || action.skillId !== skillId)
      continue
    const otherStart = action.timestamp
    const otherEnd = otherStart + (action.recastOverride ?? recast)
    if (otherEnd <= otherStart)
      continue
    const next: Array<[number, number]> = []
    for (const [start, end] of intervals) {
      if (otherEnd <= start || otherStart >= end) {
        next.push([start, end])
        continue
      }
      if (otherStart > start)
        next.push([start, Math.min(otherStart, end)])
      if (otherEnd < end)
        next.push([Math.max(otherEnd, start), end])
    }
    intervals = next
    if (intervals.length === 0)
      return null
  }

  let best: number | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const [start, end] of intervals) {
    const t = Math.min(Math.max(row.timestamp, start), end)
    const dist = Math.abs(t - row.timestamp)
    if (dist < bestDist) {
      best = t
      bestDist = dist
    }
  }
  return best
}

function toggleCell(row: MitigationRow, col: ColumnDef, skillId: number) {
  const columnKey = col.key

  const info = getCellSim(row, col, skillId)
  const isChecked = props.playerActions.some(a => a.rowKey === row.key && a.columnKey === columnKey && a.skillId === skillId)

  const isExactUseCell = !!info?.useTimestamp && Math.abs(info.useTimestamp - row.timestamp) <= 0.5
  const canClick = isChecked
    || info?.status === 'active-start'
    || (info?.status === 'active' && isExactUseCell)
    || isExactUseCell
    || (info?.status === '' && info?.ready)

  if (!canClick)
    return

  const newActions = [...props.playerActions]
  if (isChecked) {
    const index = newActions.findIndex(a => a.rowKey === row.key && a.columnKey === columnKey && a.skillId === skillId)
    if (index !== -1)
      newActions.splice(index, 1)
  }
  else if (info?.status === 'active-start' || info?.status === 'active' || isExactUseCell) {
    // Allow cancelling an active use even if the original action is not row-bound
    if (info?.actionId) {
      const index = newActions.findIndex(a => a.id === info.actionId)
      if (index !== -1) {
        newActions.splice(index, 1)
        emit('update:playerActions', newActions)
        return
      }
    }
    const { duration } = getSkillMeta(col, skillId)
    const candidates = newActions
      .map((a, index) => ({ a, index }))
      .filter(({ a }) => a.columnKey === columnKey && a.skillId === skillId)
      .filter(({ a }) => row.timestamp >= a.timestamp && (duration <= 0 || row.timestamp < a.timestamp + duration))
      .sort((x, y) => y.a.timestamp - x.a.timestamp)
    if (candidates.length > 0) {
      newActions.splice(candidates[0]!.index, 1)
      emit('update:playerActions', newActions)
      return
    }
  }
  else {
    let newTimestamp = row.timestamp
    if (info?.status === 'conflict') {
      const suggested = findValidTimestampInOffsetRange(row, col, skillId)
      if (suggested === null)
        return
      newTimestamp = suggested
    }
    if (!validateActionPlacement(col, skillId, newTimestamp))
      return
    const record: PlayerActionRecord = {
      id: createActionId(),
      timestamp: newTimestamp,
      columnKey,
      skillId,
      rowKey: row.key,
    }
    newActions.push(record)
  }
  emit('update:playerActions', newActions)
}

const editingCell = ref<{ rowKey: string, colKey: string, skillId: number, target: HTMLElement, title: string, baseTime: number } | null>(null)
const editForm = reactive({ offset: 0 })

const editDisplayTime = computed(() => {
  if (!editingCell.value)
    return ''
  return formatTime(editingCell.value.baseTime + editForm.offset)
})

function handleRightClickCell(event: MouseEvent, row: MitigationRow, col: ColumnDef, skill: MitigationSkill & { id: number, name: string }) {
  event.preventDefault()
  if (activeOverlay.value || editingCell.value) {
    clearOverlays()
  }
  const columnKey = col.key

  const action = props.playerActions.find(a => a.rowKey === row.key && a.columnKey === columnKey && a.skillId === skill.id)
  if (!action)
    return

  editingCell.value = {
    rowKey: row.key,
    colKey: col.key,
    skillId: skill.id,
    target: event.currentTarget as HTMLElement,
    title: `${formatTime(row.timestamp)} | ${skill.name}`,
    baseTime: row.timestamp,
  }
  editForm.offset = action.timestamp - row.timestamp
}

function saveEdit() {
  if (!editingCell.value)
    return
  const { rowKey, colKey, skillId, baseTime } = editingCell.value
  const col = props.columns.find(c => c.key === colKey)
  if (!col)
    return
  const columnKey = col.key

  const index = props.playerActions.findIndex(a => a.rowKey === rowKey && a.columnKey === columnKey && a.skillId === skillId)

  if (index !== -1) {
    const originalAction = props.playerActions[index]!
    const newTimestamp = baseTime + editForm.offset
    if (col) {
      if (!validateActionPlacement(col, skillId, newTimestamp, originalAction))
        return
    }
    const newActions = [...props.playerActions]
    newActions[index] = {
      ...originalAction,
      id: originalAction.id || createActionId(),
      timestamp: newTimestamp,
      rowKey: resolveRowKeyByTimestamp(newTimestamp),
    }
    emit('update:playerActions', newActions)
  }
  editingCell.value = null
}

const columnHiddenHash = computed(() => {
  return props.columns.map(c => (c.hiddenSkillIds || []).join(',')).join('|')
})

const columnOrderHash = computed(() => {
  return props.columns.map(c => c.key).join('|')
})

function getCellClasses(row: MitigationRow, rowIndex: number, col: ColumnDef, skillId: number) {
  const cellSim = getCellSim(row, col, skillId)
  if (!cellSim)
    return ['cell-check']

  const prevRow = rowIndex > 0 ? props.rows[rowIndex - 1] : null
  const nextRow = rowIndex < props.rows.length - 1 ? props.rows[rowIndex + 1] : null

  const status = cellSim.status
  const prevStatus = prevRow ? getCellSim(prevRow, col, skillId)?.status : undefined
  const nextStatus = nextRow ? getCellSim(nextRow, col, skillId)?.status : undefined

  const isActiveStatus = (s?: string) => s === 'active' || s === 'active-start'
  const isCooldownStatus = (s?: string) => s === 'cooldown'
  const isPreCooldownStatus = (s?: string) => s === 'conflict'

  const sameUsePrev = cellSim.useTimestamp !== undefined && cellSim.useTimestamp === getCellSim(prevRow || row, col, skillId)?.useTimestamp
  const sameUseNext = cellSim.useTimestamp !== undefined && cellSim.useTimestamp === getCellSim(nextRow || row, col, skillId)?.useTimestamp

  const connPrev = (isActiveStatus(status) && isActiveStatus(prevStatus))
    || (isCooldownStatus(status) && isCooldownStatus(prevStatus))
    || (isPreCooldownStatus(status) && isPreCooldownStatus(prevStatus))
    || (isCooldownStatus(status) && isActiveStatus(prevStatus) && sameUsePrev)

  const connNext = (isActiveStatus(status) && isActiveStatus(nextStatus))
    || (isCooldownStatus(status) && isCooldownStatus(nextStatus))
    || (isPreCooldownStatus(status) && isPreCooldownStatus(nextStatus))
    || (isActiveStatus(status) && isCooldownStatus(nextStatus) && sameUseNext)

  const baseClasses = Array.isArray(cellSim.classes)
    ? cellSim.classes.filter(c => c !== 'cell-check' && c !== 'conn-prev' && c !== 'conn-next')
    : cellSim.classes

  return [
    'cell-check',
    baseClasses,
    {
      'conn-prev': connPrev,
      'conn-next': connNext,
    },
  ]
}

function getStatusLabel(status: string | undefined) {
  if (status === 'active-start')
    return '释放瞬间'
  if (status === 'active')
    return '生效中'
  if (status === 'cooldown')
    return '冷却中'
  if (status === 'conflict')
    return '预冷却'
  return '准备就绪'
}

function getStatusLabelForCell(status: string | undefined, useTimestamp: number | undefined, rowTimestamp: number) {
  if (status === 'active-start') {
    if (useTimestamp !== undefined && Math.abs(useTimestamp - rowTimestamp) < 0.001)
      return '释放瞬间'
    return '生效中'
  }
  return getStatusLabel(status)
}

function getColDisplayName(col: ColumnDef) {
  const job = Util.jobEnumToJob(col.jobEnum)
  const jobName = Util.jobToFullName(job)?.simple1
  if (jobName)
    return jobName
  const key = col.key || ''
  const trimmed = key.split('(')[0]?.split('（')[0]?.trim()
  return trimmed || key
}

function handleRightClickMechanic(row: MitigationRow, event: MouseEvent) {
  clearOverlays()
  const pos = getContextMenuPositionFromEvent(event, 'mechanic-ctx')
  mechanicContextMenu.value = {
    top: pos.top,
    left: pos.left,
    anchorTop: event.clientY,
    anchorLeft: event.clientX,
    row,
  }
  activeOverlay.value = 'mechanic-ctx'
}

function handleRightClickMechanicDamage(row: MitigationRow, event: MouseEvent) {
  clearOverlays()
  mechanicEditor.row = row
  mechanicEditor.type = row.isShare ? 'share' : (row.isAOE ? 'aoe' : (row.isTB ? 'tb' : 'normal'))
  mechanicEditor.damage = Number(row.rawDamage || 0)
  const pos = getContextMenuPositionFromEvent(event, 'mechanic-edit-ctx')
  mechanicEditContextMenu.value = {
    top: pos.top,
    left: pos.left,
    anchorTop: event.clientY,
    anchorLeft: event.clientX,
    row,
  }
  activeOverlay.value = 'mechanic-edit-ctx'
}

function handleRightClickColumn(col: ColumnDef, event: MouseEvent) {
  clearOverlays()
  const pos = getContextMenuPositionFromEvent(event, 'column-ctx')
  columnContextMenu.value = {
    top: pos.top,
    left: pos.left,
    anchorTop: event.clientY,
    anchorLeft: event.clientX,
    col,
  }
  activeOverlay.value = 'column-ctx'
}

function copyColumnData() {
  const col = columnContextMenu.value.col
  activeOverlay.value = null
  if (!col)
    return

  const anonId = `${col.jobEnum}_1`
  const ownerId = col.key
  const actions = props.playerActions.filter(a => a.columnKey === ownerId)
  const skillMap: Record<string, number[]> = {}

  actions.forEach((a) => {
    const key = String(a.skillId)
    if (!skillMap[key])
      skillMap[key] = []
    skillMap[key]!.push(Number(a.timestamp.toFixed(2)))
  })

  const data = {
    type: 'mitigation-player-actions' as const,
    src: [anonId],
    data: {
      0: skillMap,
    },
    cols: [{
      i: anonId,
      j: col.jobEnum,
      h: col.hiddenSkillIds || [],
    }],
  }

  const jsonStr = JSON.stringify(data)
  const compressed = LZString.compressToBase64(jsonStr)

  copyToClipboard(compressed).then(() => {
    ElMessage.success(`已复制 ${getColDisplayName(col)} 的配置`)
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function pasteColumnData() {
  const targetCol = columnContextMenu.value.col
  activeOverlay.value = null
  if (!targetCol)
    return

  navigator.clipboard.readText().then((text) => {
    const value = (text || '').trim()
    if (!value)
      return
    try {
      const parsed = parseMitigationImportText(value)
      if (!isMitigationPlayerActionsImportData(parsed)) {
        ElMessage.error('剪贴板内容不是有效的减伤配置')
        return
      }

      if (!('src' in parsed)
        || !('data' in parsed)
        || !('cols' in parsed)
        || !parsed.cols
        || parsed.cols.length !== 1) {
        ElMessage.error('剪贴板内容不是单职业配置')
        return
      }

      const data = parsed as MitigationPlayerActionsV4Data
      const importedCol = data.cols![0] as ImportedColumnPayload
      const sourceIndex = data.src.findIndex(s => s === importedCol.i)
      const skillMap = data.data[String(sourceIndex >= 0 ? sourceIndex : 0)] || {}

      // Verify job match
      if (importedCol.j !== targetCol.jobEnum) {
        const importedJob = Util.jobToFullName(Util.jobEnumToJob(importedCol.j || 0)).cn || '未知职业'
        const targetJob = getColDisplayName(targetCol)
        ElMessageBox.confirm(
          `导入的数据属于 ${importedJob}，而当前列是 ${targetJob}。确定要覆盖导入吗？`,
          '职业不匹配',
          {
            confirmButtonText: '确定覆盖',
            cancelButtonText: '取消',
            type: 'warning',
          },
        ).then(() => {
          applyImport(importedCol, skillMap)
        }).catch(() => {})
      }
      else {
        applyImport(importedCol, skillMap)
      }

      function applyImport(colData: ImportedColumnPayload, skillsMap: Record<string, number[]>) {
        if (!targetCol)
          return
        const ownerId = targetCol.key
        // Update Column Settings (Hidden Skills)
        const newCols = props.columns.map(c =>
          c.key === targetCol.key
            ? { ...c, hiddenSkillIds: colData.h || [] }
            : c,
        )
        emit('update:columns', newCols)

        // Replace Actions: Remove old actions for this player, add new ones
        const otherActions = props.playerActions.filter(a => a.columnKey !== ownerId)
        const newActions: PlayerActionRecord[] = []

        Object.keys(skillsMap).forEach((skillIdStr) => {
          const skillId = Number(skillIdStr)
          const times = skillsMap[skillIdStr]
          if (!times)
            return
          times.forEach((t) => {
            newActions.push({
              id: createActionId(),
              timestamp: t,
              columnKey: ownerId,
              skillId,
            })
          })
        })

        emit('update:playerActions', [...otherActions, ...newActions])
        ElMessage.success(`已覆盖导入 ${getColDisplayName(targetCol)} 的配置`)
      }
    }
    catch (_e) {
      ElMessage.error('解析剪贴板数据失败')
    }
  }).catch(() => {
    ElMessage.error('无法读取剪贴板')
  })
}

const isCellPopoverVisible = computed(() => !activeOverlay.value && cellPopover.visible)

function showCellPopover(event: MouseEvent, row: MitigationRow, col: ColumnDef, skill: MitigationSkill) {
  if (activeOverlay.value || editingCell.value)
    return
  const info = getCellSim(row, col, skill.id)
  if (!info)
    return
  damagePopover.visible = false
  cellPopover.row = row
  cellPopover.col = col
  cellPopover.skill = skill
  cellPopover.target = event.currentTarget as HTMLElement
  cellPopover.visible = true
}

function hideCellPopover() {
  cellPopover.visible = false
}

const cellPopoverInfo = computed(() => {
  if (!cellPopover.row || !cellPopover.col || !cellPopover.skill)
    return null
  const sim = getCellSim(cellPopover.row, cellPopover.col, cellPopover.skill.id)
  if (!sim)
    return null
  return {
    row: cellPopover.row,
    col: cellPopover.col,
    skill: cellPopover.skill,
    sim,
  }
})

const isDamagePopoverVisible = computed(() => !activeOverlay.value && damagePopover.visible)

function showDamagePopover(event: MouseEvent, row: MitigationRow) {
  if (activeOverlay.value || editingCell.value)
    return
  if (!row.damageDetails || row.damageDetails.length <= 1)
    return
  cellPopover.visible = false
  damagePopover.row = row
  damagePopover.target = event.currentTarget as HTMLElement
  damagePopover.visible = true
}

function clearOverlays() {
  activeOverlay.value = null
  editingCell.value = null
  cellPopover.visible = false
  damagePopover.visible = false
}

function hideDamagePopover() {
  damagePopover.visible = false
}

const skillById = computed(() => {
  const map = new Map<number, MitigationSkill>()
  props.columns.forEach((col) => {
    col.skills.forEach((skill) => {
      if (!map.has(skill.id))
        map.set(skill.id, skill)
    })
  })
  return map
})

function getSkillMultiplier(skillId: number, damageType: MitigationRow['damageType']) {
  if (damageType === 'dot' || damageType === 'heal')
    return 1
  const skill = skillById.value.get(skillId)
  if (!skill)
    throw new Error(`[MitigationGrid] Missing skill declaration for skill id: ${skillId}`)
  const multiplier = skill.damageTakenMultiplier
  if (!multiplier)
    return 1
  if (damageType === 'physics')
    return multiplier.physics
  if (damageType === 'magic')
    return multiplier.magic
  if (damageType === 'darkness')
    return multiplier.darkness
  return 1
}

function hasSkillDamageTakenMultiplier(skillId: number) {
  const skill = skillById.value.get(skillId)
  if (!skill)
    throw new Error(`[MitigationGrid] Missing skill declaration for skill id: ${skillId}`)
  return !!skill.damageTakenMultiplier
}

function getAutoArrangeCoverageScope(skillId: number): AutoArrangeCoverageScope | null {
  const skill = skillById.value.get(skillId)
  if (skill?.mitigationScope === 'party')
    return 'party'
  if (skill?.mitigationScope === 'self')
    return 'self'
  return null
}

function isExtremeFailureDamageRow(row: MitigationRow) {
  const rawDamage = Number(row.rawDamage || 0)
  if (Number.isFinite(rawDamage) && rawDamage > EXTREME_DAMAGE_THRESHOLD)
    return true
  return !!row.damageDetails?.some((detail) => {
    const estimatedRaw = Number(detail.estimatedRaw || 0)
    if (Number.isFinite(estimatedRaw) && estimatedRaw > EXTREME_DAMAGE_THRESHOLD)
      return true
    const recorded = Number(detail.damage || 0)
    return Number.isFinite(recorded) && recorded > EXTREME_DAMAGE_THRESHOLD
  })
}

function buildExtremeFailureMask(rows: MitigationRow[]) {
  return rows.map(row => isExtremeFailureDamageRow(row))
}

function getColumnTargetNameCandidates(col: ColumnDef) {
  const names = new Set<string>()
  const key = String(col.key || '').trim()
  if (!key)
    return names
  names.add(key)
  const match = key.match(/\(([^()]+)\)\s*$/)
  if (match?.[1])
    names.add(match[1].trim())
  return names
}

function getDetailBaseDamage(detail: NonNullable<MitigationRow['damageDetails']>[number]) {
  const estimatedRaw = Number(detail.estimatedRaw)
  if (Number.isFinite(estimatedRaw) && estimatedRaw > 0)
    return estimatedRaw
  const damage = Number(detail.damage)
  if (Number.isFinite(damage) && damage > 0)
    return damage
  return 0
}

function getPersonalDamageForColumn(row: MitigationRow, col: ColumnDef) {
  const fallback = Math.max(0, Number(row.rawDamage || 0))
  const details = row.damageDetails
  if (!details || details.length === 0)
    return fallback

  const targetId = col.targetId
  if (targetId) {
    const byId = details.find(detail => detail.targetId === targetId)
    if (byId) {
      const value = getDetailBaseDamage(byId)
      if (value > 0)
        return value
    }
  }

  const nameCandidates = getColumnTargetNameCandidates(col)
  if (nameCandidates.size > 0) {
    const byName = details.find(detail => nameCandidates.has(detail.target))
    if (byName) {
      const value = getDetailBaseDamage(byName)
      if (value > 0)
        return value
    }
  }

  return fallback
}

function buildPersonalDamageCacheForColumn(rows: MitigationRow[], col: ColumnDef) {
  return rows.map(row => getPersonalDamageForColumn(row, col))
}

function buildSkillMultiplierCache(rows: MitigationRow[], skillId: number) {
  return rows.map(row => getSkillMultiplier(skillId, row.damageType))
}

function getRowReductionRate(row: MitigationRow) {
  const active = row._sim?.activeMitigations
  if (!active || active.length === 0)
    return 0
  let multiplier = 1
  for (const skillId of active) {
    multiplier *= getSkillMultiplier(skillId, row.damageType)
  }
  if (multiplier < 0)
    multiplier = 0
  if (multiplier > 1)
    multiplier = 1
  return 1 - multiplier
}

function formatReduction(rate: number) {
  return `${Math.round(rate * 100)}%`
}

function getRowShieldValue(row: MitigationRow) {
  return typeof row.shieldValue === 'number' ? row.shieldValue : 0
}

function getSimulatedDamage(row: MitigationRow) {
  const reduction = getRowReductionRate(row)
  const shield = getRowShieldValue(row)
  const raw = row.rawDamage || 0
  const simulated = Math.round(raw * (1 - reduction) - shield)
  return Math.max(0, simulated)
}

const AUTO_PLAN_EPSILON = 0.001
const AUTO_PLAN_WEIGHT_SCALE = 1000

function getAutoArrangeStrategyLabel(strategy: AutoArrangeStrategy) {
  if (strategy === 'tb-priority')
    return '死刑优先'
  if (strategy === 'peak-smoothing')
    return '大技能优先'
  return 'HPS优先'
}

function getDefaultAutoArrangeStrategy(
  col: ColumnDef,
  skillId: number,
): AutoArrangeStrategy {
  const coverage = getAutoArrangeCoverageScope(skillId)
  if (!coverage)
    return 'max-total'
  if (coverage === 'self' && col.role === 'tank')
    return 'tb-priority'
  return 'max-total'
}

async function chooseAutoArrangeBinaryOption(
  title: string,
  confirmLabel: string,
  cancelLabel: string,
): Promise<'confirm' | 'cancel' | null> {
  activeOverlay.value = null
  try {
    await ElMessageBox.confirm(
      title,
      '自动排轴策略',
      {
        confirmButtonText: confirmLabel,
        cancelButtonText: cancelLabel,
        closeOnClickModal: false,
        closeOnPressEscape: true,
        distinguishCancelAndClose: true,
        confirmButtonClass: 'mg-auto-arrange-choice-btn',
        cancelButtonClass: 'mg-auto-arrange-choice-btn',
        customClass: 'mg-auto-arrange-choice-dialog',
      },
    )
    return 'confirm'
  }
  catch (error) {
    if (error === 'cancel')
      return 'cancel'
    return null
  }
}

async function chooseAutoArrangeStrategyForSkill(
  col: ColumnDef,
  skillId: number,
): Promise<AutoArrangeStrategy | null> {
  const coverage = getAutoArrangeCoverageScope(skillId)
  if (!coverage)
    return null
  if (coverage !== 'party')
    return getDefaultAutoArrangeStrategy(col, skillId)

  const selected = await chooseAutoArrangeBinaryOption(
    '请选择群体减伤自动排轴策略',
    getAutoArrangeStrategyLabel('max-total'),
    getAutoArrangeStrategyLabel('peak-smoothing'),
  )
  if (!selected)
    return null
  return selected === 'confirm' ? 'max-total' : 'peak-smoothing'
}

async function chooseExclusiveGroupAutoArrangeScope(skillName: string): Promise<AutoArrangeExclusiveScope | null> {
  const selected = await chooseAutoArrangeBinaryOption(
    `技能 ${skillName} 属于互斥组，是否只调整当前列？`,
    '只改当前列',
    '联动互斥组',
  )
  if (!selected)
    return null
  return selected === 'confirm' ? 'single' : 'group'
}

function getAutoArrangeToleranceSeconds() {
  const raw = Number(props.autoArrangeToleranceSeconds ?? 2)
  if (!Number.isFinite(raw))
    return 2
  return Math.max(0, raw)
}

function getRowPriorityWeight(row: MitigationRow, strategy: AutoArrangeStrategy) {
  if (strategy !== 'tb-priority')
    return 1
  if (row.isTB)
    return 2.5
  if (isAoeLike(row))
    return 1.25
  return 1
}

function getAutoArrangeEffectiveDuration(duration: number) {
  return Math.max(0, duration - getAutoArrangeToleranceSeconds())
}

function getAutoArrangeRecastWindow(recast: number) {
  const normalized = Math.max(0, recast)
  if (normalized <= 0)
    return 0
  return normalized + getAutoArrangeToleranceSeconds()
}

interface AutoScheduledAction {
  columnKey: string
  skillId: number
  timestamp: number
  duration: number
  rowIndex: number
  exclusiveGroup: string | null
}

interface AutoIntervalCandidate {
  rowIndex: number
  timestamp: number
  endTimestamp: number
  gain: number
  score: number
  scoreScaled: number
}

interface AutoArrangeRowComputationCache {
  extremeFailureMask?: boolean[]
  personalDamageByRow?: number[]
  skillMultiplierByRow?: number[]
}

interface ExclusiveGroupAutoArrangeUnit {
  key: string
  col: ColumnDef
  skill: MitigationSkill
  columnKey: string
  skillId: number
}

interface MinCostFlowEdge {
  to: number
  rev: number
  cap: number
  cost: number
}

interface AutoArrangeBuildContext {
  rowIndexByKey: Map<string, number>
  skillLookupByPlayer: Map<string, Map<number, MitigationSkill>>
}

const EMPTY_SCHEDULED_ACTIONS: AutoScheduledAction[] = []

function findFirstRowAtOrAfter(rows: MitigationRow[], timestamp: number) {
  let left = 0
  let right = rows.length - 1
  let answer = -1
  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    const row = rows[middle]
    if (!row)
      break
    if (row.timestamp >= timestamp) {
      answer = middle
      right = middle - 1
    }
    else {
      left = middle + 1
    }
  }
  return answer
}

function resolveActionRowIndex(rows: MitigationRow[], rowIndexByKey: Map<string, number>, action: PlayerActionRecord) {
  if (action.rowKey)
    return rowIndexByKey.get(action.rowKey) ?? -1
  return findFirstRowAtOrAfter(rows, action.timestamp - 0.5)
}

function buildSkillLookupByPlayer() {
  const lookup = new Map<string, Map<number, MitigationSkill>>()
  props.columns.forEach((col) => {
    const skillMap = new Map<number, MitigationSkill>()
    col.skills.forEach(skill => skillMap.set(skill.id, skill))
    lookup.set(col.key, skillMap)
  })
  return lookup
}

function createAutoArrangeBuildContext(rows: MitigationRow[]): AutoArrangeBuildContext {
  const rowIndexByKey = new Map<string, number>()
  rows.forEach((row, index) => rowIndexByKey.set(row.key, index))
  return {
    rowIndexByKey,
    skillLookupByPlayer: buildSkillLookupByPlayer(),
  }
}

function buildScheduledActions(
  rows: MitigationRow[],
  actions: PlayerActionRecord[],
  context?: AutoArrangeBuildContext,
) {
  const rowIndexByKey = context?.rowIndexByKey || new Map(rows.map((row, index) => [row.key, index]))
  const skillLookupByPlayer = context?.skillLookupByPlayer || buildSkillLookupByPlayer()
  const scheduled: AutoScheduledAction[] = []
  actions.forEach((action) => {
    const skillMap = skillLookupByPlayer.get(action.columnKey)
    const skill = skillMap?.get(action.skillId)
    if (!skill)
      return
    const rowIndex = resolveActionRowIndex(rows, rowIndexByKey, action)
    if (rowIndex < 0)
      return
    scheduled.push({
      columnKey: action.columnKey,
      skillId: action.skillId,
      timestamp: action.timestamp,
      duration: Math.max(0, skill.duration || 0),
      rowIndex,
      exclusiveGroup: getExclusiveGroupBySkillId(action.skillId),
    })
  })
  return scheduled
}

function isScheduledActionActiveAtRow(action: AutoScheduledAction, rowIndex: number, rowTimestamp: number) {
  if (action.rowIndex === rowIndex)
    return true
  if (action.duration <= AUTO_PLAN_EPSILON)
    return false
  const elapsed = rowTimestamp - action.timestamp
  return elapsed >= 0 && elapsed < action.duration
}

function computeBaselineMultipliers(rows: MitigationRow[], scheduledActions: AutoScheduledAction[]) {
  return rows.map((row, rowIndex) => {
    let multiplier = 1
    const exclusiveGroupBest = new Map<string, number>()
    scheduledActions.forEach((action) => {
      if (!isScheduledActionActiveAtRow(action, rowIndex, row.timestamp))
        return
      const actionMultiplier = getSkillMultiplier(action.skillId, row.damageType)
      if (actionMultiplier >= 1)
        return
      if (!action.exclusiveGroup) {
        multiplier *= actionMultiplier
        return
      }
      const previous = exclusiveGroupBest.get(action.exclusiveGroup)
      if (previous === undefined || actionMultiplier < previous)
        exclusiveGroupBest.set(action.exclusiveGroup, actionMultiplier)
    })
    exclusiveGroupBest.forEach((value) => {
      multiplier *= value
    })
    if (multiplier < 0)
      multiplier = 0
    if (multiplier > 1)
      multiplier = 1
    return multiplier
  })
}

function computeAutoUseWeight(
  rows: MitigationRow[],
  startRowIndex: number,
  col: ColumnDef,
  skillId: number,
  duration: number,
  baselineMultipliers: number[],
  strategy: AutoArrangeStrategy,
  cache?: AutoArrangeRowComputationCache,
) {
  const startRow = rows[startRowIndex]
  if (!startRow)
    return { gain: 0, score: 0 }
  const coverage = getAutoArrangeCoverageScope(skillId)
  if (!coverage)
    return { gain: 0, score: 0 }
  const startTimestamp = startRow.timestamp
  const endTimestamp = startTimestamp + duration
  const hasDamageTakenMultiplier = hasSkillDamageTakenMultiplier(skillId)
  let totalGain = 0
  let totalScore = 0

  rows.forEach((row, rowIndex) => {
    const isStartRow = rowIndex === startRowIndex
    const isWithinDuration = duration > AUTO_PLAN_EPSILON
      && row.timestamp >= startTimestamp
      && row.timestamp < endTimestamp
    if (!isStartRow && !isWithinDuration)
      return

    const isExtremeFailure = cache?.extremeFailureMask?.[rowIndex] ?? isExtremeFailureDamageRow(row)
    if (isExtremeFailure)
      return

    if (!hasDamageTakenMultiplier) {
      const gain = 1
      totalGain += gain
      let score = gain
      if (strategy === 'tb-priority')
        score *= getRowPriorityWeight(row, strategy)
      totalScore += score
      return
    }

    const skillMultiplier = cache?.skillMultiplierByRow?.[rowIndex] ?? getSkillMultiplier(skillId, row.damageType)
    if (skillMultiplier >= 1)
      return

    const baseDamage = coverage === 'party'
      ? Math.max(0, Number(row.rawDamage || 0))
      : (cache?.personalDamageByRow?.[rowIndex] ?? getPersonalDamageForColumn(row, col))
    const targetCount = coverage === 'party' ? 8 : 1
    if (!Number.isFinite(baseDamage) || baseDamage <= 0)
      return
    const baselineMultiplier = baselineMultipliers[rowIndex] ?? 1
    const baselineDamage = baseDamage * targetCount * baselineMultiplier
    const gain = baselineDamage * (1 - skillMultiplier)
    if (gain <= 0)
      return
    totalGain += gain

    let score = gain
    if (strategy === 'tb-priority') {
      score *= getRowPriorityWeight(row, strategy)
    }
    else if (strategy === 'peak-smoothing') {
      // Maximize squared-damage drop to prioritize high peak rows.
      score = baselineDamage * baselineDamage * (1 - skillMultiplier * skillMultiplier)
    }
    totalScore += score
  })

  return { gain: totalGain, score: totalScore }
}

function isSkillAlreadyActiveAtRow(
  scheduledSkillActions: AutoScheduledAction[],
  rowIndex: number,
  rowTimestamp: number,
) {
  return scheduledSkillActions.some(action => isScheduledActionActiveAtRow(action, rowIndex, rowTimestamp))
}

function buildScheduledActionsByUnitKey(scheduledActions: AutoScheduledAction[]) {
  const grouped = new Map<string, AutoScheduledAction[]>()
  scheduledActions.forEach((action) => {
    const key = `${action.columnKey}_${action.skillId}`
    const list = grouped.get(key)
    if (list) {
      list.push(action)
      return
    }
    grouped.set(key, [action])
  })
  return grouped
}

function getExclusiveGroupBySkillId(skillId: number) {
  return EXCLUSIVE_GROUP_BY_SKILL_ID.get(skillId) ?? null
}

function getExclusiveGroupActions(
  scheduledActions: AutoScheduledAction[],
  exclusiveGroup: string | null,
) {
  if (!exclusiveGroup)
    return EMPTY_SCHEDULED_ACTIONS
  return scheduledActions.filter(action => action.exclusiveGroup === exclusiveGroup)
}

function hasExclusiveGroupOverlap(
  exclusiveGroupActions: AutoScheduledAction[],
  startTimestamp: number,
  duration: number,
) {
  if (exclusiveGroupActions.length === 0)
    return false
  const endTimestamp = startTimestamp + Math.max(duration, AUTO_PLAN_EPSILON)
  return exclusiveGroupActions.some((action) => {
    const actionEnd = action.timestamp + Math.max(action.duration, AUTO_PLAN_EPSILON)
    return action.timestamp < endTimestamp - AUTO_PLAN_EPSILON
      && startTimestamp < actionEnd - AUTO_PLAN_EPSILON
  })
}

function computeAutoUseWeightForFill(
  rows: MitigationRow[],
  startRowIndex: number,
  col: ColumnDef,
  skillId: number,
  duration: number,
  baselineMultipliers: number[],
  scheduledSkillActions: AutoScheduledAction[],
  strategy: AutoArrangeStrategy,
  cache?: AutoArrangeRowComputationCache,
) {
  const startRow = rows[startRowIndex]
  if (!startRow)
    return { gain: 0, score: 0 }
  const coverage = getAutoArrangeCoverageScope(skillId)
  if (!coverage)
    return { gain: 0, score: 0 }
  const startTimestamp = startRow.timestamp
  const endTimestamp = startTimestamp + duration
  const hasDamageTakenMultiplier = hasSkillDamageTakenMultiplier(skillId)
  let totalGain = 0
  let totalScore = 0

  rows.forEach((row, rowIndex) => {
    const isStartRow = rowIndex === startRowIndex
    const isWithinDuration = duration > AUTO_PLAN_EPSILON
      && row.timestamp >= startTimestamp
      && row.timestamp < endTimestamp
    if (!isStartRow && !isWithinDuration)
      return
    if (isSkillAlreadyActiveAtRow(scheduledSkillActions, rowIndex, row.timestamp))
      return

    const isExtremeFailure = cache?.extremeFailureMask?.[rowIndex] ?? isExtremeFailureDamageRow(row)
    if (isExtremeFailure)
      return

    if (!hasDamageTakenMultiplier) {
      const gain = 1
      totalGain += gain
      let score = gain
      if (strategy === 'tb-priority')
        score *= getRowPriorityWeight(row, strategy)
      totalScore += score
      return
    }

    const skillMultiplier = cache?.skillMultiplierByRow?.[rowIndex] ?? getSkillMultiplier(skillId, row.damageType)
    if (skillMultiplier >= 1)
      return

    const baseDamage = coverage === 'party'
      ? Math.max(0, Number(row.rawDamage || 0))
      : (cache?.personalDamageByRow?.[rowIndex] ?? getPersonalDamageForColumn(row, col))
    const targetCount = coverage === 'party' ? 8 : 1
    if (!Number.isFinite(baseDamage) || baseDamage <= 0)
      return
    const baselineMultiplier = baselineMultipliers[rowIndex] ?? 1
    const baselineDamage = baseDamage * targetCount * baselineMultiplier
    const gain = baselineDamage * (1 - skillMultiplier)
    if (gain <= 0)
      return
    totalGain += gain

    let score = gain
    if (strategy === 'tb-priority') {
      score *= getRowPriorityWeight(row, strategy)
    }
    else if (strategy === 'peak-smoothing') {
      // Maximize squared-damage drop to prioritize high peak rows.
      score = baselineDamage * baselineDamage * (1 - skillMultiplier * skillMultiplier)
    }
    totalScore += score
  })

  return { gain: totalGain, score: totalScore }
}

function validateActionPlacementAgainstActions(
  actions: PlayerActionRecord[],
  col: ColumnDef,
  skillId: number,
  newTimestamp: number,
  scheduledActions: AutoScheduledAction[],
  exclusiveGroupActions?: AutoScheduledAction[],
) {
  const columnKey = col.key

  const { recast } = getSkillMeta(col, skillId)
  const recastWindow = getAutoArrangeRecastWindow(Number(recast || 0))
  const skill = col.skills.find(s => s.id === skillId)
  const isChargeBased = (skill?.maxCharges ?? 1) > 1
  const exclusiveGroup = getExclusiveGroupBySkillId(skillId)
  const duration = Math.max(0, Number(skill?.duration || 0))
  const groupActions = exclusiveGroupActions || getExclusiveGroupActions(scheduledActions, exclusiveGroup)

  if (hasExclusiveGroupOverlap(groupActions, newTimestamp, duration))
    return false

  if (recastWindow > 0 && !isChargeBased) {
    for (const action of actions) {
      if (action.columnKey !== columnKey || action.skillId !== skillId)
        continue
      const otherStart = action.timestamp
      const otherWindow = getAutoArrangeRecastWindow(Number(action.recastOverride ?? recast))
      if (newTimestamp < otherStart + otherWindow && otherStart < newTimestamp + recastWindow)
        return false
    }
  }

  if (isChargeBased && skill) {
    const max = skill.maxCharges || 1
    const r = skill.recast || 1
    const allUsages: number[] = []
    for (const action of actions) {
      if (action.columnKey !== columnKey || action.skillId !== skillId)
        continue
      const ts = action.timestamp
      if (Math.abs(ts - newTimestamp) <= AUTO_PLAN_EPSILON)
        return false
      allUsages.push(ts)
    }
    allUsages.push(newTimestamp)
    allUsages.sort((a, b) => a - b)
    const deficitAt = getFirstChargeDeficitTime(allUsages, max, r)
    if (deficitAt !== null)
      return false
  }

  return true
}

function getExclusiveGroupAutoArrangeUnits(
  exclusiveGroup: string,
  fallbackCol: ColumnDef,
  fallbackSkill: MitigationSkill,
) {
  const units: ExclusiveGroupAutoArrangeUnit[] = []
  const seen = new Set<string>()

  props.columns.forEach((column) => {
    const columnKey = column.key
    getVisibleSkills(column).forEach((visibleSkill) => {
      if (getExclusiveGroupBySkillId(visibleSkill.id) !== exclusiveGroup)
        return
      if (!visibleSkill.mitigationScope)
        return
      const key = `${columnKey}_${visibleSkill.id}`
      if (seen.has(key))
        return
      seen.add(key)
      units.push({
        key,
        col: column,
        skill: visibleSkill,
        columnKey,
        skillId: visibleSkill.id,
      })
    })
  })

  if (units.length > 0)
    return units

  if (!fallbackSkill.mitigationScope)
    return units
  const fallbackOwnerId = fallbackCol.key
  return [{
    key: `${fallbackOwnerId}_${fallbackSkill.id}`,
    col: fallbackCol,
    skill: fallbackSkill,
    columnKey: fallbackOwnerId,
    skillId: fallbackSkill.id,
  }]
}

function getLatestUsageByUnit(
  actions: PlayerActionRecord[],
  units: ExclusiveGroupAutoArrangeUnit[],
) {
  const latest = new Map<string, number>()
  const unitKeySet = new Set(units.map(unit => unit.key))
  actions.forEach((action) => {
    const key = `${action.columnKey}_${action.skillId}`
    if (!unitKeySet.has(key))
      return
    const previous = latest.get(key)
    if (previous === undefined || action.timestamp > previous)
      latest.set(key, action.timestamp)
  })
  return latest
}

function buildColumnOrderIndexMap() {
  const map = new Map<string, number>()
  props.columns.forEach((column, index) => {
    map.set(column.key, index)
  })
  return map
}

function getExclusiveGroupUnitPriority(
  unit: ExclusiveGroupAutoArrangeUnit,
  columnOrderByKey: Map<string, number>,
) {
  const headerOrder = columnOrderByKey.get(unit.columnKey)
  if (headerOrder !== undefined)
    return headerOrder

  const roleOrder: Record<ColumnDef['role'], number> = { tank: 0, healer: 1, dps: 2, unknown: 3 }
  const rolePriority = roleOrder[unit.col.role] ?? roleOrder.unknown
  return 1000 + rolePriority
}

function compareExclusiveGroupCandidate(
  current: { score: number, rhythmPenalty: number, timestamp: number, unitKey: string, gain: number, unitPriority: number },
  best: { score: number, rhythmPenalty: number, timestamp: number, unitKey: string, gain: number, unitPriority: number } | null,
) {
  if (!best)
    return true
  if (current.score > best.score + AUTO_PLAN_EPSILON)
    return true
  if (Math.abs(current.score - best.score) <= AUTO_PLAN_EPSILON) {
    if (current.rhythmPenalty < best.rhythmPenalty - AUTO_PLAN_EPSILON)
      return true
    if (Math.abs(current.rhythmPenalty - best.rhythmPenalty) <= AUTO_PLAN_EPSILON) {
      if (current.gain > best.gain + AUTO_PLAN_EPSILON)
        return true
      if (Math.abs(current.gain - best.gain) <= AUTO_PLAN_EPSILON) {
        if (current.timestamp < best.timestamp - AUTO_PLAN_EPSILON)
          return true
        if (Math.abs(current.timestamp - best.timestamp) <= AUTO_PLAN_EPSILON) {
          if (current.unitPriority < best.unitPriority)
            return true
          if (current.unitPriority === best.unitPriority)
            return current.unitKey < best.unitKey
        }
      }
    }
  }
  return false
}

function runAutoArrangeForExclusiveGroup(params: {
  mode: 'overwrite' | 'fill'
  rows: MitigationRow[]
  units: ExclusiveGroupAutoArrangeUnit[]
  partyStrategy: Extract<AutoArrangeStrategy, 'max-total' | 'peak-smoothing'>
}) {
  const { mode, rows, units, partyStrategy } = params
  const columnOrderByKey = buildColumnOrderIndexMap()
  const buildContext = createAutoArrangeBuildContext(rows)
  const unitKeySet = new Set(units.map(unit => unit.key))
  const preferredFirstUnit = mode === 'overwrite'
    ? [...units].sort((a, b) => {
        const orderDiff = getExclusiveGroupUnitPriority(a, columnOrderByKey) - getExclusiveGroupUnitPriority(b, columnOrderByKey)
        if (orderDiff !== 0)
          return orderDiff
        return a.key.localeCompare(b.key)
      })[0]
    : undefined
  const unitExclusiveGroup = units[0] ? getExclusiveGroupBySkillId(units[0].skill.id) : null
  const extremeFailureMask = buildExtremeFailureMask(rows)
  const rowCacheByUnit = new Map<string, AutoArrangeRowComputationCache>()
  units.forEach((unit) => {
    const coverage = getAutoArrangeCoverageScope(unit.skillId)
    rowCacheByUnit.set(unit.key, {
      extremeFailureMask,
      personalDamageByRow: coverage === 'self' ? buildPersonalDamageCacheForColumn(rows, unit.col) : undefined,
      skillMultiplierByRow: buildSkillMultiplierCache(rows, unit.skillId),
    })
  })
  const baseActions = mode === 'overwrite'
    ? props.playerActions.filter(action => !unitKeySet.has(`${action.columnKey}_${action.skillId}`))
    : [...props.playerActions]

  const currentActions = [...baseActions]
  const latestUsageByUnit = getLatestUsageByUnit(currentActions, units)
  let addedCount = 0
  let totalGain = 0
  const maxIterations = Math.max(1, rows.length * Math.max(1, units.length) * 2)

  const selectBestCandidate = (
    candidateUnits: ExclusiveGroupAutoArrangeUnit[],
    scheduledByUnitKey: Map<string, AutoScheduledAction[]>,
    scheduledActions: AutoScheduledAction[],
    scheduledExclusiveGroupActions: AutoScheduledAction[],
    baselineMultipliers: number[],
  ) => {
    let bestCandidate: null | {
      unit: ExclusiveGroupAutoArrangeUnit
      row: MitigationRow
      rowIndex: number
      score: number
      gain: number
      rhythmPenalty: number
      unitPriority: number
    } = null

    for (const unit of candidateUnits) {
      const duration = Math.max(0, Number(unit.skill.duration || 0))
      const effectiveDuration = getAutoArrangeEffectiveDuration(duration)
      const recastWindow = Math.max(AUTO_PLAN_EPSILON, getAutoArrangeRecastWindow(Number(unit.skill.recast || 0)))
      const unitPriority = getExclusiveGroupUnitPriority(unit, columnOrderByKey)
      const coverage = getAutoArrangeCoverageScope(unit.skillId)
      const strategy = coverage === 'party'
        ? partyStrategy
        : getDefaultAutoArrangeStrategy(unit.col, unit.skillId)
      const scheduledSkillActions = scheduledByUnitKey.get(unit.key) || EMPTY_SCHEDULED_ACTIONS
      const rowCache = rowCacheByUnit.get(unit.key)

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex]!
        if (isSkillAlreadyActiveAtRow(scheduledSkillActions, rowIndex, row.timestamp))
          continue
        if (!validateActionPlacementAgainstActions(currentActions, unit.col, unit.skillId, row.timestamp, scheduledActions, scheduledExclusiveGroupActions))
          continue

        const result = computeAutoUseWeightForFill(
          rows,
          rowIndex,
          unit.col,
          unit.skillId,
          effectiveDuration,
          baselineMultipliers,
          scheduledSkillActions,
          strategy,
          rowCache,
        )
        if (result.score <= AUTO_PLAN_EPSILON)
          continue

        const latestUsage = latestUsageByUnit.get(unit.key)
        const rhythmPenalty = latestUsage === undefined
          ? 0
          : Math.abs(row.timestamp - (latestUsage + recastWindow))

        const current = {
          score: result.score,
          rhythmPenalty,
          timestamp: row.timestamp,
          unitKey: unit.key,
          gain: result.gain,
          unitPriority,
        }
        const best = bestCandidate
          ? {
              score: bestCandidate.score,
              rhythmPenalty: bestCandidate.rhythmPenalty,
              timestamp: bestCandidate.row.timestamp,
              unitKey: bestCandidate.unit.key,
              gain: bestCandidate.gain,
              unitPriority: bestCandidate.unitPriority,
            }
          : null

        if (!compareExclusiveGroupCandidate(current, best))
          continue

        bestCandidate = {
          unit,
          row,
          rowIndex,
          score: result.score,
          gain: result.gain,
          rhythmPenalty,
          unitPriority,
        }
      }
    }

    return bestCandidate
  }

  while (addedCount < maxIterations) {
    const scheduledActions = buildScheduledActions(rows, currentActions, buildContext)
    const scheduledByUnitKey = buildScheduledActionsByUnitKey(scheduledActions)
    const scheduledExclusiveGroupActions = getExclusiveGroupActions(scheduledActions, unitExclusiveGroup)
    const baselineMultipliers = computeBaselineMultipliers(rows, scheduledActions)

    const firstRoundPreferredOnly = mode === 'overwrite' && addedCount === 0 && preferredFirstUnit
    let bestCandidate = selectBestCandidate(
      firstRoundPreferredOnly ? [preferredFirstUnit] : units,
      scheduledByUnitKey,
      scheduledActions,
      scheduledExclusiveGroupActions,
      baselineMultipliers,
    )
    if (!bestCandidate && firstRoundPreferredOnly) {
      bestCandidate = selectBestCandidate(
        units,
        scheduledByUnitKey,
        scheduledActions,
        scheduledExclusiveGroupActions,
        baselineMultipliers,
      )
    }

    if (!bestCandidate)
      break

    currentActions.push({
      id: createActionId(),
      timestamp: bestCandidate.row.timestamp,
      columnKey: bestCandidate.unit.columnKey,
      skillId: bestCandidate.unit.skillId,
      rowKey: bestCandidate.row.key,
    })
    latestUsageByUnit.set(bestCandidate.unit.key, bestCandidate.row.timestamp)
    addedCount += 1
    totalGain += bestCandidate.gain
  }

  return {
    actions: currentActions,
    addedCount,
    totalGain,
  }
}

function addFlowEdge(
  graph: MinCostFlowEdge[][],
  from: number,
  to: number,
  cap: number,
  cost: number,
) {
  const forward: MinCostFlowEdge = { to, rev: graph[to]!.length, cap, cost }
  const reverse: MinCostFlowEdge = { to: from, rev: graph[from]!.length, cap: 0, cost: -cost }
  graph[from]!.push(forward)
  graph[to]!.push(reverse)
}

function pickOptimalAutoIntervals(candidates: AutoIntervalCandidate[], capacity: number) {
  if (capacity <= 0 || candidates.length === 0)
    return [] as AutoIntervalCandidate[]

  const points = Array.from(new Set(candidates.flatMap(c => [c.timestamp, c.endTimestamp]))).sort((a, b) => a - b)
  if (points.length < 2)
    return [] as AutoIntervalCandidate[]

  const pointIndex = new Map<number, number>()
  points.forEach((point, index) => pointIndex.set(point, index))

  const graph: MinCostFlowEdge[][] = Array.from({ length: points.length }, () => [])
  for (let i = 0; i < points.length - 1; i++)
    addFlowEdge(graph, i, i + 1, capacity, 0)

  const intervalRefs: Array<{ from: number, edgeIndex: number, candidateIndex: number }> = []
  candidates.forEach((candidate, candidateIndex) => {
    const from = pointIndex.get(candidate.timestamp)
    const to = pointIndex.get(candidate.endTimestamp)
    if (from === undefined || to === undefined || to <= from)
      return
    addFlowEdge(graph, from, to, 1, -candidate.scoreScaled)
    intervalRefs.push({
      from,
      edgeIndex: graph[from]!.length - 1,
      candidateIndex,
    })
  })

  const source = 0
  const sink = points.length - 1
  let sent = 0
  while (sent < capacity) {
    const dist = Array.from({ length: points.length }, () => Number.POSITIVE_INFINITY)
    const inQueue = Array.from({ length: points.length }, () => false)
    const prevNode = Array.from({ length: points.length }, () => -1)
    const prevEdge = Array.from({ length: points.length }, () => -1)
    dist[source] = 0
    const queue: number[] = [source]
    inQueue[source] = true

    while (queue.length > 0) {
      const current = queue.shift()
      if (current === undefined)
        break
      inQueue[current] = false
      graph[current]!.forEach((edge, edgeIndex) => {
        if (edge.cap <= 0)
          return
        const nextDistance = dist[current]! + edge.cost
        if (nextDistance >= dist[edge.to]!)
          return
        dist[edge.to] = nextDistance
        prevNode[edge.to] = current
        prevEdge[edge.to] = edgeIndex
        if (!inQueue[edge.to]) {
          queue.push(edge.to)
          inQueue[edge.to] = true
        }
      })
    }

    if (!Number.isFinite(dist[sink]))
      break

    let add = capacity - sent
    let traceNode = sink
    while (traceNode !== source) {
      const from = prevNode[traceNode]
      const edgeIndex = prevEdge[traceNode]
      if (from === undefined || edgeIndex === undefined || from < 0 || edgeIndex < 0) {
        add = 0
        break
      }
      const edge = graph[from]?.[edgeIndex]
      if (!edge) {
        add = 0
        break
      }
      add = Math.min(add, edge.cap)
      traceNode = from
    }
    if (add <= 0)
      break

    traceNode = sink
    while (traceNode !== source) {
      const from = prevNode[traceNode]
      const edgeIndex = prevEdge[traceNode]
      if (from === undefined || edgeIndex === undefined || from < 0 || edgeIndex < 0) {
        add = 0
        break
      }
      const edge = graph[from]?.[edgeIndex]
      if (!edge) {
        add = 0
        break
      }
      edge.cap -= add
      graph[traceNode]![edge.rev]!.cap += add
      traceNode = from
    }
    if (add <= 0)
      break
    sent += add
  }

  const selected: AutoIntervalCandidate[] = []
  intervalRefs.forEach((ref) => {
    const edge = graph[ref.from]![ref.edgeIndex]
    if (!edge || edge.cap !== 0)
      return
    const candidate = candidates[ref.candidateIndex]
    if (candidate)
      selected.push(candidate)
  })
  selected.sort((a, b) => (a.timestamp - b.timestamp) || (a.rowIndex - b.rowIndex))
  return selected
}

async function runAutoArrangeForSkill() {
  const col = skillContextMenu.value.col
  const skill = skillContextMenu.value.skill
  if (!col || !skill)
    return

  const rows = sourceRows.value
  if (!rows || rows.length === 0)
    return

  const buildContext = createAutoArrangeBuildContext(rows)
  const columnKey = col.key
  const skillId = skill.id
  if (!skill.mitigationScope) {
    activeOverlay.value = null
    ElMessage.warning(`技能 ${skill.name} 未声明 mitigationScope，不参与自动排轴`)
    return
  }
  const selectedStrategy = await chooseAutoArrangeStrategyForSkill(col, skillId)
  if (!selectedStrategy)
    return
  const exclusiveGroup = getExclusiveGroupBySkillId(skillId)
  const exclusiveUnits = exclusiveGroup ? getExclusiveGroupAutoArrangeUnits(exclusiveGroup, col, skill) : []
  let exclusiveScope: AutoArrangeExclusiveScope = 'single'
  if (exclusiveUnits.length > 1) {
    const selectedScope = await chooseExclusiveGroupAutoArrangeScope(skill.name)
    if (!selectedScope)
      return
    exclusiveScope = selectedScope
    if (exclusiveScope === 'group') {
      const strategyForGroup = selectedStrategy === 'peak-smoothing' ? 'peak-smoothing' : 'max-total'
      const result = runAutoArrangeForExclusiveGroup({
        mode: 'overwrite',
        rows,
        units: exclusiveUnits,
        partyStrategy: strategyForGroup,
      })
      activeOverlay.value = null
      if (result.addedCount === 0) {
        ElMessage.warning(`自动排轴未找到 ${skill.name} 所在互斥组的有效收益点`)
        return
      }
      emit('update:playerActions', result.actions)
      ElMessage.success(`已自动排轴互斥组（${result.addedCount} 次，预计减伤 ${Math.round(result.totalGain)}，策略：${getAutoArrangeStrategyLabel(strategyForGroup)}）`)
      return
    }
  }

  const baseActions = props.playerActions.filter(a => !(a.columnKey === columnKey && a.skillId === skillId))
  const baseScheduledActions = buildScheduledActions(rows, baseActions, buildContext)
  const baselineMultipliers = computeBaselineMultipliers(rows, baseScheduledActions)
  const baseExclusiveGroupActions = getExclusiveGroupActions(baseScheduledActions, exclusiveGroup)
  const coverage = getAutoArrangeCoverageScope(skillId)
  const rowCache: AutoArrangeRowComputationCache = {
    extremeFailureMask: buildExtremeFailureMask(rows),
    personalDamageByRow: coverage === 'self' ? buildPersonalDamageCacheForColumn(rows, col) : undefined,
    skillMultiplierByRow: buildSkillMultiplierCache(rows, skillId),
  }

  const duration = Math.max(0, Number(skill.duration || 0))
  const effectiveDuration = getAutoArrangeEffectiveDuration(duration)
  const spacing = Math.max(AUTO_PLAN_EPSILON, getAutoArrangeRecastWindow(Number(skill.recast || 0)))
  const candidates: AutoIntervalCandidate[] = []

  rows.forEach((row, rowIndex) => {
    if (hasExclusiveGroupOverlap(baseExclusiveGroupActions, row.timestamp, duration))
      return
    const result = computeAutoUseWeight(rows, rowIndex, col, skillId, effectiveDuration, baselineMultipliers, selectedStrategy, rowCache)
    if (!Number.isFinite(result.score) || result.score <= 0)
      return
    candidates.push({
      rowIndex,
      timestamp: row.timestamp,
      endTimestamp: row.timestamp + spacing,
      gain: result.gain,
      score: result.score,
      scoreScaled: Math.max(1, Math.round(result.score * AUTO_PLAN_WEIGHT_SCALE)),
    })
  })

  if (candidates.length === 0) {
    activeOverlay.value = null
    ElMessage.warning(`自动排轴未找到 ${skill.name} 的有效收益点`)
    return
  }

  const capacity = Math.max(1, Number(skill.maxCharges || 1))
  const selected = pickOptimalAutoIntervals(candidates, capacity)
  if (selected.length === 0) {
    activeOverlay.value = null
    ElMessage.warning(`自动排轴未找到 ${skill.name} 的可用释放方案`)
    return
  }

  const nextActions: PlayerActionRecord[] = [
    ...baseActions,
    ...selected.map((candidate) => {
      const row = rows[candidate.rowIndex]!
      return {
        id: createActionId(),
        timestamp: candidate.timestamp,
        columnKey,
        skillId,
        rowKey: row.key,
      }
    }),
  ]

  emit('update:playerActions', nextActions)
  activeOverlay.value = null
  const totalGain = Math.round(selected.reduce((sum, item) => sum + item.gain, 0))
  const strategyLabel = getAutoArrangeStrategyLabel(selectedStrategy)
  ElMessage.success(`已自动排轴 ${skill.name}（${selected.length} 次，预计减伤 ${totalGain}，策略：${strategyLabel}）`)
}

async function runAutoArrangeForSkillFillGaps() {
  const col = skillContextMenu.value.col
  const skill = skillContextMenu.value.skill
  if (!col || !skill)
    return

  const rows = sourceRows.value
  if (!rows || rows.length === 0)
    return

  const buildContext = createAutoArrangeBuildContext(rows)
  const columnKey = col.key
  const skillId = skill.id
  if (!skill.mitigationScope) {
    activeOverlay.value = null
    ElMessage.warning(`技能 ${skill.name} 未声明 mitigationScope，不参与自动排轴`)
    return
  }
  const selectedStrategy = await chooseAutoArrangeStrategyForSkill(col, skillId)
  if (!selectedStrategy)
    return
  const exclusiveGroup = getExclusiveGroupBySkillId(skillId)
  const exclusiveUnits = exclusiveGroup ? getExclusiveGroupAutoArrangeUnits(exclusiveGroup, col, skill) : []
  if (exclusiveUnits.length > 1) {
    const selectedScope = await chooseExclusiveGroupAutoArrangeScope(skill.name)
    if (!selectedScope)
      return
    if (selectedScope === 'group') {
      const strategyForGroup = selectedStrategy === 'peak-smoothing' ? 'peak-smoothing' : 'max-total'
      const result = runAutoArrangeForExclusiveGroup({
        mode: 'fill',
        rows,
        units: exclusiveUnits,
        partyStrategy: strategyForGroup,
      })
      activeOverlay.value = null
      if (result.addedCount === 0) {
        ElMessage.warning(`自动补轴未找到 ${skill.name} 所在互斥组的可补全空位`)
        return
      }
      emit('update:playerActions', result.actions)
      ElMessage.success(`已补全互斥组 ${result.addedCount} 次（预计减伤 ${Math.round(result.totalGain)}，策略：${getAutoArrangeStrategyLabel(strategyForGroup)}）`)
      return
    }
  }

  const duration = Math.max(0, Number(skill.duration || 0))
  const effectiveDuration = getAutoArrangeEffectiveDuration(duration)
  const currentActions = [...props.playerActions]
  const coverage = getAutoArrangeCoverageScope(skillId)
  const rowCache: AutoArrangeRowComputationCache = {
    extremeFailureMask: buildExtremeFailureMask(rows),
    personalDamageByRow: coverage === 'self' ? buildPersonalDamageCacheForColumn(rows, col) : undefined,
    skillMultiplierByRow: buildSkillMultiplierCache(rows, skillId),
  }
  let addedCount = 0
  let totalGain = 0

  while (true) {
    const scheduledActions = buildScheduledActions(rows, currentActions, buildContext)
    const scheduledByUnitKey = buildScheduledActionsByUnitKey(scheduledActions)
    const baselineMultipliers = computeBaselineMultipliers(rows, scheduledActions)
    const scheduledSkillActions = scheduledByUnitKey.get(`${columnKey}_${skillId}`) || EMPTY_SCHEDULED_ACTIONS
    const scheduledExclusiveGroupActions = getExclusiveGroupActions(scheduledActions, exclusiveGroup)
    let bestRowIndex = -1
    let bestGain = 0
    let bestScore = 0
    rows.forEach((row, rowIndex) => {
      if (isSkillAlreadyActiveAtRow(scheduledSkillActions, rowIndex, row.timestamp))
        return
      if (!validateActionPlacementAgainstActions(currentActions, col, skillId, row.timestamp, scheduledActions, scheduledExclusiveGroupActions))
        return
      const result = computeAutoUseWeightForFill(
        rows,
        rowIndex,
        col,
        skillId,
        effectiveDuration,
        baselineMultipliers,
        scheduledSkillActions,
        selectedStrategy,
        rowCache,
      )
      if (result.score > bestScore + AUTO_PLAN_EPSILON
        || (Math.abs(result.score - bestScore) <= AUTO_PLAN_EPSILON && result.gain > bestGain + AUTO_PLAN_EPSILON)) {
        bestScore = result.score
        bestGain = result.gain
        bestRowIndex = rowIndex
      }
    })

    if (bestRowIndex < 0 || bestScore <= AUTO_PLAN_EPSILON)
      break

    const row = rows[bestRowIndex]
    if (!row)
      break
    currentActions.push({
      id: createActionId(),
      timestamp: row.timestamp,
      columnKey,
      skillId,
      rowKey: row.key,
    })
    addedCount += 1
    totalGain += bestGain
    if (addedCount > rows.length)
      break
  }

  activeOverlay.value = null
  if (addedCount === 0) {
    ElMessage.warning(`自动补轴未找到 ${skill.name} 的可补全空位`)
    return
  }
  emit('update:playerActions', currentActions)
  const strategyLabel = getAutoArrangeStrategyLabel(selectedStrategy)
  ElMessage.success(`已补全 ${skill.name} ${addedCount} 次（预计减伤 ${Math.round(totalGain)}，策略：${strategyLabel}）`)
}

function clearSkillActions() {
  const col = skillContextMenu.value.col
  const skill = skillContextMenu.value.skill
  if (!col || !skill)
    return

  const columnKey = col.key
  const skillId = skill.id
  const nextActions = props.playerActions.filter(a => !(a.columnKey === columnKey && a.skillId === skillId))
  const removedCount = props.playerActions.length - nextActions.length

  activeOverlay.value = null
  if (removedCount <= 0) {
    ElMessage.warning(`${skill.name} 当前没有释放记录`)
    return
  }
  emit('update:playerActions', nextActions)
  ElMessage.success(`已清除 ${skill.name} 的 ${removedCount} 条释放`)
}

function triggerSkillAutoArrange(mode: 'overwrite' | 'fill') {
  if (!isSelectedSkillAutoArrangeSupported.value)
    return
  if (mode === 'overwrite') {
    void runAutoArrangeForSkill()
    return
  }
  void runAutoArrangeForSkillFillGaps()
}

function updateRows(updater: (row: MitigationRow) => MitigationRow) {
  emit('update:rows', sourceRows.value.map(updater))
}

function updateShieldValue(row: MitigationRow, value: string) {
  const next = Number.parseInt(value, 10)
  const shieldValue = Number.isFinite(next) ? Math.max(0, next) : 0
  updateRows(r => (r.key === row.key ? { ...r, shieldValue } : r))
}

function isMechanicEditorType(value: unknown): value is 'aoe' | 'share' | 'tb' | 'normal' {
  return value === 'aoe' || value === 'share' || value === 'tb' || value === 'normal'
}

function handleMechanicTypeChange(value: unknown) {
  if (!isMechanicEditorType(value))
    return
  const row = mechanicEditor.row
  if (!row)
    return

  updateRows((r) => {
    if (r.actionId !== row.actionId)
      return r
    return {
      ...r,
      isAOE: value === 'aoe',
      isShare: value === 'share',
      isTB: value === 'tb',
    }
  })
}

function applyMechanicEditor(options?: { closeMenu?: boolean, showMessage?: boolean, scope?: 'single' | 'all' }) {
  const row = mechanicEditor.row
  if (!row)
    return

  const closeMenu = options?.closeMenu ?? true
  const showMessage = options?.showMessage ?? true

  const damage = Number.isFinite(mechanicEditor.damage)
    ? Math.max(0, Math.round(mechanicEditor.damage))
    : 0
  const isSingleDamage = (options?.scope ?? 'single') === 'single'

  updateRows((r) => {
    const damageMatched = isSingleDamage ? r.key === row.key : r.actionId === row.actionId
    if (!damageMatched)
      return r
    return {
      ...r,
      rawDamage: damage,
    }
  })

  if (closeMenu) {
    activeOverlay.value = null
    mechanicEditor.row = null
  }
  if (showMessage)
    ElMessage.success('机制数值修改成功')
}

function applyMechanicDamageToScope(scope: 'single' | 'all') {
  applyMechanicEditor({ scope })
}

function preventNumberInputWheel(event: WheelEvent) {
  event.preventDefault()
}

function triggerRename() {
  const row = mechanicContextMenu.value.row
  if (row) {
    emit('renameMechanic', row.action, row.actionId)
  }
  activeOverlay.value = null
}

function hideCurrentMechanic() {
  const row = mechanicContextMenu.value.row
  if (row && props.filterMechanics) {
    const next = props.filterMechanics.filter(id => id !== row.actionId)
    emit('update:filterMechanics', next)
  }
  activeOverlay.value = null
}

async function deleteCurrentMechanicRow() {
  const row = mechanicContextMenu.value.row
  if (!row)
    return

  const actionSummary = `${getCastStartDisplay(row)} / ${formatTime(row.timestamp)} ${row.action}`
  try {
    await ElMessageBox.confirm(
      `将永久删除该机制行：\n${actionSummary}`,
      '永久删除本行',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
  }
  catch {
    return
  }

  const nextRows = sourceRows.value.filter(item => item.key !== row.key)
  if (nextRows.length === sourceRows.value.length) {
    activeOverlay.value = null
    return
  }
  emit('update:rows', nextRows)

  const nextActions = props.playerActions.filter(action => action.rowKey !== row.key)
  if (nextActions.length !== props.playerActions.length)
    emit('update:playerActions', nextActions)

  activeOverlay.value = null
  ElMessage.success('已永久删除本行')
}

async function deleteMechanicRowsByActionId() {
  const row = mechanicContextMenu.value.row
  if (!row)
    return

  const actionId = String(row.actionId || '').trim()
  if (!actionId) {
    ElMessage.warning('当前行没有可用技能ID')
    return
  }

  const targetRows = sourceRows.value.filter(item => item.actionId === actionId)
  if (targetRows.length === 0) {
    activeOverlay.value = null
    return
  }

  const confirmText = `将永久删除技能ID ${actionId} 的 ${targetRows.length} 行，是否继续？`
  try {
    await ElMessageBox.confirm(
      confirmText,
      '按技能ID批量删除',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
  }
  catch {
    return
  }

  const targetRowKeys = new Set(targetRows.map(item => item.key))
  const nextRows = sourceRows.value.filter(item => item.actionId !== actionId)
  if (nextRows.length === sourceRows.value.length) {
    activeOverlay.value = null
    return
  }
  emit('update:rows', nextRows)

  const nextActions = props.playerActions.filter(action => !action.rowKey || !targetRowKeys.has(action.rowKey))
  if (nextActions.length !== props.playerActions.length)
    emit('update:playerActions', nextActions)

  if (props.filterMechanics?.includes(actionId)) {
    emit('update:filterMechanics', props.filterMechanics.filter(id => id !== actionId))
  }

  activeOverlay.value = null
  ElMessage.success(`已删除技能ID ${actionId} 的 ${targetRows.length} 行`)
}

function getMechanicTypeLabel(row: MitigationRow) {
  if (row.isShare)
    return '分摊'
  if (row.isAOE)
    return 'AOE'
  if (row.isTB)
    return '死刑'
  return '-'
}

function getCastStartDisplay(row: MitigationRow) {
  if (row.castTime !== undefined && row.castTime !== null && row.castTime !== '') {
    const castSeconds = Number.parseFloat(String(row.castTime))
    if (Number.isFinite(castSeconds))
      return formatTime(row.timestamp - castSeconds)
  }
  if (typeof row.castStartTime === 'number' && Number.isFinite(row.castStartTime))
    return formatTime(row.castStartTime)
  return '-'
}

function getTargetDisplay(row: MitigationRow) {
  if (!row.targets || row.targets.length === 0)
    return 'Unknown'
  if (row.targets.length > 1)
    return isAoeLike(row) ? 'Multiple' : (row.targets[0] || 'Unknown')
  return row.targets[0] || 'Unknown'
}

function getDamageNumberUnitScale() {
  return damageNumberDisplayUnit.value === 'k' ? 1000 : 10000
}

function getDamageNumberUnitSuffix() {
  return damageNumberDisplayUnit.value === 'k' ? 'K' : 'W'
}

function formatDamageNumber(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n))
    return '-'
  const unitScale = getDamageNumberUnitScale()
  if (!Number.isFinite(unitScale) || unitScale <= 0)
    return `${Math.round(n)}`
  const scaled = n / unitScale
  return `${DAMAGE_NUMBER_FORMATTER.format(scaled)}${getDamageNumberUnitSuffix()}`
}

function formatDamageInputDisplay(value: string | number | undefined) {
  if (value === undefined || value === null || value === '')
    return ''
  return formatDamageNumber(value)
}

function parseDamageInputValue(value: string) {
  const normalized = String(value ?? '').replaceAll(',', '').trim()
  if (!normalized)
    return 0
  const upper = normalized.toUpperCase()
  let multiplier = getDamageNumberUnitScale()
  let rawNumberText = upper
  if (upper.endsWith('K') || upper.endsWith('W')) {
    rawNumberText = upper.slice(0, -1).trim()
    multiplier = upper.endsWith('K') ? 1000 : 10000
  }
  const parsed = Number(rawNumberText)
  if (!Number.isFinite(parsed))
    return 0
  return Math.max(0, Math.round(parsed * multiplier))
}

function getMechanicMenuTitle(row: MitigationRow | null | undefined) {
  if (!row)
    return ''
  const actionId = String(row.actionId || '').trim()
  return actionId ? `${row.action}(${actionId})` : row.action
}

const hiddenSkillSetByColumn = computed(() => {
  const map = new Map<string, Set<number>>()
  props.columns.forEach((col) => {
    map.set(col.key, getNormalizedHiddenSkillSet(col))
  })
  return map
})

function getNormalizedHiddenSkillSet(col: ColumnDef) {
  const hidden = new Set(col.hiddenSkillIds || [])
  if (col.skills.length === 0)
    return hidden
  const visibleCount = col.skills.reduce((count, skill) => count + (hidden.has(skill.id) ? 0 : 1), 0)
  if (visibleCount > 0)
    return hidden
  hidden.delete(col.skills[0]!.id)
  return hidden
}

function isSkillHidden(col: ColumnDef, skillId: number) {
  return hiddenSkillSetByColumn.value.get(col.key)?.has(skillId) ?? false
}

const visibleSkillsByColumn = computed(() => {
  const map = new Map<string, MitigationSkill[]>()
  props.columns.forEach((col) => {
    const hidden = hiddenSkillSetByColumn.value.get(col.key)
    if (!hidden || hidden.size === 0) {
      map.set(col.key, col.skills)
      return
    }
    map.set(col.key, col.skills.filter(skill => !hidden.has(skill.id)))
  })
  return map
})

function getVisibleSkills(col: ColumnDef) {
  return visibleSkillsByColumn.value.get(col.key) || col.skills
}

const gridStyleVars = computed(() => ({
  '--mg-fixed-w-cast-start': `${MITIGATION_GRID_WIDTH.castStart}px`,
  '--mg-fixed-w-time': `${MITIGATION_GRID_WIDTH.time}px`,
  '--mg-fixed-w-name': `${MITIGATION_GRID_WIDTH.nameMin}px`,
  '--mg-fixed-w-cast': `${MITIGATION_GRID_WIDTH.cast}px`,
  '--mg-debug-w': `${MITIGATION_GRID_WIDTH.debug}px`,
  '--mg-debug-w-xl': `${MITIGATION_GRID_WIDTH.debugXL}px`,
  '--mg-debug-w-sm': `${MITIGATION_GRID_WIDTH.debugSM}px`,
  '--mg-debug-w-lg': `${MITIGATION_GRID_WIDTH.debugLG}px`,
  '--mg-fixed-w-dmg': `${MITIGATION_GRID_WIDTH.damage}px`,
  '--mg-fixed-w-shield': `${MITIGATION_GRID_WIDTH.shield}px`,
  '--mg-fixed-w-reduction': `${MITIGATION_GRID_WIDTH.reduction}px`,
  '--mg-skill-cell-size': `${MITIGATION_GRID_WIDTH.skillCell}px`,
  '--mg-skill-icon-size': `${MITIGATION_GRID_WIDTH.skillIcon}px`,
  '--mg-add-column-header-width': `${MITIGATION_GRID_WIDTH.addColumnHeader}px`,
}))

const columnWidthByKey = computed(() => {
  const map = new Map<string, number>()
  props.columns.forEach((col) => {
    const visibleSkills = visibleSkillsByColumn.value.get(col.key) || col.skills
    map.set(col.key, getMitigationGridColumnWidth(visibleSkills.length))
  })
  return map
})

function getColumnWidth(col: ColumnDef) {
  return columnWidthByKey.value.get(col.key) || 6
}

function toggleSkillVisibility(col: ColumnDef, skillId: number) {
  let blocked = false
  const newCols = props.columns.map((c) => {
    if (c.key !== col.key)
      return c

    const hiddenSet = getNormalizedHiddenSkillSet(c)
    if (hiddenSet.has(skillId)) {
      hiddenSet.delete(skillId)
    }
    else {
      const visibleCount = c.skills.reduce((count, skill) => count + (hiddenSet.has(skill.id) ? 0 : 1), 0)
      if (visibleCount <= 1) {
        blocked = true
        return c
      }
      hiddenSet.add(skillId)
    }

    return { ...c, hiddenSkillIds: [...hiddenSet] }
  })

  if (blocked) {
    ElMessage.warning('每个职业至少保留一个技能可见')
    return
  }

  emit('update:columns', newCols)
}

const isDragging = ref(false)

function onSkillsReordered(col: ColumnDef, newSkills: MitigationSkill[]) {
  const newCols = props.columns.map((c) => {
    if (c.key !== col.key)
      return c
    return { ...c, skills: newSkills }
  })
  emit('update:columns', newCols)
}

function handleColumnsDragUpdate(newColumns: ColumnDef[]) {
  onColumnsReordered(newColumns)
}

function handleSkillsDragUpdate(col: ColumnDef, newSkills: MitigationSkill[]) {
  onSkillsReordered(col, newSkills)
}
const isJustFinishedDrag = ref(false)

function onDragEnd() {
  // Clear dragging immediately
  isDragging.value = false
  // Set just finished flag
  isJustFinishedDrag.value = true
  setTimeout(() => {
    isJustFinishedDrag.value = false
  }, 300)
}

function addPartyColumn(col?: ColumnDef) {
  emit('partyColumnAdd', col?.key)
  activeOverlay.value = null
}

function removePartyColumn(col: ColumnDef) {
  if (props.columns.length <= 1)
    return
  emit('partyColumnRemove', col.key)
  activeOverlay.value = null
}

function removeCurrentColumn() {
  const col = columnContextMenu.value.col
  if (!col)
    return
  removePartyColumn(col)
}

function handlePartyColumnJobChange(col: ColumnDef, value: unknown) {
  const jobEnum = Number(value)
  if (Number.isNaN(jobEnum) || col.jobEnum === jobEnum)
    return
  emit('partyColumnChangeJob', {
    colKey: col.key,
    jobEnum,
  })
}

const isColumnDragging = ref(false)
const isJustFinishedColumnDrag = ref(false)

function onColumnDragEnd() {
  isColumnDragging.value = false
  isJustFinishedColumnDrag.value = true
  setTimeout(() => {
    isJustFinishedColumnDrag.value = false
  }, 200)
}

function onColumnsReordered(newColumns: ColumnDef[]) {
  emit('partyColumnReorder', newColumns.map(col => col.key))
}

function handleColumnNameClick(col: ColumnDef) {
  if (isColumnDragging.value || isJustFinishedColumnDrag.value)
    return
  toggleOverlay(`col-filter-${col.key}`)
}
</script>

<template>
  <div class="grid-container" @contextmenu.prevent>
    <div class="grid-table" :style="gridStyleVars">
      <!-- Header -->
      <div class="row header">
        <div class="cell fixed-w-cast-start">
          <span class="header-label">读条</span>
        </div>
        <div class="cell fixed-w-time">
          <span class="header-label">时间</span>
        </div>
        <div class="cell fixed-w-name">
          <div class="header-inner">
            <span class="header-label">机制名称</span>
            <el-popover
              :visible="activeOverlay === 'mechanic-filter'"
              placement="bottom-start"
              width="auto"
              trigger="click"
              :show-arrow="false"
            >
              <template #reference>
                <el-icon
                  class="filter-icon"
                  :class="{ active: (filterMechanics?.length || 0) > 0 }"
                  @click.stop="toggleOverlay('mechanic-filter')"
                >
                  <Filter />
                </el-icon>
              </template>
              <div class="filter-popover" @click.stop>
                <div class="filter-section">
                  <div class="section-header">
                    <el-checkbox
                      :model-value="isAOESelected"
                      :indeterminate="isIndeterminateAOE"
                      @change="handleAOEMechanicsChange"
                    >
                      AOE
                    </el-checkbox>
                  </div>
                  <el-checkbox-group
                    :model-value="filterMechanics"
                    class="section-list"
                    @change="handleFilterMechanicsChange"
                  >
                    <el-checkbox v-for="opt in aoeMechanics" :key="opt.actionId" :value="opt.actionId" :label="opt.actionId ? (opt.action ? `${opt.action} (${opt.actionId})` : opt.actionId) : opt.action" size="small" />
                  </el-checkbox-group>
                </div>

                <div class="filter-section">
                  <div class="section-header">
                    <el-checkbox
                      :model-value="isShareSelected"
                      :indeterminate="isIndeterminateShare"
                      @change="handleShareMechanicsChange"
                    >
                      分摊
                    </el-checkbox>
                  </div>
                  <el-checkbox-group
                    :model-value="filterMechanics"
                    class="section-list"
                    @change="handleFilterMechanicsChange"
                  >
                    <el-checkbox v-for="opt in shareMechanics" :key="opt.actionId" :value="opt.actionId" :label="opt.actionId ? (opt.action ? `${opt.action} (${opt.actionId})` : opt.actionId) : opt.action" size="small" />
                  </el-checkbox-group>
                </div>

                <div class="filter-section">
                  <div class="section-header">
                    <el-checkbox
                      :model-value="isTBSelected"
                      :indeterminate="isIndeterminateTB"
                      @change="handleTBMechanicsChange"
                    >
                      死刑
                    </el-checkbox>
                  </div>
                  <el-checkbox-group
                    :model-value="filterMechanics"
                    class="section-list"
                    @change="handleFilterMechanicsChange"
                  >
                    <el-checkbox v-for="opt in tbMechanics" :key="opt.actionId" :value="opt.actionId" :label="opt.actionId ? (opt.action ? `${opt.action} (${opt.actionId})` : opt.actionId) : opt.action" size="small" />
                  </el-checkbox-group>
                </div>

                <div class="filter-section">
                  <div class="section-header">
                    <el-checkbox
                      :model-value="isNormalSelected"
                      :indeterminate="isIndeterminateNormal"
                      @change="handleNormalMechanicsChange"
                    >
                      其他
                    </el-checkbox>
                  </div>
                  <el-checkbox-group
                    :model-value="filterMechanics"
                    class="section-list"
                    @change="handleFilterMechanicsChange"
                  >
                    <el-checkbox v-for="opt in normalMechanics" :key="opt.actionId" :value="opt.actionId" :label="opt.actionId ? (opt.action ? `${opt.action} (${opt.actionId})` : opt.actionId) : opt.action" size="small" />
                  </el-checkbox-group>
                </div>
              </div>
            </el-popover>
          </div>
        </div>
        <div v-if="isDebug" class="cell fixed-w-cast">
          <span class="header-label">咏唱</span>
        </div>

        <!-- Debug Columns Header -->
        <template v-if="isDebug">
          <div class="cell debug-w-lg">
            <span class="header-label">Source</span>
          </div>
          <div class="cell debug-w-lg">
            <span class="header-label">Target</span>
          </div>
          <div class="cell debug-w">
            <span class="header-label">ID</span>
          </div>
          <div class="cell debug-w-xl">
            <span class="header-label">Flag</span>
          </div>
          <div class="cell debug-w-lg">
            <span class="header-label">属性</span>
          </div>
          <div class="cell debug-w-sm">
            <span class="header-label">类型</span>
          </div>
          <div class="cell debug-w-sm">
            <span class="header-label">数量</span>
          </div>
        </template>

        <div class="cell fixed-w-dmg">
          <span class="header-label">原伤</span>
        </div>
        <div class="cell fixed-w-shield">
          <span class="header-label">护盾</span>
        </div>
        <div class="cell fixed-w-reduction">
          <span class="header-label">减伤率</span>
        </div>
        <div class="cell fixed-w-dmg">
          <span class="header-label">模拟伤害</span>
        </div>

        <VueDraggable
          :model-value="columns"
          class="columns-drag-row"
          :animation="150"
          :force-fallback="true"
          :fallback-tolerance="16"
          ghost-class="col-ghost"
          drag-class="col-drag"
          fallback-class="col-fallback"
          handle=".col-name-trigger"
          @start="isColumnDragging = true"
          @end="onColumnDragEnd"
          @update:model-value="handleColumnsDragUpdate"
        >
          <div
            v-for="col in columns"
            :key="col.key"
            class="cell col-header"
            :style="{ width: `${getColumnWidth(col)}px`, minWidth: `${getColumnWidth(col)}px` }"
          >
            <div class="col-name-row">
              <el-popover
                :visible="activeOverlay === `col-filter-${col.key}`"
                placement="bottom"
                :width="150"
                popper-style="padding: 6px"
                trigger="click"
                :show-arrow="false"
              >
                <template #reference>
                  <div
                    class="col-name col-name-trigger"
                    :class="{ filtered: (col.hiddenSkillIds?.length || 0) > 0 }"
                    @click.stop="handleColumnNameClick(col)"
                    @contextmenu.prevent="handleRightClickColumn(col, $event)"
                  >
                    <span class="col-name-main">{{ getColDisplayName(col) }}</span>
                  </div>
                </template>
                <div class="skill-filter-list" @click.stop>
                  <div class="column-party-editor">
                    <el-select
                      v-if="partyCompositionJobOptions && partyCompositionJobOptions.length > 0"
                      :model-value="col.jobEnum"
                      size="small"
                      class="column-party-job-select"
                      @update:model-value="(value) => handlePartyColumnJobChange(col, value)"
                    >
                      <el-option
                        v-for="option in partyCompositionJobOptions"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </div>
                  <VueDraggable
                    :model-value="col.skills"
                    :animation="150"
                    :force-fallback="true"
                    ghost-class="ghost"
                    drag-class="drag"
                    fallback-class="fallback"
                    handle=".drag-handle"
                    class="skill-drag-list"
                    :class="{ 'is-dragging': isDragging, 'just-finished-drag': isJustFinishedDrag }"
                    @start="isDragging = true"
                    @end="onDragEnd"
                    @update:model-value="(val: MitigationSkill[]) => handleSkillsDragUpdate(col, val)"
                  >
                    <div v-for="skill in col.skills" :key="skill.id" class="skill-filter-item">
                      <el-checkbox
                        :model-value="!isSkillHidden(col, skill.id)"
                        size="small"
                        class="skill-checkbox"
                        @update:model-value="toggleSkillVisibility(col, skill.id)"
                      >
                        <div class="skill-filter-label">
                          <img :src="skill.icon" class="mini-icon">
                          <span>{{ skill.name }}</span>
                        </div>
                      </el-checkbox>
                      <div class="drag-handle">
                        <el-icon><Rank /></el-icon>
                      </div>
                    </div>
                  </VueDraggable>
                </div>
              </el-popover>
            </div>
            <div class="skills-row">
              <div
                v-for="skill in getVisibleSkills(col)"
                :key="skill.id"
                class="skill-icon-wrap clickable"
                @contextmenu.prevent="handleRightClickSkill($event, col, skill)"
              >
                <img
                  v-if="skill.icon"
                  :src="skill.icon"
                  :alt="skill.name"
                  class="skill-icon"
                  @error="handleImgError"
                >
                <span v-else class="skill-letter">{{ skill.name[0] }}</span>
              </div>
            </div>
          </div>
        </VueDraggable>
        <div class="cell add-column-header">
          <el-button size="small" text class="add-column-btn" @click.stop="addPartyColumn()">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- Rows -->
      <div
        v-for="(row, rowIndex) in rows"
        :key="row.key"
        v-memo="[row._v, row.shieldValue, isDebug, columns.length, columnHiddenHash, columnOrderHash, damageNumberDisplayUnit]"
        class="row content-row"
      >
        <div class="cell fixed-w-cast-start">
          {{ getCastStartDisplay(row) }}
        </div>
        <div class="cell fixed-w-time">
          {{ formatTime(row.timestamp) }}
        </div>
        <div
          class="cell fixed-w-name clickable text-ellipsis"
          :class="{ 'text-share': row.isShare, 'text-aoe': row.isAOE, 'text-tb': row.isTB, 'text-normal': !row.isShare && !row.isAOE && !row.isTB }"
          :style="{ color: row.isShare ? (mechanicColors.share || '#f59e0b') : row.isAOE ? mechanicColors.aoe : row.isTB ? mechanicColors.tb : mechanicColors.normal }"
          @contextmenu.prevent="handleRightClickMechanic(row, $event)"
        >
          {{ row.action }}
        </div>
        <div v-if="isDebug" class="cell fixed-w-cast">
          {{ row.castTime ?? '-' }}
        </div>
        <!-- Debug Columns Content -->
        <template v-if="isDebug">
          <div class="cell debug-w-lg debug-text">
            {{ row.source }}
          </div>

          <div class="cell debug-w-lg debug-text">
            <el-popover v-if="row.damageDetails && row.damageDetails.length > 1" trigger="hover" placement="top" :width="220">
              <template #reference>
                <span class="multiple-label">{{ getTargetDisplay(row) }} ({{ row.targets?.length || 0 }})</span>
              </template>
              <div class="popover-list">
                <div class="popover-item detail-header">
                  <span class="detail-target">目标</span>
                  <span class="detail-raw">原伤</span>
                  <span class="detail-flag">Flag</span>
                </div>
                <div v-for="(detail, i) in row.damageDetails" :key="i" class="popover-item detail-item">
                  <span class="detail-target">{{ detail.target }}</span>
                  <span class="detail-raw font-mono">{{ formatDamageNumber(detail.estimatedRaw) }}</span>
                  <span class="detail-flag font-mono">{{ detail.flag }}</span>
                </div>
              </div>
            </el-popover>
            <span v-else>{{ getTargetDisplay(row) }}</span>
          </div>

          <div class="cell debug-w debug-text">
            {{ row.actionId }}
          </div>

          <div class="cell debug-w-xl debug-text">
            <template v-if="row.flags && row.flags.length > 0">
              <el-popover v-if="new Set(row.flags).size > 1" trigger="hover" placement="top" :width="140">
                <template #reference>
                  <span class="multiple-label">Flag ({{ row.flags.length }})</span>
                </template>
                <div class="popover-list">
                  <div class="popover-item detail-header">
                    <span class="detail-target">Flag 记录</span>
                  </div>
                  <div v-for="(f, i) in row.flags" :key="i" class="popover-item font-mono">
                    {{ f }}
                  </div>
                </div>
              </el-popover>
              <span v-else>{{ row.flags[0] }} ({{ row.flags.length }})</span>
            </template>
          </div>

          <div class="cell debug-w-lg debug-text">
            <span>{{ row.damageType }}</span>
          </div>
          <div class="cell debug-w-sm debug-text">
            {{ getMechanicTypeLabel(row) }}
          </div>
          <div class="cell debug-w-sm debug-text">
            {{ row.flags?.length || 0 }}
          </div>
        </template>

        <div
          class="cell fixed-w-dmg font-mono"
          :class="row._sim?.damageTypeClass"
          @contextmenu.prevent="handleRightClickMechanicDamage(row, $event)"
        >
          <span
            v-if="row.damageDetails && row.damageDetails.length > 1"
            class="multiple-label"
            @mouseenter="showDamagePopover($event, row)"
            @mouseleave="hideDamagePopover"
          >
            {{ formatDamageNumber(row.rawDamage) }}
          </span>
          <span v-else>{{ formatDamageNumber(row.rawDamage) }}</span>
        </div>
        <div class="cell fixed-w-shield">
          <input
            :id="`shield-${row.key}`"
            class="shield-input font-mono"
            type="number"
            min="0"
            :name="`shield-${row.key}`"
            autocomplete="off"
            :value="row.shieldValue ?? ''"
            @input="updateShieldValue(row, ($event.target as HTMLInputElement).value)"
          >
        </div>
        <div class="cell fixed-w-reduction font-mono">
          {{ formatReduction(getRowReductionRate(row)) }}
        </div>
        <div class="cell fixed-w-dmg font-mono">
          {{ formatDamageNumber(getSimulatedDamage(row)) }}
        </div>

        <div
          v-for="col in columns"
          :key="col.key"
          class="cell col-content"
          :style="{ width: `${getColumnWidth(col)}px`, minWidth: `${getColumnWidth(col)}px` }"
        >
          <div
            v-for="skill in getVisibleSkills(col)"
            :key="skill.id"
            :class="getCellClasses(row, rowIndex, col, skill.id)"
            @click.left="toggleCell(row, col, skill.id)"
            @contextmenu.prevent="handleRightClickCell($event, row, col, skill)"
          >
            <div
              v-if="getCellSim(row, col, skill.id)?.showDot"
              class="check-dot"
            >
              <img
                v-if="skill.icon"
                :src="skill.icon"
                :alt="skill.name"
                class="check-icon"
                @error="handleImgError"
              >
              <span v-else class="check-letter">{{ skill.name[0] }}</span>
            </div>
            <div
              class="hover-trigger"
              @mouseenter="showCellPopover($event, row, col, skill)"
              @mouseleave="hideCellPopover"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Popover -->
    <el-popover :visible="!!editingCell" :virtual-ref="editingCell?.target" virtual-triggering width="240" popper-style="padding: 8px">
      <div class="edit-popover">
        <div class="edit-field">
          <span>Time:</span>
          <span class="time-display font-mono">{{ editDisplayTime }}</span>
        </div>
        <div class="edit-field">
          <span>Offset:</span>
          <el-input-number
            v-model="editForm.offset"
            :step="1"
            size="small"
            controls-position="right"
            class="offset-input"
          />
        </div>
        <el-button type="primary" size="small" style="width: 100%; margin-top: 8px" @click="saveEdit">
          Apply
        </el-button>
      </div>
    </el-popover>

    <!-- Context Menu -->
    <!-- Mechanic Context Menu -->
    <transition name="menu-fade">
      <div
        v-if="activeOverlay === 'mechanic-ctx'"
        ref="mechanicContextMenuRef"
        class="custom-context-menu"
        :style="{ top: `${mechanicContextMenu.top}px`, left: `${mechanicContextMenu.left}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <div class="menu-header">
          {{ getMechanicMenuTitle(mechanicContextMenu.row) }}
        </div>
        <div class="menu-divider" />
        <div class="menu-item" @click="triggerRename">
          <el-icon><Edit /></el-icon>
          <span>重命名机制</span>
        </div>
        <div class="menu-item" @click="hideCurrentMechanic">
          <el-icon><Filter /></el-icon>
          <span>隐藏此机制</span>
        </div>
        <div class="menu-divider" />
        <div class="menu-item danger" @click="deleteCurrentMechanicRow">
          <span>永久删除本行</span>
        </div>
        <div class="menu-item danger" @click="deleteMechanicRowsByActionId">
          <span>永久删除全部此技能行</span>
        </div>
      </div>
    </transition>

    <transition name="menu-fade">
      <div
        v-if="activeOverlay === 'mechanic-edit-ctx'"
        ref="mechanicEditContextMenuRef"
        class="custom-context-menu"
        :style="{ top: `${mechanicEditContextMenu.top}px`, left: `${mechanicEditContextMenu.left}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <div class="menu-header">
          {{ getMechanicMenuTitle(mechanicEditContextMenu.row) }}
        </div>
        <div class="menu-divider" />
        <div v-if="mechanicEditContextMenu.row" class="mechanic-inline-editor">
          <div class="mechanic-inline-row">
            <span class="inline-label">类型</span>
            <el-radio-group
              v-model="mechanicEditor.type"
              size="small"
              class="inline-radio-group"
              @change="handleMechanicTypeChange"
            >
              <el-radio-button value="aoe">
                AOE
              </el-radio-button>
              <el-radio-button value="share">
                分摊
              </el-radio-button>
              <el-radio-button value="tb">
                死刑
              </el-radio-button>
              <el-radio-button value="normal">
                普通
              </el-radio-button>
            </el-radio-group>
          </div>
          <div class="menu-divider inline-divider" />
          <div class="mechanic-inline-row">
            <span class="inline-label">数值</span>
            <el-input-number
              v-model="mechanicEditor.damage"
              :min="0"
              :step="getDamageNumberUnitScale()"
              size="small"
              controls-position="right"
              class="inline-damage-input"
              :formatter="formatDamageInputDisplay"
              :parser="parseDamageInputValue"
              @wheel.prevent="preventNumberInputWheel"
            />
          </div>
          <div class="inline-apply-actions">
            <el-button size="small" class="inline-apply-btn" @click="applyMechanicDamageToScope('single')">
              应用于当前
            </el-button>
            <el-button size="small" type="primary" class="inline-apply-btn" @click="applyMechanicDamageToScope('all')">
              应用于全部
            </el-button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Column Context Menu -->
    <transition name="menu-fade">
      <div
        v-if="activeOverlay === 'column-ctx'"
        ref="columnContextMenuRef"
        class="custom-context-menu"
        :style="{ top: `${columnContextMenu.top}px`, left: `${columnContextMenu.left}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <div class="menu-header">
          {{ columnContextMenu.col ? getColDisplayName(columnContextMenu.col) : 'Column' }}
        </div>
        <div class="menu-divider" />
        <div class="menu-item" @click="copyColumnData">
          <span>复制</span>
        </div>
        <div class="menu-item" @click="pasteColumnData">
          <span>粘贴</span>
        </div>
        <div class="menu-divider" />
        <div class="menu-item" @click="copyTimelineText('column')">
          <span>复制为时间轴文本</span>
        </div>
        <div class="menu-divider" />
        <div class="menu-item danger" :class="{ disabled: columns.length <= 1 }" @click="removeCurrentColumn">
          <span>删除职业列</span>
        </div>
      </div>
    </transition>

    <!-- Skill Context Menu -->
    <transition name="menu-fade">
      <div
        v-if="activeOverlay === 'skill-ctx'"
        ref="skillContextMenuRef"
        class="custom-context-menu"
        :style="{ top: `${skillContextMenu.top}px`, left: `${skillContextMenu.left}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <div class="menu-header">
          {{ skillContextMenu.skill?.name }}
        </div>
        <div class="menu-divider" />
        <div class="menu-item" @click="copyTimelineText('skill')">
          <span>复制时间轴文本</span>
        </div>
        <div class="menu-item danger" @click="clearSkillActions">
          <span>清除所有释放</span>
        </div>
        <div class="menu-divider" />
        <div
          class="menu-item"
          :class="{ disabled: !isSelectedSkillAutoArrangeSupported }"
          :title="selectedSkillAutoArrangeUnsupportedReason"
          @click="triggerSkillAutoArrange('overwrite')"
        >
          <span>自动排轴（覆盖现有方案）</span>
        </div>
        <div
          class="menu-item"
          :class="{ disabled: !isSelectedSkillAutoArrangeSupported }"
          :title="selectedSkillAutoArrangeUnsupportedReason"
          @click="triggerSkillAutoArrange('fill')"
        >
          <span>自动排轴（填补空位）</span>
        </div>
      </div>
    </transition>

    <!-- Shared Cell Popover -->
    <el-popover
      :visible="isCellPopoverVisible"
      :virtual-ref="cellPopover.target"
      virtual-triggering
      placement="right"
      :width="170"
      popper-style="padding: 6px"
    >
      <div v-if="cellPopoverInfo" class="popover-list cell-popover">
        <div class="popover-item detail-header">
          {{ cellPopoverInfo.skill.name }}
        </div>
        <div class="popover-item">
          状态 {{ getStatusLabelForCell(cellPopoverInfo.sim.status, cellPopoverInfo.sim.useTimestamp, cellPopoverInfo.row.timestamp) }}
        </div>
        <div v-if="cellPopoverInfo.sim.useTimestamp !== undefined" class="popover-item">
          释放时间: {{ formatTime(cellPopoverInfo.sim.useTimestamp) }}
        </div>
        <div v-if="cellPopoverInfo.sim.useTimestamp !== undefined || cellPopoverInfo.sim.status === 'conflict' || cellPopoverInfo.sim.status === 'cooldown'" class="popover-item">
          剩余冷却: {{ Math.round(cellPopoverInfo.sim.recastLeft) }}s
        </div>
        <div v-if="cellPopoverInfo.sim.status === 'conflict' && cellPopoverInfo.sim.conflictTime" class="popover-item text-danger">
          警告: 会导致 {{ formatTime(cellPopoverInfo.sim.conflictTime) }} 处充能不足
        </div>
        <div v-if="cellPopoverInfo.skill.maxCharges && cellPopoverInfo.skill.maxCharges > 1" class="popover-item">
          充能层数: {{ cellPopoverInfo.sim.charges }} / {{ cellPopoverInfo.skill.maxCharges }}
        </div>
      </div>
    </el-popover>

    <!-- Shared Damage Popover -->
    <el-popover
      :visible="isDamagePopoverVisible"
      :virtual-ref="damagePopover.target"
      virtual-triggering
      placement="top"
      :width="180"
      popper-style="padding: 6px"
    >
      <div v-if="damagePopover.row" class="popover-list">
        <div class="popover-item detail-header">
          <span class="detail-target">目标</span>
          <span class="detail-raw">原伤记录</span>
        </div>
        <div v-for="(detail, i) in damagePopover.row.damageDetails" :key="i" class="popover-item detail-item">
          <span class="detail-target">{{ detail.target }}</span>
          <span class="detail-raw font-mono">{{ formatDamageNumber(detail.estimatedRaw) }}</span>
        </div>
        <div class="popover-footer">
          {{ isAoeLike(damagePopover.row) ? '基准原伤' : '原伤合计' }}: {{ formatDamageNumber(damagePopover.row.rawDamage) }}
        </div>
      </div>
    </el-popover>
  </div>
</template>

<style scoped lang="scss">
.grid-container {
  --mg-header-bg: #f8fafc;
  --mg-header-bg-soft: #f1f5f9;
  --mg-header-border: #dbe3ee;
  --mg-header-text: #4b5563;
  --mg-col-name: #5b21b6;
  --mg-col-name-hover: #4c1d95;
  --mg-col-name-bg: rgba(124, 58, 237, 0.08);

  height: 100%;
  overflow: auto;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  user-select: none;
}

.grid-table { display: inline-flex; flex-direction: column; min-width: 100%; }

.row {
  display: flex;
  flex-wrap: nowrap;
  position: relative;
  &:not(.header):hover { background-color: #fafafa; }
}

.header {
  position: sticky; top: 0; z-index: 100;
  flex-wrap: nowrap;
  background: var(--mg-header-bg);
  font-weight: bold;
  font-size: 11px;
  border-bottom: 1px solid var(--mg-header-border);
  box-shadow:
    0 1px 0 rgba(15, 23, 42, 0.08),
    0 8px 18px rgba(15, 23, 42, 0.04);
  .cell { height: 44px; padding: 0 4px; }
}

.header-label {
  display: inline-block;
  color: var(--mg-header-text);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.cell {
  display: flex; align-items: center; padding: 0;
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  height: 22px;
  font-size: 11px;
  box-sizing: border-box;
}

.fixed-w-time { width: var(--mg-fixed-w-time); justify-content: center; color: #888; user-select: text; }
.fixed-w-cast-start { width: var(--mg-fixed-w-cast-start); justify-content: center; color: #888; user-select: text; }
.fixed-w-name { min-width: var(--mg-fixed-w-name); width: fit-content; flex: 0 1 auto; padding-left: 4px; user-select: text; }
.fixed-w-cast { width: var(--mg-fixed-w-cast); justify-content: center; color: #666; font-size: 11px; }

.debug-w { width: var(--mg-debug-w); justify-content: center; background: #f9f9f9; font-size: 10px; color: #666; }
.debug-w-xl { width: var(--mg-debug-w-xl); justify-content: center; background: #f9f9f9; font-size: 10px; color: #666; }
.debug-w-sm { width: var(--mg-debug-w-sm); justify-content: center; background: #f9f9f9; font-size: 10px; color: #666; }
.debug-w-lg { width: var(--mg-debug-w-lg); justify-content: flex-start; background: #f9f9f9; font-size: 10px; color: #666; padding-left: 4px; }
.debug-text { font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.fixed-w-dmg { width: var(--mg-fixed-w-dmg); justify-content: flex-end; font-size: 11px; padding-right: 4px; }
.fixed-w-shield { width: var(--mg-fixed-w-shield); justify-content: center; }
.fixed-w-reduction { width: var(--mg-fixed-w-reduction); justify-content: center; }

.shield-input {
  width: 100%;
  height: 20px;
  padding: 0 4px;
  border: 1px solid #ddd;
  border-radius: 2px;
  font-size: 11px;
  text-align: right;
  background: #fff;
  box-sizing: border-box;
}
.shield-input:focus {
  outline: none;
  border-color: #7c3aed;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}
.filter-popover {
  display: flex;
  flex-direction: column;
  max-height: 400px;
  overflow-y: auto;
  :deep(.el-checkbox-group) {
    display: flex;
    flex-direction: column;
  }
  :deep(.el-checkbox) {
    margin-right: 0;
    width: 100%;
  }
}
.filter-icon { cursor: pointer; color: #ccc; &.active { color: #7c3aed; } }

.physics { color: #f87171; }
.magic { color: #60a5fa; }
.darkness { color: #c084fc; }

.text-aoe { font-weight: 600; }
.text-share { font-weight: 600; }
.text-tb { font-weight: 600; }
.text-warning { color: #ef4444; font-weight: bold; display: flex; align-items: center; gap: 2px; }

.columns-drag-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  border-left: 1px solid #e5e7eb;
}
.col-header {
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 1px 3px 0;
  align-items: center;
  background: linear-gradient(180deg, #fbfcfe 0%, #f5f7fb 100%);
  border-right: 1px solid #e8edf5;
}
.col-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 100%;
}
.col-name {
  font-size: 11px;
  color: var(--mg-col-name);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.col-name-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
  text-align: center;
  cursor: grab;
  user-select: none;
  padding: 2px 6px;
  margin: -2px -4px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    text-decoration-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  &:active { cursor: grabbing; }
}
.col-name-main {
  display: inline-block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-name-trigger.filtered { text-decoration: underline; }
.col-filter-icon {
  cursor: pointer; color: #ccc; font-size: 10px;
  &:hover { color: #7c3aed; }
  &.active { color: #7c3aed; }
}
.skill-filter-list {
  max-height: 360px; overflow-y: auto;
  padding: 0 2px;
}
.column-party-editor {
  margin-bottom: 4px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eceff3;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.column-party-job-select {
  width: 100%;
}
.skill-drag-list {
  display: flex; flex-direction: column; gap: 1px;
}

.skill-filter-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1px 4px; border-radius: 4px;
  cursor: default;
  transition: background-color 0.15s;
}

/* Only apply hover when NOT dragging */
.skill-drag-list:not(.is-dragging) .skill-filter-item:hover {
  background: #f3f4f6;
  .drag-handle { opacity: 1; }
}

.skill-checkbox {
  margin-right: auto;
  height: 20px;
  display: flex;
  align-items: center;

  :deep(.el-checkbox__label) {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    padding-left: 6px;
    line-height: normal;
    height: 100%;
  }
}

.skill-filter-label { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #374151; }
.mini-icon { width: 16px; height: 16px; border-radius: 2px; object-fit: contain; border: 1px solid #e5e7eb; }

.drag-handle {
  display: flex; align-items: center; justify-content: center;
  width: 18px; height: 18px;
  cursor: grab;
  color: #9ca3af;
  opacity: 0.3;
  transition: opacity 0.2s, color 0.15s;

  &:hover { color: #4b5563; background: rgba(0,0,0,0.05); border-radius: 2px; }
  &:active { cursor: grabbing; color: #111827; }
  .el-icon { font-size: 12px; }
}

.skills-row {
  display: flex;
  gap: 2px;
  justify-content: center;
  width: 100%;
  min-height: 22px;
}

.add-column-header {
  width: var(--mg-add-column-header-width);
  justify-content: center;
  border-left: 1px dashed #d8dee7;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}
.add-column-btn {
  width: 20px;
  height: 20px;
  min-width: 20px;
  font-size: 13px;
  color: #4b5563;
  border-radius: 4px;
  border: 1px dashed #cbd5e1;
  &:hover {
    background: #e2e8f0;
    border-color: #94a3b8;
    color: #0f172a;
  }
}

.skill-icon-wrap {
  width: var(--mg-skill-icon-size); height: var(--mg-skill-icon-size); border: 1px solid #eee; border-radius: 2px;
  display: flex; align-items: center; justify-content: center; background: #fff;
  box-sizing: border-box;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
  &:hover {
    border-color: #c7d2fe;
    box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2);
  }
}
.skill-icon { width: 100%; height: 100%; }
.skill-letter { font-size: 9px; color: #999; }

.col-content { gap: 2px; justify-content: center; align-items: center; padding: 0 4px; overflow: visible; }

.cell-check {
  width: var(--mg-skill-cell-size); height: calc(var(--mg-skill-cell-size) - 1px);
  border-left: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  background: #fff; cursor: pointer; position: relative;
  z-index: 1;
  box-sizing: border-box;
  margin-right: -1px;
  margin-bottom: -1px;

  &:hover { border-color: #10b981; z-index: 5; }

  .check-dot {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .check-icon {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .check-letter {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
  }

  &.is-active {
    background: #10b981;
    border-color: #059669;
    z-index: 2;
  }

  &.conn-prev {
    border-top-color: transparent !important;
  }

  &.conn-next {
    border-bottom-color: transparent !important;
  }

  &.is-start.conn-prev {
    border-top-color: #059669 !important;
  }

  &.conflict {
    border-color: #ef4444;
    z-index: 2;
    &.is-active { background: #ef4444; border-color: #b91c1c; }
  }

  &.unavailable {
    background: #9ca3af;
    border-color: #7c838e;
    z-index: 2;
    cursor: not-allowed;
  }

  &.unavailable-constraint {
    background: #e5e7eb;
    border-color: #d1d5db;
    z-index: 2;
    cursor: not-allowed;
  }

  &.is-start {
    .check-dot {
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
    }
  }

  &.is-cooldown {
    background: #9ca3af;
    border-color: #7c838e;
    z-index: 2;
  }

  &.is-pre-cooldown {
    background: #e5e7eb;
    border-color: #d1d5db;
    z-index: 2;
  }
}

.hover-trigger {
  position: absolute;
  inset: 0;
  z-index: 3;
}

.edit-popover {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.edit-field > span {
  width: 4em;
  color: #666;
  flex-shrink: 0;
}

.time-display {
  flex: 1;
  color: #333;
}

.offset-input {
  width: 120px;
}

.text-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.custom-context-menu {
  position: fixed;
  z-index: 2000;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.2);
  padding: 4px;
  min-width: 130px;
  max-height: calc(100vh - 16px);
  border: 1px solid #e5e7eb;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;

  .menu-header {
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 600;
    color: #999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .menu-divider {
    height: 1px;
    background: #f0f0f0;
    margin: 2px 4px;
  }

  .menu-item {
    padding: 6px 10px;
    font-size: 12px;
    color: #333;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 4px;
    transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    .el-icon {
      font-size: 14px;
      color: #666;
      transition: color 0.2s;
    }

    &:hover {
      background: #f5f0ff;
      color: #7c3aed;
      .el-icon {
        color: #7c3aed;
      }
    }

    &.danger {
      color: #dc2626;
      .el-icon {
        color: #dc2626;
      }
      &:hover {
        background: #fef2f2;
        color: #dc2626;
        .el-icon {
          color: #dc2626;
        }
      }
    }

    &.disabled {
      color: #ccc;
      cursor: not-allowed;
      &:hover { background: transparent; }
    }
  }

  .mechanic-inline-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 248px;
    padding: 6px;
  }

  .mechanic-inline-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .inline-label {
    flex-shrink: 0;
    width: 34px;
    font-size: 12px;
    color: #6b7280;
    text-align: right;
  }

  .inline-radio-group {
    flex: 1;
    min-width: 0;
    :deep(.el-radio-button__inner) {
      padding: 4px 9px;
      font-size: 12px;
      box-shadow: none !important;
    }
    :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
      box-shadow: none !important;
    }
    :deep(.el-radio-button + .el-radio-button .el-radio-button__inner) {
      margin-left: -1px;
    }
  }

  .inline-damage-input {
    flex: 1;
    min-width: 0;
  }

  .inline-divider {
    margin: 0;
  }

  .inline-apply-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .inline-apply-btn {
    flex: 1;
  }
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.multiple-label { color: inherit; text-decoration: none; cursor: help; border-bottom: 1px dashed #ccc; }
.popover-list { max-height: 300px; overflow-y: auto; font-size: 11px; padding: 0 4px; }
.popover-item { padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
.cell-popover .popover-item { padding: 3px 0; }

.detail-header {
  font-weight: bold;
  color: #333;
  border-bottom: 2px solid #eee;
  padding-bottom: 4px;
  margin-bottom: 4px;
  display: flex; gap: 8px; align-items: center;
}
.detail-item { display: flex; gap: 8px; align-items: center; }

.detail-target { width: 6em; min-width: 6em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-raw { width: 55px; text-align: right; color: #444; }
.detail-flag { width: 50px; text-align: right; color: #666; font-size: 10px; }

.popover-footer { padding: 4px 0; border-top: 1px solid #ccc; font-weight: bold; margin-top: 4px; text-align: right; }

.font-mono { font-family: monospace; }

.empty-uses { text-align: center; color: #999; padding: 20px; }

.skill-uses-list {
  display: flex;
  flex-direction: column;
  max-height: 400px;
  overflow-y: auto;
}

.skill-uses-header,
.skill-uses-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  width: 100%;
}

.skill-uses-header {
  font-weight: 700;
  color: #333;
  font-size: 13px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
  border-bottom: 2px solid #eee;
}

.skill-uses-item {
  font-size: 13px;
  color: #444;
  &:hover { background: #fcfcfc; }
  &:last-child { border-bottom: none; }
}

.col-time {
  flex: 1;
  padding-left: 15px;
  display: flex;
  align-items: center;
  color: #666;
}

.col-duration,
.col-cooldown {
  width: 75px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.col-source {
  width: 85px;
  display: flex;
  justify-content: center;
  align-items: center;

  span {
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
    min-width: 44px;
    text-align: center;

    &.log {
      background-color: #f0f9eb;
      color: #67c23a;
      border: 1px solid #e1f3d8;
    }
    &.manual {
      background-color: #fdf6ec;
      color: #e6a23c;
      border: 1px solid #faecd8;
    }
  }
}

.col-action {
  width: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

.editable-time {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: #f0f7ff;
    color: #409eff;
    .edit-hint { opacity: 1; }
  }

  .edit-hint {
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s;
  }
}

.skill-uses-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-icon-wrap.clickable {
  cursor: pointer;
  &:hover { opacity: 0.8; }
}

.filter-popover {
  max-height: 480px;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;

  .filter-section {
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 4px;
    }

    .section-header {
      padding: 0 8px;
      height: 24px;
      background-color: #fafafa;
      border-bottom: 1px solid #ebeef5;
      display: flex;
      align-items: center;

      // Left border indicator for visual grouping
      border-left: 4px solid #409eff;

      :deep(.el-checkbox) {
        height: 100%;
        display: flex;
        align-items: center;
      }

      :deep(.el-checkbox__label) {
        font-weight: 600;
        font-size: 12px;
        color: #606266;
      }
    }

    .section-list {
      padding: 2px 8px 2px 20px; // Indent child items
      display: flex;
      flex-direction: column;

      .el-checkbox {
        margin-right: 0;
        height: 24px;
        width: 100%;
        display: flex;
        align-items: center;

        :deep(.el-checkbox__label) {
          font-weight: normal;
          font-size: 12px;
          color: #606266;
        }

        &:hover {
          background-color: #f5f7fa;
          border-radius: 4px;
        }
      }
    }
  }
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  z-index: 2000;
  min-width: 120px;
  padding: 4px 0;

  &-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .menu-item {
    padding: 8px 16px;
    font-size: 13px;
    color: #606266;
    cursor: pointer;
    transition: background-color 0.1s;

    &:hover {
      background-color: #f5f7fa;
      color: #409eff;
    }

    .menu-label {
      line-height: normal;
    }
  }
}

.skill-drag-list.just-finished-drag {
  .skill-filter-item,
  .el-checkbox {
    pointer-events: none;
  }
}

.ghost {
  opacity: 0 !important;
}

.drag {
  opacity: 1 !important;
}

.fallback {
  opacity: 1 !important;
  background: #fff !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  z-index: 9999;
}

.col-ghost {
  opacity: 0.45 !important;
}

.col-drag {
  opacity: 0.95 !important;
  .col-name-trigger {
    border-style: dashed;
  }
}

.col-fallback {
  opacity: 1 !important;
  background: #fff !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  z-index: 9999;
}

:deep(.mg-auto-arrange-choice-dialog .el-message-box__btns .el-button.mg-auto-arrange-choice-btn) {
  background: #fff !important;
  border-color: #d1d5db !important;
  color: #111827 !important;
}

:deep(.mg-auto-arrange-choice-dialog .el-message-box__btns .el-button.mg-auto-arrange-choice-btn:hover) {
  background: #f9fafb !important;
  border-color: #9ca3af !important;
}
</style>
