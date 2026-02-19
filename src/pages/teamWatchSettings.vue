<script setup lang="ts">
import type { TeamWatchActionMetaRaw } from '@/types/teamWatchTypes'
import { Delete, Download, Plus, Rank, RefreshLeft, Search, Upload } from '@element-plus/icons-vue'
import { useDebounceFn, useWindowSize } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VueDraggable } from 'vue-draggable-plus'
import ActionPickerDialog from '@/components/common/ActionPickerDialog.vue'
import SkillEditorDialog from '@/components/common/SkillEditorDialog.vue'
import { getActionChinese, searchActions } from '@/resources/actionChinese'
import { GLOBAL_SKILL_MAX_LEVEL } from '@/resources/globalSkills'
import { DEFAULT_JOB_SORT_ORDER } from '@/resources/jobSortOrder'
import {
  cloneTeamWatchActionMetaMap,
  isTeamWatchLowerTierActionId,
  normalizeTeamWatchActionMetaRaw,
  resolveTeamWatchDynamicValue,
  TEAM_WATCH_EMPTY_ACTIONS,
  TEAM_WATCH_WATCH_ACTIONS_DEFAULT,
} from '@/resources/teamWatchResource'
import { useTeamWatchStore } from '@/store/teamWatchStore'
import { copyToClipboard } from '@/utils/clipboard'
import { compareSame, isCompareSameSourceId, normalizeUpgradeActionId } from '@/utils/compareSaveAction'
import { validateRequiredDynamicInput } from '@/utils/dynamicValueValidation'
import Util from '@/utils/util'
import { getIconSrcByPath, handleImgError, searchActionsByClassJobs } from '@/utils/xivapi'

interface JobRow {
  job: number
  actions: number[]
}

interface ActionSearchResult {
  id: number
  name: string
  iconSrc?: string
  classJobLevel?: number
  recast1000ms?: number
  isRoleAction?: boolean
}

interface PickerTarget {
  job: number
  index: number
}

interface MetaEditorContext {
  actionId: number
  job?: number
  index?: number
  assignAfterConfirm: boolean
  fetchFromApi: boolean
}

interface MetaFormModel {
  actionId: number
  id: string
  name: string
  iconSrc: string
  recast1000ms: string
  duration: string
  maxCharges: string
  classJobLevel: number
}

type SortGroup = 'tank' | 'healer' | 'dps' | 'other'

const store = useTeamWatchStore()
const SEARCH_LIMIT = 200

const sortRule = ref<number[]>([])
const rows = ref<JobRow[]>([])
const actionMetaUser = ref<Record<number, TeamWatchActionMetaRaw>>({})

const pickerVisible = ref(false)
const pickerSearch = ref('')
const pickerResult = ref<ActionSearchResult[]>([])
const pickerPool = ref<ActionSearchResult[]>([])
const pickerLoading = ref(false)
const pickerTarget = ref<PickerTarget | null>(null)
const pickerReturnMetaContext = ref<MetaEditorContext | null>(null)
const { width: viewportWidth } = useWindowSize()

const metaEditorVisible = ref(false)
const metaEditorLoading = ref(false)
const metaEditorContext = ref<MetaEditorContext | null>(null)
const metaEditorErrors = ref<string[]>([])
const metaFieldErrors = reactive({
  id: '',
  recast1000ms: '',
  duration: '',
  maxCharges: '',
})
const metaForm = reactive<MetaFormModel>({
  actionId: 0,
  id: '',
  name: '',
  iconSrc: '',
  recast1000ms: '',
  duration: '',
  maxCharges: '',
  classJobLevel: 1,
})

const filterText = ref('')
const showBaseJobs = ref(false)
const isHydrating = ref(false)
const isCtrlPressed = ref(false)

const rowsByJob = computed(() => {
  const map = new Map<number, JobRow>()
  rows.value.forEach((row) => {
    map.set(row.job, row)
  })
  return map
})

const sortIndexMap = computed(() => {
  const map = new Map<number, number>()
  sortRule.value.forEach((job, index) => {
    map.set(job, index)
  })
  return map
})

const sortedRows = computed(() => {
  const sortMap = sortIndexMap.value
  return [...rows.value].sort((a, b) => {
    const aJob = Util.baseJobEnumConverted(a.job)
    const bJob = Util.baseJobEnumConverted(b.job)
    const aIndex = sortMap.get(aJob) ?? -1
    const bIndex = sortMap.get(bJob) ?? -1
    const aSort = aIndex >= 0 ? aIndex : 999
    const bSort = bIndex >= 0 ? bIndex : 999
    if (aSort === bSort)
      return a.job - b.job
    return aSort - bSort
  })
})

const visibleRows = computed(() => {
  const keyword = filterText.value.trim().toLowerCase()
  return sortedRows.value.filter((row) => {
    const job = Util.jobEnumToJob(row.job)
    if (!Util.isCombatJob(job) || job === 'NONE')
      return false

    // Base jobs are always merged into advanced jobs in settings view.
    if (Util.baseJobEnumConverted(row.job) !== row.job)
      return false
    if (!keyword)
      return true

    if (getJobName(row.job).toLowerCase().includes(keyword))
      return true
    if (String(row.job).includes(keyword))
      return true

    return row.actions.some((actionId) => {
      if (String(actionId).includes(keyword))
        return true
      if (actionId <= 0)
        return false
      return (getActionChinese(actionId) ?? '').toLowerCase().includes(keyword)
    })
  })
})

const isDragSortDisabled = computed(() => !!filterText.value.trim())

const draggableVisibleRows = computed<JobRow[]>({
  get: () => visibleRows.value,
  set: (nextRows) => {
    if (!nextRows.length)
      return
    const nextSortRule = normalizeSortRuleByGroup(
      Array.from(new Set(nextRows.map(row => Util.baseJobEnumConverted(row.job)))),
      sortRule.value,
    )
    if (nextSortRule.length > 0)
      sortRule.value = nextSortRule
  },
})

const pickerTargetLabel = computed(() => {
  const target = pickerTarget.value
  if (!target)
    return ''
  return `${getJobName(target.job)} · 技能位 ${target.index + 1}`
})

const pickerDisabledActionSet = computed(() => {
  const target = pickerTarget.value
  if (!target)
    return new Set<number>()

  const currentRow = rowsByJob.value.get(target.job)
  const currentActionId = currentRow?.actions[target.index] ?? 0
  const disabled = new Set<number>()
  if (!currentRow)
    return disabled
  currentRow.actions.forEach((actionId) => {
    if (actionId > 0 && actionId !== currentActionId)
      disabled.add(actionId)
  })

  return disabled
})

const pickerOrderedResult = computed(() => {
  interface FamilySortState {
    state: number
    recast: number
    representativeId: number
  }

  const getFamilyId = (actionId: number) => {
    const upgraded = normalizeUpgradeActionId(actionId)
    const same = compareSame(upgraded)
    return normalizeUpgradeActionId(same)
  }

  // 组内顺序：下位技能 -> 共享CD来源技能 -> 正常技能（通常是上位技能）
  const getMemberState = (actionId: number) => {
    if (isLowerTierAction(actionId))
      return 0
    if (isCompareSameSourceId(actionId))
      return 1
    return 2
  }

  const familyState = new Map<number, FamilySortState>()

  for (const item of pickerResult.value) {
    const familyId = getFamilyId(item.id)
    const state = getMemberState(item.id)
    const recastRaw = Number(item.recast1000ms ?? 0)
    const recast = Number.isFinite(recastRaw) ? recastRaw : -1
    const prev = familyState.get(familyId)
    if (!prev) {
      familyState.set(familyId, {
        state,
        recast,
        representativeId: item.id,
      })
      continue
    }

    if (state > prev.state || (state === prev.state && (recast > prev.recast || (recast === prev.recast && item.id < prev.representativeId)))) {
      familyState.set(familyId, {
        state,
        recast,
        representativeId: item.id,
      })
    }
  }

  return [...pickerResult.value].sort((a, b) => {
    const aFamilyId = getFamilyId(a.id)
    const bFamilyId = getFamilyId(b.id)

    if (aFamilyId !== bFamilyId) {
      const aFamily = familyState.get(aFamilyId)
      const bFamily = familyState.get(bFamilyId)
      const aRecast = aFamily?.recast ?? -1
      const bRecast = bFamily?.recast ?? -1
      if (aRecast !== bRecast)
        return bRecast - aRecast
      const aRepresentativeId = aFamily?.representativeId ?? aFamilyId
      const bRepresentativeId = bFamily?.representativeId ?? bFamilyId
      return aRepresentativeId - bRepresentativeId
    }

    const aState = getMemberState(a.id)
    const bState = getMemberState(b.id)
    if (aState !== bState)
      return aState - bState

    const aLevel = Number(a.classJobLevel ?? Number.MAX_SAFE_INTEGER)
    const bLevel = Number(b.classJobLevel ?? Number.MAX_SAFE_INTEGER)
    if (aLevel !== bLevel)
      return aLevel - bLevel

    return a.id - b.id
  })
})

const pickerRoleResult = computed(() => pickerOrderedResult.value.filter(item => !!item.isRoleAction))
const pickerJobResult = computed(() => pickerOrderedResult.value.filter(item => !item.isRoleAction))
const pickerCurrentActionId = computed(() => {
  const target = pickerTarget.value
  if (!target)
    return null
  const current = rowsByJob.value.get(target.job)?.actions[target.index] ?? 0
  if (!Number.isFinite(current) || current <= 0)
    return null
  return Math.trunc(current)
})
const pickerJobGridItems = computed(() => {
  return pickerJobResult.value.map((item) => {
    const disableReason = getPickerDisableReason(item.id)
    const disabled = disableReason !== ''
    return {
      id: item.id,
      name: item.name,
      iconSrc: item.iconSrc || getActionMeta(item.id).iconSrc,
      recast1000ms: item.recast1000ms,
      disabled,
      disabledReason: disableReason || undefined,
      attrs: {
        'data-group': 'normal',
        'data-skill-kind': 'job',
        'data-action-id': item.id,
        'data-action-name': item.name,
        'data-class-job-level': item.classJobLevel ?? '',
        'data-recast1000ms': item.recast1000ms ?? '',
        'data-existing': disabled ? '1' : '0',
        'data-disable-reason': disableReason,
        'data-lower-tier': isLowerTierAction(item.id) ? '1' : '0',
      },
    }
  })
})
const pickerRoleGridItems = computed(() => {
  return pickerRoleResult.value.map((item) => {
    const disableReason = getPickerDisableReason(item.id)
    const disabled = disableReason !== ''
    return {
      id: item.id,
      name: item.name,
      iconSrc: item.iconSrc || getActionMeta(item.id).iconSrc,
      recast1000ms: item.recast1000ms,
      disabled,
      disabledReason: disableReason || undefined,
      attrs: {
        'data-group': 'normal',
        'data-skill-kind': 'role',
        'data-action-id': item.id,
        'data-action-name': item.name,
        'data-class-job-level': item.classJobLevel ?? '',
        'data-recast1000ms': item.recast1000ms ?? '',
        'data-existing': disabled ? '1' : '0',
        'data-disable-reason': disableReason,
        'data-lower-tier': isLowerTierAction(item.id) ? '1' : '0',
      },
    }
  })
})

const metaEditorCanReplaceSkill = computed(() => {
  const context = metaEditorContext.value
  return !!context && context.job !== undefined && context.index !== undefined
})

const metaEditorTargetSlotLabel = computed(() => {
  const context = metaEditorContext.value
  if (!context || context.job === undefined || context.index === undefined)
    return ''
  return `${getJobName(context.job)} · 技能位 ${context.index + 1}`
})

const pickerDialogWidth = computed(() => {
  const available = Math.trunc(viewportWidth.value) - 20
  const safeWidth = Math.max(320, available)
  return `${Math.min(980, safeWidth)}px`
})

const metaEditorIconSrc = computed(() => {
  if (metaForm.actionId <= 0)
    return ''
  const local = metaForm.iconSrc.trim()
  if (local)
    return local
  return getActionMeta(metaForm.actionId).iconSrc
})

const metaEditorTitle = computed(() => {
  if (metaForm.actionId <= 0)
    return '未选择技能'
  const localName = metaForm.name.trim()
  if (localName)
    return localName
  return getActionChinese(metaForm.actionId) || getActionMeta(metaForm.actionId).name || `#${metaForm.actionId}`
})

const metaEditorSubtitle = computed(() => {
  if (metaForm.actionId <= 0)
    return ''
  const idLabel = `#${metaForm.actionId}`
  const slotLabel = metaEditorTargetSlotLabel.value
  return slotLabel ? `${idLabel} · ${slotLabel}` : idLabel
})

const dynamicValueTipText = 'DynamicValue支持输入数字或动态表达式，例如 `(lv) => lv>=94 ? 40 : 60`。'

const skillEditorPrimaryAction = computed(() => ({
  show: metaEditorCanReplaceSkill.value,
  disabled: metaEditorLoading.value,
}))

const skillEditorDeleteAction = computed(() => ({
  show: metaEditorCanReplaceSkill.value,
  disabled: metaEditorLoading.value,
  confirmTitle: '将清空当前槽位中的技能，是否继续？',
  confirmButtonText: '清空',
}))

const skillEditorResetAction = computed(() => ({
  show: metaForm.actionId > 0,
  disabled: metaEditorLoading.value,
  confirmTitle: '将按当前技能ID恢复默认参数，是否继续？',
  confirmButtonText: '恢复',
}))

const baseJobsByAdvanced = computed<Record<number, number>>(() => {
  const map: Record<number, number> = {}
  DEFAULT_JOB_SORT_ORDER.forEach((job) => {
    const advanced = Util.baseJobEnumConverted(job)
    if (advanced !== job)
      map[advanced] = job
  })
  return map
})

function getRelatedJobIds(job: number) {
  const related = new Set<number>([job])
  const advanced = Util.baseJobEnumConverted(job)
  if (advanced !== job)
    related.add(advanced)
  const base = baseJobsByAdvanced.value[job]
  if (base)
    related.add(base)
  return [...related]
}

function isLowerTierAction(actionId: number) {
  return isTeamWatchLowerTierActionId(actionId)
}

function getPickerDisableReason(actionId: number) {
  if (isCompareSameSourceId(actionId))
    return '共享CD'
  if (pickerDisabledActionSet.value.has(actionId))
    return '已存在'
  return ''
}

async function loadPickerPool(job: number) {
  pickerLoading.value = true
  try {
    const apiRows = await searchActionsByClassJobs(getRelatedJobIds(job), 500)
    pickerPool.value = apiRows.map(row => ({
      id: row.ID,
      name: row.Name,
      iconSrc: row.Icon ? getIconSrcByPath(row.Icon) : undefined,
      classJobLevel: row.ClassJobLevel,
      recast1000ms: row.Recast1000ms,
      isRoleAction: Number(row.IsRoleAction ?? 0) > 0,
    }))
  }
  catch (error) {
    console.warn('[teamWatchSettings] load job action list failed:', job, error)
    pickerPool.value = []
    ElMessage.warning('职业技能列表加载失败，可手动搜索')
  }
  finally {
    pickerLoading.value = false
  }
}

const debouncedSearch = useDebounceFn(() => {
  const keyword = pickerSearch.value.trim().toLowerCase()
  if (!keyword) {
    pickerResult.value = [...pickerPool.value]
    return
  }

  const local = pickerPool.value.filter((item) => {
    return item.name.toLowerCase().includes(keyword) || String(item.id).includes(keyword)
  })

  if (pickerPool.value.length > 0) {
    pickerResult.value = local
    return
  }

  pickerResult.value = searchActions(keyword, SEARCH_LIMIT)
}, 200)

watch(pickerSearch, () => debouncedSearch())
watch(pickerVisible, (visible) => {
  if (visible)
    return
  pickerTarget.value = null
  pickerReturnMetaContext.value = null
  pickerSearch.value = ''
  pickerResult.value = []
  pickerPool.value = []
  pickerLoading.value = false
})

function normalizeActions(actions: unknown): number[] {
  if (!Array.isArray(actions))
    return [0]

  const normalized = actions
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && v >= 0)
    .map(v => Math.trunc(v))

  return normalized.length > 0 ? normalized : [0]
}

function normalizeLevelNumber(input: unknown): number | null {
  const numeric = Number(input)
  if (Number.isFinite(numeric))
    return Math.max(1, Math.trunc(numeric))
  return null
}

function getJobName(job: number) {
  const full = Util.jobToFullName(Util.jobEnumToJob(job))
  return full.cn || full.en || `Job-${job}`
}

function getJobIconSrc(job: number) {
  const full = Util.jobToFullName(Util.jobEnumToJob(job))
  return `https://souma.diemoe.net/resources/img/cj2/${full.en}.png`
}

function getActionMeta(actionId: number) {
  if (actionId <= 0)
    return store.resolveActionMeta(0, 100)
  const raw = normalizeTeamWatchActionMetaRaw(
    actionId,
    actionMetaUser.value[actionId] ?? store.getActionMetaRaw(actionId),
  )
  return store.resolveActionMeta(actionId, GLOBAL_SKILL_MAX_LEVEL, raw)
}

function reloadFromStore() {
  isHydrating.value = true
  store.loadFromStorage()
  const snapshot = store.getSnapshot()
  sortRule.value = [...snapshot.sortRuleUser]
  const jobs = Array.from(new Set([
    ...DEFAULT_JOB_SORT_ORDER,
    ...Object.keys(snapshot.watchJobsActionsIDUser).map(v => Number(v)),
  ]))
  rows.value = jobs.map(job => ({
    job,
    actions: normalizeActions(snapshot.watchJobsActionsIDUser[job]),
  }))
  actionMetaUser.value = cloneTeamWatchActionMetaMap(snapshot.actionMetaUser)
  isHydrating.value = false
}

const debouncedPersistSettings = useDebounceFn(() => {
  if (isHydrating.value)
    return
  const nextWatchMap = Object.fromEntries(
    rows.value.map(row => [row.job, normalizeActions(row.actions)]),
  ) as Record<number, number[]>
  store.saveSettings(
    [...sortRule.value],
    nextWatchMap,
    cloneTeamWatchActionMetaMap(actionMetaUser.value),
  )
}, 250)

watch([sortRule, rows, actionMetaUser], () => {
  debouncedPersistSettings()
}, { deep: true })

const SORT_GROUP_ORDER: SortGroup[] = ['tank', 'healer', 'dps', 'other']

function getSortGroup(jobEnum: number): SortGroup {
  const job = Util.jobEnumToJob(jobEnum)
  if (Util.isTankJob(job))
    return 'tank'
  if (Util.isHealerJob(job))
    return 'healer'
  if (Util.isDpsJob(job))
    return 'dps'
  return 'other'
}

function normalizeSortRuleByGroup(nextOrder: number[], previousOrder: number[]) {
  const nextUnique = Array.from(new Set(nextOrder))
  const previousUnique = Array.from(new Set(previousOrder))
  const all = Array.from(new Set([...nextUnique, ...previousUnique]))

  const grouped: Record<SortGroup, number[]> = {
    tank: [],
    healer: [],
    dps: [],
    other: [],
  }

  SORT_GROUP_ORDER.forEach((group) => {
    const nextInGroup = nextUnique.filter(job => getSortGroup(job) === group)
    const prevInGroup = previousUnique.filter(job => getSortGroup(job) === group && !nextInGroup.includes(job))
    const unknownInGroup = all.filter(job => getSortGroup(job) === group && !nextInGroup.includes(job) && !prevInGroup.includes(job))
    grouped[group] = [...nextInGroup, ...prevInGroup, ...unknownInGroup]
  })

  return SORT_GROUP_ORDER.flatMap(group => grouped[group])
}

function onSortMove(event: { dragged?: HTMLElement, related?: HTMLElement }) {
  const draggedGroup = event.dragged?.dataset?.sortGroup
  const relatedGroup = event.related?.dataset?.sortGroup

  // Disallow dropping to blank area or any target without a known group.
  if (!draggedGroup || !relatedGroup)
    return false

  return draggedGroup === relatedGroup
}

function getSkillDragGroup(job: number) {
  return `team-watch-skill-${job}`
}

async function appendActionAndOpen(job: number) {
  const row = rowsByJob.value.get(job)
  if (!row)
    return
  row.actions.push(0)
  const index = row.actions.length - 1
  await openPicker(job, index)
}

async function onSlotCardClick(job: number, index: number, actionId: number) {
  if (actionId > 0) {
    await openMetaEditor({
      actionId,
      job,
      index,
      assignAfterConfirm: false,
      fetchFromApi: false,
    })
    return
  }
  await openPicker(job, index)
}

function resetJobActions(job: number) {
  const row = rowsByJob.value.get(job)
  if (!row)
    return
  row.actions = [...(TEAM_WATCH_WATCH_ACTIONS_DEFAULT[job] ?? TEAM_WATCH_EMPTY_ACTIONS)]
}

function clearJobActions(job: number) {
  const row = rowsByJob.value.get(job)
  if (!row)
    return
  row.actions = [0]
}

async function openPicker(job: number, index: number, returnContext: MetaEditorContext | null = null) {
  pickerTarget.value = { job, index }
  pickerReturnMetaContext.value = returnContext
  pickerVisible.value = true
  pickerSearch.value = ''
  pickerPool.value = []
  pickerResult.value = []
  await loadPickerPool(job)
  pickerResult.value = [...pickerPool.value]
}

function fillMetaForm(actionId: number, raw: TeamWatchActionMetaRaw) {
  metaForm.actionId = actionId
  metaForm.id = String(raw.id)
  metaForm.name = raw.name
  metaForm.iconSrc = raw.iconSrc
  metaForm.recast1000ms = String(raw.recast1000ms)
  metaForm.duration = String(raw.duration)
  metaForm.maxCharges = String(raw.maxCharges)
  metaForm.classJobLevel = normalizeLevelNumber(raw.classJobLevel) ?? 1
  metaEditorErrors.value = []
  metaFieldErrors.id = ''
  metaFieldErrors.recast1000ms = ''
  metaFieldErrors.duration = ''
  metaFieldErrors.maxCharges = ''
}

async function openMetaEditor(context: MetaEditorContext) {
  if (context.actionId <= 0)
    return

  metaEditorContext.value = context
  metaEditorLoading.value = true
  metaEditorVisible.value = true
  metaEditorErrors.value = []

  try {
    let source = normalizeTeamWatchActionMetaRaw(
      context.actionId,
      actionMetaUser.value[context.actionId] ?? store.getActionMetaRaw(context.actionId),
    )
    if (context.fetchFromApi) {
      source = await store.fetchActionMetaDraft(context.actionId)
      if (actionMetaUser.value[context.actionId]) {
        source = normalizeTeamWatchActionMetaRaw(context.actionId, actionMetaUser.value[context.actionId]!)
      }
    }
    fillMetaForm(context.actionId, source)
  }
  finally {
    metaEditorLoading.value = false
    applyMetaFormRealtime()
  }
}

async function pickAction(actionId: number) {
  const target = pickerTarget.value
  if (!target)
    return
  pickerVisible.value = false
  await openMetaEditor({
    actionId,
    job: target.job,
    index: target.index,
    assignAfterConfirm: true,
    fetchFromApi: true,
  })
}

function validateMetaForm() {
  const errors: string[] = []
  const idCheck = validateRequiredDynamicInput(metaForm.id, '技能 ID')
  metaFieldErrors.id = idCheck.message
  let resolvedSkillId = 0
  if (idCheck.message) {
    errors.push(idCheck.message)
  }
  else if (idCheck.parsed !== null) {
    const resolved = resolveTeamWatchDynamicValue(idCheck.parsed, GLOBAL_SKILL_MAX_LEVEL, 0)
    if (!Number.isFinite(resolved) || resolved <= 0) {
      metaFieldErrors.id = `技能 ID 在 ${GLOBAL_SKILL_MAX_LEVEL} 级解析后必须大于 0`
      errors.push(metaFieldErrors.id)
    }
    else {
      resolvedSkillId = Math.trunc(resolved)
    }
  }

  const recastCheck = validateRequiredDynamicInput(metaForm.recast1000ms, '冷却时间')
  metaFieldErrors.recast1000ms = recastCheck.message
  if (recastCheck.message)
    errors.push(recastCheck.message)

  const durationCheck = validateRequiredDynamicInput(metaForm.duration, '持续时间')
  metaFieldErrors.duration = durationCheck.message
  if (durationCheck.message)
    errors.push(durationCheck.message)

  const maxChargesCheck = validateRequiredDynamicInput(metaForm.maxCharges, '最大层数')
  metaFieldErrors.maxCharges = maxChargesCheck.message
  if (maxChargesCheck.message)
    errors.push(maxChargesCheck.message)

  const classJobLevel = normalizeLevelNumber(metaForm.classJobLevel)
  if (classJobLevel === null) {
    errors.push('等级不能为空')
  }

  metaEditorErrors.value = errors
  if (errors.length > 0)
    return null

  const name = metaForm.name.trim() || getActionChinese(metaForm.actionId) || `技能 #${metaForm.actionId}`
  const currentActionCategory = Number(
    actionMetaUser.value[metaForm.actionId]?.actionCategory
      ?? store.getActionMetaRaw(metaForm.actionId, false).actionCategory
      ?? 0,
  )
  const normalizedActionCategory = Number.isFinite(currentActionCategory) && currentActionCategory > 0
    ? Math.trunc(currentActionCategory)
    : 0

  return normalizeTeamWatchActionMetaRaw(metaForm.actionId, {
    id: resolvedSkillId,
    name,
    iconSrc: metaForm.iconSrc.trim(),
    actionCategory: normalizedActionCategory,
    recast1000ms: recastCheck.parsed!,
    duration: durationCheck.parsed!,
    maxCharges: maxChargesCheck.parsed!,
    classJobLevel: classJobLevel!,
  } satisfies TeamWatchActionMetaRaw)
}

function applyMetaFormRealtime() {
  if (!metaEditorVisible.value)
    return
  if (metaEditorLoading.value)
    return
  const normalized = validateMetaForm()
  if (!normalized)
    return

  actionMetaUser.value[metaForm.actionId] = normalized

  const context = metaEditorContext.value
  if (context?.assignAfterConfirm && context.job !== undefined && context.index !== undefined) {
    const row = rowsByJob.value.get(context.job)
    if (row && context.index >= 0 && context.index < row.actions.length)
      row.actions[context.index] = context.actionId
  }
}

watch(
  () => [
    metaEditorVisible.value,
    metaForm.id,
    metaForm.name,
    metaForm.iconSrc,
    metaForm.recast1000ms,
    metaForm.duration,
    metaForm.maxCharges,
    metaForm.classJobLevel,
  ],
  () => {
    applyMetaFormRealtime()
  },
)

async function openPickerFromMetaEditor() {
  const context = metaEditorContext.value
  if (!context || context.job === undefined || context.index === undefined)
    return
  metaEditorVisible.value = false
  await openPicker(context.job, context.index, {
    actionId: context.actionId,
    job: context.job,
    index: context.index,
    assignAfterConfirm: false,
    fetchFromApi: false,
  })
}

async function returnToMetaEditorFromPicker() {
  const context = pickerReturnMetaContext.value
  if (!context)
    return
  await openMetaEditor({
    actionId: context.actionId,
    job: context.job,
    index: context.index,
    assignAfterConfirm: false,
    fetchFromApi: false,
  })
}

function handlePickerBack() {
  if (pickerReturnMetaContext.value)
    void returnToMetaEditorFromPicker()
}

function clearCurrentSlotSkill() {
  const context = metaEditorContext.value
  if (!context || context.job === undefined || context.index === undefined)
    return
  const row = rowsByJob.value.get(context.job)
  if (!row || context.index < 0 || context.index >= row.actions.length)
    return
  row.actions[context.index] = 0
  metaEditorVisible.value = false
  ElMessage.success('已清空当前技能槽位')
}

async function resetMetaFormToInitial() {
  const actionId = metaForm.actionId
  if (actionId <= 0)
    return
  metaEditorLoading.value = true
  try {
    const initial = await store.fetchActionMetaDraft(actionId, true)
    fillMetaForm(actionId, normalizeTeamWatchActionMetaRaw(actionId, initial))
    applyMetaFormRealtime()
    ElMessage.success('已恢复默认参数')
  }
  finally {
    metaEditorLoading.value = false
  }
}

function removeActionSlot(job: number, index: number) {
  const row = rowsByJob.value.get(job)
  if (!row || index < 0 || index >= row.actions.length)
    return

  const removedActionId = row.actions[index] ?? 0
  row.actions.splice(index, 1)
  if (row.actions.length === 0)
    row.actions.push(0)

  ElMessage.success(removedActionId > 0 ? '已删除技能槽位' : '已删除空白槽位')
}

function canShowSlotRemoveAnchor(actionId: number, slotCount: number) {
  if (slotCount <= 1)
    return false
  return actionId <= 0 || isCtrlPressed.value
}

function handleGlobalKeyState(event: KeyboardEvent) {
  isCtrlPressed.value = event.ctrlKey
}

function resetGlobalKeyState() {
  isCtrlPressed.value = false
}

function handleVisibilityChange() {
  if (document.hidden)
    resetGlobalKeyState()
}

async function exportSettings() {
  try {
    await copyToClipboard(store.exportSettings())
    ElMessage.success('导出文本已复制')
  }
  catch {
    ElMessage.error('复制失败')
  }
}

async function importSettings() {
  try {
    const promptResult = await ElMessageBox.prompt(
      '粘贴导入字符串（支持旧版 TeamWatch4 导出格式）',
      '导入 TeamWatch 设置',
      {
        inputType: 'textarea',
        confirmButtonText: '导入',
        cancelButtonText: '取消',
      },
    )
    const value = typeof promptResult === 'string'
      ? promptResult
      : (promptResult as { value?: string }).value
    if (!value)
      return
    store.importSettings(value)
    reloadFromStore()
    ElMessage.success('导入成功')
  }
  catch (error) {
    if (error !== 'cancel' && error !== 'close')
      ElMessage.error('导入失败，请检查文本格式')
  }
}

async function resetSettings() {
  store.resetSettings()
  reloadFromStore()
  ElMessage.success('已恢复默认设置')
}

onMounted(() => {
  reloadFromStore()
  window.addEventListener('keydown', handleGlobalKeyState)
  window.addEventListener('keyup', handleGlobalKeyState)
  window.addEventListener('blur', resetGlobalKeyState)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeyState)
  window.removeEventListener('keyup', handleGlobalKeyState)
  window.removeEventListener('blur', resetGlobalKeyState)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="settings-page" :class="{ 'ctrl-delete-mode': isCtrlPressed }">
    <header class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="filterText"
          class="filter-input"
          :prefix-icon="Search"
          clearable
          placeholder="筛选职业名 / 职业ID / 技能名 / 技能ID"
        />
        <el-switch
          v-model="showBaseJobs"
          active-text="显示基础职业"
          inactive-text="隐藏基础职业"
          size="small"
        />
      </div>
      <div class="toolbar-right">
        <el-button size="small" :icon="Download" @click="exportSettings">
          导出
        </el-button>
        <el-button size="small" :icon="Upload" @click="importSettings">
          导入
        </el-button>
        <el-popconfirm
          title="将清除 TeamWatch 当前自定义配置并恢复默认值，是否继续？"
          confirm-button-text="恢复"
          cancel-button-text="取消"
          @confirm="resetSettings"
        >
          <template #reference>
            <el-button size="small" type="danger" :icon="RefreshLeft">
              恢复默认
            </el-button>
          </template>
        </el-popconfirm>
        <CommonThemeToggle storage-key="team-watch-settings" />
        <div class="lang-switch-wrap">
          <CommonLanguageSwitcher :teleported="false" />
        </div>
      </div>
    </header>

    <main class="job-list">
      <section v-if="!visibleRows.length" class="empty-panel">
        <p>当前没有匹配结果，尝试修改筛选条件。</p>
      </section>

      <VueDraggable
        v-model="draggableVisibleRows"
        class="job-list-draggable"
        handle=".job-drag-handle"
        :animation="150"
        :force-fallback="true"
        :fallback-tolerance="16"
        ghost-class="job-drag-ghost"
        drag-class="job-drag-active"
        fallback-class="job-drag-fallback"
        :disabled="isDragSortDisabled"
        :on-move="onSortMove"
      >
        <section
          v-for="row in draggableVisibleRows"
          :key="row.job"
          class="job-block"
          :class="{ 'is-base': Util.baseJobEnumConverted(row.job) !== row.job }"
          :data-sort-group="getSortGroup(Util.baseJobEnumConverted(row.job))"
        >
          <header class="job-head">
            <div class="job-title">
              <img
                :src="getJobIconSrc(row.job)"
                :alt="getJobName(row.job)"
                class="job-title-icon"
                @error="handleImgError"
              >
              <strong>{{ getJobName(row.job) }}</strong>
            </div>

            <div class="skills-inline" @click.stop>
              <div class="skills-stack">
                <div class="skills-line">
                  <div class="slot-grid">
                    <VueDraggable
                      v-model="row.actions"
                      class="slot-grid-draggable"
                      :group="getSkillDragGroup(row.job)"
                      :animation="120"
                      :force-fallback="true"
                      :fallback-tolerance="16"
                      ghost-class="job-drag-ghost"
                      drag-class="job-drag-active"
                      fallback-class="job-drag-fallback"
                    >
                      <article
                        v-for="(actionId, index) in row.actions"
                        :key="`${row.job}-${index}`"
                        class="slot-cell"
                      >
                        <button
                          type="button"
                          class="slot-card"
                          :class="{ empty: actionId <= 0 }"
                          @click="onSlotCardClick(Number(row.job), Number(index), Number(actionId))"
                        >
                          <img
                            v-if="actionId > 0 && getActionMeta(actionId).iconSrc"
                            :src="getActionMeta(actionId).iconSrc"
                            :alt="getActionMeta(actionId).name"
                            class="slot-icon"
                          >
                          <div v-else class="slot-placeholder">
                            无
                          </div>
                          <div class="slot-title">
                            {{ actionId > 0 ? getActionMeta(actionId).name : '未设置' }}
                          </div>
                        </button>
                        <div v-if="canShowSlotRemoveAnchor(actionId, row.actions.length)" class="slot-remove-anchor" @click.stop>
                          <el-button
                            class="slot-remove-btn"
                            circle
                            plain
                            size="small"
                            :icon="Delete"
                            @click.stop="removeActionSlot(Number(row.job), Number(index))"
                          />
                        </div>
                      </article>
                    </VueDraggable>

                    <div class="slot-add-wrap">
                      <el-button size="small" type="primary" plain :icon="Plus" @click="appendActionAndOpen(row.job)" />
                    </div>
                  </div>
                </div>

                <div
                  v-if="showBaseJobs && !!rowsByJob.get(baseJobsByAdvanced[row.job] ?? -1)"
                  class="skills-line merged-base-line"
                >
                  <span class="base-floating-label">{{ getJobName(baseJobsByAdvanced[row.job] ?? 0) }}</span>
                  <div class="slot-grid">
                    <VueDraggable
                      v-model="rowsByJob.get(baseJobsByAdvanced[row.job] ?? -1)!.actions"
                      class="slot-grid-draggable"
                      :group="getSkillDragGroup(baseJobsByAdvanced[row.job] ?? 0)"
                      :animation="120"
                      :force-fallback="true"
                      :fallback-tolerance="16"
                      ghost-class="job-drag-ghost"
                      drag-class="job-drag-active"
                      fallback-class="job-drag-fallback"
                    >
                      <article
                        v-for="(actionId, index) in (rowsByJob.get(baseJobsByAdvanced[row.job] ?? -1)?.actions ?? [])"
                        :key="`base-${row.job}-${index}`"
                        class="slot-cell is-base-slot"
                      >
                        <button
                          type="button"
                          class="slot-card"
                          :class="{ empty: actionId <= 0 }"
                          @click="onSlotCardClick(baseJobsByAdvanced[row.job] ?? 0, Number(index), Number(actionId))"
                        >
                          <img
                            v-if="actionId > 0 && getActionMeta(actionId).iconSrc"
                            :src="getActionMeta(actionId).iconSrc"
                            :alt="getActionMeta(actionId).name"
                            class="slot-icon"
                          >
                          <div v-else class="slot-placeholder">
                            无
                          </div>
                          <div class="slot-title">
                            {{ actionId > 0 ? getActionMeta(actionId).name : '未设置' }}
                          </div>
                        </button>
                        <div v-if="canShowSlotRemoveAnchor(actionId, rowsByJob.get(baseJobsByAdvanced[row.job] ?? -1)?.actions.length ?? 0)" class="slot-remove-anchor" @click.stop>
                          <el-button
                            class="slot-remove-btn"
                            circle
                            plain
                            size="small"
                            :icon="Delete"
                            @click.stop="removeActionSlot(baseJobsByAdvanced[row.job] ?? 0, Number(index))"
                          />
                        </div>
                      </article>
                    </VueDraggable>

                    <div class="slot-add-wrap is-base-slot">
                      <el-button size="small" type="primary" plain :icon="Plus" @click="appendActionAndOpen(baseJobsByAdvanced[row.job] ?? 0)" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="job-actions"
              :class="{ 'has-base-actions': showBaseJobs && !!rowsByJob.get(baseJobsByAdvanced[row.job] ?? -1) }"
              @click.stop
            >
              <div class="job-actions-line">
                <div class="job-action-cell col-1-2">
                  <button
                    type="button"
                    class="job-drag-handle"
                    :title="isDragSortDisabled ? '筛选时不可拖拽排序' : '拖拽排序'"
                    :disabled="isDragSortDisabled"
                  >
                    <el-icon><Rank /></el-icon>
                    <span>拖拽</span>
                  </button>
                </div>
                <div class="job-action-cell col-3">
                  <el-popconfirm
                    title="将该职业技能槽位恢复为默认，是否继续？"
                    confirm-button-text="恢复"
                    cancel-button-text="取消"
                    @confirm="resetJobActions(row.job)"
                  >
                    <template #reference>
                      <el-button size="small" text class="job-action-text">
                        默认
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
                <div class="job-action-cell col-4">
                  <el-popconfirm
                    title="将清空该职业所有技能槽位，是否继续？"
                    confirm-button-text="清空"
                    cancel-button-text="取消"
                    @confirm="clearJobActions(row.job)"
                  >
                    <template #reference>
                      <el-button size="small" text class="job-action-text">
                        清空
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>

              <div v-if="showBaseJobs && !!rowsByJob.get(baseJobsByAdvanced[row.job] ?? -1)" class="job-actions-line">
                <span class="job-actions-base-label col-1-2">基础</span>
                <div class="job-action-cell col-3">
                  <el-popconfirm
                    title="将基础职业技能槽位恢复为默认，是否继续？"
                    confirm-button-text="恢复"
                    cancel-button-text="取消"
                    @confirm="resetJobActions(baseJobsByAdvanced[row.job] ?? 0)"
                  >
                    <template #reference>
                      <el-button size="small" text class="job-action-text">
                        默认
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
                <div class="job-action-cell col-4">
                  <el-popconfirm
                    title="将清空基础职业所有技能槽位，是否继续？"
                    confirm-button-text="清空"
                    cancel-button-text="取消"
                    @confirm="clearJobActions(baseJobsByAdvanced[row.job] ?? 0)"
                  >
                    <template #reference>
                      <el-button size="small" text class="job-action-text">
                        清空
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>
            </div>
          </header>
        </section>
      </VueDraggable>
    </main>

    <ActionPickerDialog
      v-model:visible="pickerVisible"
      v-model:search="pickerSearch"
      title="选择技能"
      :width="pickerDialogWidth"
      :lock-scroll="false"
      :loading="pickerLoading"
      :job-items="pickerJobGridItems"
      :role-items="pickerRoleGridItems"
      :current-action-id="pickerCurrentActionId"
      :target-label="pickerTarget ? `正在编辑：${pickerTargetLabel}` : ''"
      empty-text="当前没有匹配技能"
      :search-disabled="pickerLoading"
      :global-disabled="pickerLoading"
      :back-disabled="pickerLoading"
      @pick="pickAction($event.id)"
      @back="handlePickerBack"
    />

    <SkillEditorDialog
      v-model="metaEditorVisible"
      title="技能编辑"
      :teleported="false"
      destroy-on-close
      :lock-scroll="false"
      :loading="metaEditorLoading"
      loading-text="正在加载技能属性..."
      :tip="dynamicValueTipText"
      :primary-action="skillEditorPrimaryAction"
      :delete-action="skillEditorDeleteAction"
      :reset-action="skillEditorResetAction"
      @primary-action="openPickerFromMetaEditor"
      @delete-action="clearCurrentSlotSkill"
      @reset-action="resetMetaFormToInitial"
      @icon-error="handleImgError"
    >
      <template #summary>
        <img
          v-if="metaEditorIconSrc"
          :src="metaEditorIconSrc"
          :alt="metaEditorTitle"
          class="editor-icon"
          @error="handleImgError"
        >
        <div v-else class="editor-icon editor-icon-empty">
          无图标
        </div>
        <div class="editor-summary">
          <div class="editor-name">
            {{ metaEditorTitle }}
          </div>
          <div v-if="metaEditorSubtitle" class="editor-sub">
            {{ metaEditorSubtitle }}
          </div>
        </div>
      </template>

        <template #fields>
          <template v-if="metaForm.actionId > 0">
            <div class="editor-field">
              <label>习得等级</label>
              <el-input-number
              v-model="metaForm.classJobLevel"
              class="number-input-full"
              :min="1"
              :step="1"
              step-strictly
              :controls="false"
            />
          </div>
          <div class="editor-field">
            <label>最大层数（DynamicValue）</label>
            <el-input v-model="metaForm.maxCharges" placeholder="例如 1 或 (lv)=>lv>=84?2:1" />
            <div v-if="metaFieldErrors.maxCharges" class="input-error-tip">
              {{ metaFieldErrors.maxCharges }}
            </div>
          </div>
          <div class="editor-field span-2">
            <label>图标URL</label>
            <el-input v-model="metaForm.iconSrc" placeholder="可留空，留空时使用默认图标" />
          </div>
          <div class="editor-field">
            <label>冷却时间（DynamicValue）</label>
            <el-input v-model="metaForm.recast1000ms" placeholder="例如 90（即 90s）" />
            <div v-if="metaFieldErrors.recast1000ms" class="input-error-tip">
              {{ metaFieldErrors.recast1000ms }}
            </div>
          </div>
          <div class="editor-field">
            <label>持续时间（DynamicValue）</label>
            <el-input v-model="metaForm.duration" placeholder="例如 15 或 (lv)=>lv>=88?20:15" />
            <div v-if="metaFieldErrors.duration" class="input-error-tip">
              {{ metaFieldErrors.duration }}
            </div>
          </div>
        </template>
      </template>
    </SkillEditorDialog>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  --bg: var(--el-bg-color-page);
  --panel: var(--el-bg-color-overlay);
  --panel-soft: var(--el-fill-color-light);
  --line: var(--el-border-color);
  --line-soft: var(--el-border-color-lighter);
  --text: var(--el-text-color-primary);
  --muted: var(--el-text-color-secondary);
  height: 100vh;
  min-height: 0;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-sizing: border-box;
  color: var(--text);
  background: var(--bg);
  font-family: 'Bahnschrift', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 3px;
  padding: 3px 5px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  overflow: hidden;
  min-height: 34px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 1 1 auto;
  min-width: 0;
}

.filter-input {
  width: min(320px, 48vw);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: nowrap;
  margin-left: auto;
  justify-content: flex-end;
  white-space: nowrap;
}

.toolbar-left :deep(.el-switch__label) {
  white-space: nowrap;
}

.toolbar-right > * {
  flex: 0 0 auto;
}

.lang-switch-wrap {
  min-width: 128px;
}

.lang-switch-wrap :deep(.language-select) {
  width: 92px;
}

.job-list {
  margin-top: 0;
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  padding: 2px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.job-list::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

.job-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
}

.job-list::-webkit-scrollbar-thumb {
  background: rgba(180, 188, 204, 0.65);
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.job-list::-webkit-scrollbar-thumb:hover {
  background: rgba(210, 218, 232, 0.8);
}

.skills-inline {
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 188, 204, 0.65) rgba(255, 255, 255, 0.06);
}

.skills-inline::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.skills-inline::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
}

.skills-inline::-webkit-scrollbar-thumb {
  background: rgba(180, 188, 204, 0.6);
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.18);
}

.skills-inline::-webkit-scrollbar-thumb:hover {
  background: rgba(210, 218, 232, 0.78);
}

.job-list-draggable {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.empty-panel {
  padding: 16px 12px;
  text-align: center;
  border: 1px dashed var(--line);
  border-radius: 6px;
  color: var(--muted);
  background: var(--panel-soft);
}

.job-block {
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--panel);
  overflow: hidden;
}

.job-drag-ghost {
  opacity: 0 !important;
}

.job-drag-active,
.job-drag-fallback {
  opacity: 1 !important;
}

.job-block.is-base {
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}

.job-head {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 152px;
  align-items: center;
  gap: 2px;
  padding: 2px 3px;
}

.job-title {
  min-width: 88px;
  display: flex;
  align-items: center;
  gap: 3px;
  overflow: hidden;
  white-space: nowrap;

  strong {
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.job-title-icon {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  flex: 0 0 auto;
}

.job-actions {
  display: grid;
  grid-template-rows: 46px;
  row-gap: 1px;
  align-content: start;
  justify-items: end;
}

.job-actions.has-base-actions {
  grid-template-rows: 46px 46px;
}

.job-actions-line {
  display: grid;
  grid-template-columns: 22px 22px 40px 40px;
  align-items: center;
  align-content: center;
  justify-content: end;
  gap: 2px;
  height: 46px;
}

.job-action-cell {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-1 { grid-column: 1; }
.col-2 { grid-column: 2; }
.col-3 { grid-column: 3; }
.col-4 { grid-column: 4; }
.col-1-2 { grid-column: 1 / span 2; }

.job-actions :deep(.el-button) {
  flex: 0 0 auto;
  --el-button-size: 18px;
}

.job-actions :deep(.job-action-text) {
  width: 100%;
  padding-inline: 0;
}

.job-actions-base-label {
  display: inline-block;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  transform: scale(0.78);
  transform-origin: center;
}

.job-drag-handle {
  width: 100%;
  height: 24px;
  border: 1px dashed var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  line-height: 1.1;
  white-space: nowrap;
  padding-inline: 6px;
  min-width: 40px;
  transform: scale(0.88);
  transform-origin: center;
  cursor: grab;
}

.job-drag-handle:active {
  cursor: grabbing;
}

.job-drag-handle:hover {
  border-color: var(--line-soft);
  color: var(--text);
}

.job-drag-handle:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.skills-inline {
  min-width: 0;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0;
}

.skills-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skills-line {
  display: block;
}

.merged-base-line {
  position: relative;
}

.base-floating-label {
  position: absolute;
  left: 2px;
  bottom: 2px;
  z-index: 2;
  font-size: 12px;
  line-height: 1;
  color: var(--muted);
  opacity: 0.9;
  pointer-events: none;
  transform: scale(0.76);
  transform-origin: left bottom;
}

.slot-grid {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  width: max-content;
}

.slot-grid-draggable {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
}

.slot-cell {
  position: relative;
  width: 66px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: var(--panel-soft);
  padding: 0;
  height: 44px;
  min-height: 44px;
  box-sizing: border-box;
  overflow: hidden;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.slot-cell.is-base-slot {
  border-style: dashed;
}

.slot-card {
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
  border-radius: 0;
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  padding: 3px 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  box-sizing: border-box;
}

.slot-cell:hover,
.slot-cell:focus-within {
  border-color: var(--el-color-primary-light-3);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5);
}

.slot-card:hover {
  background: var(--el-fill-color);
}

.slot-card.empty {
  color: var(--muted);
}

.slot-remove-anchor {
  position: absolute;
  right: 1px;
  top: 1px;
  z-index: 3;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.slot-cell:hover .slot-remove-anchor,
.slot-cell:focus-within .slot-remove-anchor {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.settings-page.ctrl-delete-mode .slot-remove-anchor {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.slot-remove-btn {
  padding: 0;
  --el-button-size: 14px;
  border-color: var(--line-soft);
  color: var(--muted);
  background: var(--panel);
}

.slot-remove-btn:hover {
  border-color: var(--line);
  color: var(--text);
  background: var(--panel-soft);
}

.slot-title {
  width: 100%;
  font-size: 12px;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform: scale(0.8);
  transform-origin: center center;
  z-index: 1;
}

.slot-icon,
.slot-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  display: grid;
  place-items: center;
}

.slot-icon {
  object-fit: cover;
}

.slot-placeholder {
  border: 1px dashed var(--line);
  color: var(--muted);
  font-size: 12px;
  transform: scale(0.8);
  transform-origin: center;
}

.slot-add-wrap {
  width: 66px;
  border: 1px dashed var(--line);
  border-radius: 2px;
  height: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  background: var(--panel-soft);
}

.slot-add-wrap.is-base-slot {
  border-style: dotted;
}

.slot-add-wrap :deep(.el-button) {
  --el-button-size: 18px;
  padding: 0 4px;
}
</style>
